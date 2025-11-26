import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/store/settings
 * Returns public store configuration (non-sensitive data only)
 * Public endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: settings, error } = await supabase
      .from('store_settings')
      .select('redirect_url, stripe_public_key, allow_voucher_sales, allow_ticket_sales')
      .single()

    if (error) {
      console.error('Error fetching store settings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch store settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      redirectUrl: settings?.redirect_url || 'https://skydive-salzburg.com',
      stripePublicKey: settings?.stripe_public_key || '',
      allowVoucherSales: settings?.allow_voucher_sales ?? true,
      allowTicketSales: settings?.allow_ticket_sales ?? true,
    })
  } catch (error) {
    console.error('Error in GET /api/store/settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
