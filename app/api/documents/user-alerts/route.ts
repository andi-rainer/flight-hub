import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addDays } from 'date-fns'

// Type for get_user_endorsement_alerts RPC function response
interface EndorsementAlertsResponse {
  total_alerts: number
  expired_count: number
  expiring_count: number
  ir_expired_count: number
  ir_expiring_count: number
  endorsement_alerts: Array<{
    documentId: string
    documentName: string
    endorsementId: string
    endorsementName: string
    endorsementCode: string
    expiryDate: string
    status: 'expired' | 'expiring_soon'
    daysUntilExpiry: number
    hasIR: boolean
    irExpiryDate: string | null
    irStatus: 'expired' | 'expiring_soon' | 'valid'
    irDaysUntilExpiry: number | null
  }>
}

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

    // Get user's function codes for comparison with required_for_functions
    const { data: userFunctionsWithCodes } = await supabase
      .from('user_functions')
      .select('functions_master(code)')
      .eq('user_id', userId)

    const userFunctionCodes = userFunctionsWithCodes?.map((uf: any) => uf.functions_master?.code).filter(Boolean) || []

    // Get all mandatory document definitions required for user's functions
    const { data: requiredDocDefs } = await supabase
      .from('document_definitions')
      .select('id, name, mandatory, required_for_functions')

    const mandatoryForUser = requiredDocDefs?.filter(docDef => {
      // Include if globally mandatory (no specific function requirement)
      if (docDef.mandatory && (!docDef.required_for_functions || docDef.required_for_functions.length === 0)) {
        return true
      }

      // Include if mandatory AND required for any of the user's functions
      if (docDef.mandatory && docDef.required_for_functions && docDef.required_for_functions.length > 0) {
        // required_for_functions stores function codes (strings)
        return docDef.required_for_functions.some((reqFuncCode: string) =>
          userFunctionCodes.includes(reqFuncCode)
        )
      }

      return false
    }) || []

    // Get user's documents
    const { data: userDocuments } = await supabase
      .from('documents')
      .select('document_definition_id, expiry_date, approved')
      .eq('user_id', userId)

    let alertCount = 0

    // Check for missing documents
    // Count ALL uploaded documents (not just approved), matching the member list logic
    const uploadedDefIds = (userDocuments || [])
      .map(doc => doc.document_definition_id)
      .filter(Boolean)

    const missingDocuments = mandatoryForUser.filter(docDef =>
      !uploadedDefIds.includes(docDef.id)
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

    // Don't count unapproved documents for regular users - they don't need alerts for pending approvals
    // Board members see pending approvals in a different badge on the Members page

    // Get endorsement alerts using database function
    const { data: endorsementAlertsData, error: endorsementError } = await supabase
      .rpc('get_user_endorsement_alerts' as any, { p_user_id: userId })
      .single()

    if (endorsementError) {
      console.error('Error fetching endorsement alerts:', endorsementError)
    }

    const endorsementAlerts = (endorsementAlertsData as any) || {
      total_alerts: 0,
      expired_count: 0,
      expiring_count: 0,
      ir_expired_count: 0,
      ir_expiring_count: 0,
      endorsement_alerts: []
    }

    // Add endorsement alerts to total count
    alertCount += endorsementAlerts.total_alerts

    return NextResponse.json({
      count: alertCount,
      details: {
        missing: missingDocuments.length,
        expiring: expiringDocuments.length,
        expired: expiredDocuments.length,
        endorsementExpired: endorsementAlerts.expired_count,
        endorsementExpiring: endorsementAlerts.expiring_count,
        irExpired: endorsementAlerts.ir_expired_count,
        irExpiring: endorsementAlerts.ir_expiring_count
      },
      endorsementAlerts: endorsementAlerts.endorsement_alerts
    })
  } catch (error) {
    console.error('Error in GET /api/documents/user-alerts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
