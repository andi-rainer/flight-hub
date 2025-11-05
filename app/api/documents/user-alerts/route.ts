import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addDays } from 'date-fns'

/**
 * Get count of user's document alerts (expiring soon or missing required documents)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || user.id

    // Check if requesting user is a board member
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const isBoardMember = profile?.role?.includes('board') ?? false

    // Get user's function IDs
    const { data: userFunctionsData } = await supabase
      .from('user_functions')
      .select('function_id')
      .eq('user_id', userId)

    const userFunctionIds = userFunctionsData?.map(uf => uf.function_id) || []

    // Get all mandatory document types required for user's functions
    const { data: requiredDocTypes } = await supabase
      .from('document_types')
      .select('id, name, mandatory, required_for_functions')

    const mandatoryForUser = requiredDocTypes?.filter(docType => {
      if (!docType.mandatory) return false
      if (!docType.required_for_functions || docType.required_for_functions.length === 0) return false
      // required_for_functions stores function IDs (UUIDs)
      return docType.required_for_functions.some((reqFuncId: string) =>
        userFunctionIds.includes(reqFuncId)
      )
    }) || []

    // Get user's documents
    const { data: userDocuments } = await supabase
      .from('documents')
      .select('document_type_id, expiry_date, approved')
      .eq('user_id', userId)

    let alertCount = 0

    // Check for missing documents
    // Count ALL uploaded documents (not just approved), matching the member list logic
    const uploadedTypeIds = (userDocuments || [])
      .map(doc => doc.document_type_id)
      .filter(Boolean)

    const missingDocuments = mandatoryForUser.filter(docType =>
      !uploadedTypeIds.includes(docType.id)
    )

    alertCount += missingDocuments.length

    // Check for expiring documents (within 30 days)
    const now = new Date()
    const thirtyDaysFromNow = addDays(now, 30)

    const expiringDocuments = (userDocuments || []).filter(doc => {
      if (!doc.expiry_date || !doc.approved) return false
      const expiryDate = new Date(doc.expiry_date)
      return expiryDate >= now && expiryDate <= thirtyDaysFromNow
    })

    alertCount += expiringDocuments.length

    // Check for expired documents
    const expiredDocuments = (userDocuments || []).filter(doc => {
      if (!doc.expiry_date || !doc.approved) return false
      const expiryDate = new Date(doc.expiry_date)
      return expiryDate < now
    })

    alertCount += expiredDocuments.length

    // Check for unapproved documents (documents waiting for approval)
    // Only count this for board members - regular users don't need to be alerted about pending approvals
    const unapprovedDocuments = (userDocuments || []).filter(doc => !doc.approved)
    const unapprovedCount = isBoardMember ? unapprovedDocuments.length : 0
    alertCount += unapprovedCount

    return NextResponse.json({
      count: alertCount,
      details: {
        missing: missingDocuments.length,
        expiring: expiringDocuments.length,
        expired: expiredDocuments.length,
        unapproved: unapprovedCount
      }
    })
  } catch (error) {
    console.error('Error in GET /api/documents/user-alerts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
