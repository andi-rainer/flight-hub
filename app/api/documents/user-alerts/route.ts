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

    // Get user's functions
    const { data: userProfile } = await supabase
      .from('users')
      .select('functions')
      .eq('id', userId)
      .single()

    const userFunctions = userProfile?.functions || []

    // Get all mandatory document types required for user's functions
    const { data: requiredDocTypes } = await supabase
      .from('document_types')
      .select('id, name, mandatory, required_for_functions')

    const mandatoryForUser = requiredDocTypes?.filter(docType => {
      if (!docType.mandatory) return false
      if (!docType.required_for_functions || docType.required_for_functions.length === 0) return false
      return docType.required_for_functions.some(reqFunc => userFunctions.includes(reqFunc))
    }) || []

    // Get user's documents
    const { data: userDocuments } = await supabase
      .from('documents')
      .select('document_type_id, expiry_date, approved')
      .eq('user_id', userId)

    let alertCount = 0

    // Check for missing documents
    const uploadedTypeIds = (userDocuments || [])
      .filter(doc => doc.approved) // Only count approved documents
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
    const unapprovedDocuments = (userDocuments || []).filter(doc => !doc.approved)
    alertCount += unapprovedDocuments.length

    return NextResponse.json({
      count: alertCount,
      details: {
        missing: missingDocuments.length,
        expiring: expiringDocuments.length,
        expired: expiredDocuments.length,
        unapproved: unapprovedDocuments.length
      }
    })
  } catch (error) {
    console.error('Error in GET /api/documents/user-alerts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
