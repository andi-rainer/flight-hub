import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Allow all origins (or specify your tandem store URL)
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Handle preflight OPTIONS request
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: Request) {
  try {
    const { voucherCode } = await request.json()

    if (!voucherCode) {
      return NextResponse.json(
        { error: 'Voucher code is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    const supabase = createAdminClient()

    // Use the database function to check voucher availability
    const { data, error } = await supabase
      .rpc('is_voucher_available_for_booking', {
        voucher_code_param: voucherCode.trim().toUpperCase()
      })

    if (error) {
      console.error('Voucher validation error:', error)
      return NextResponse.json(
        { error: 'Failed to validate voucher' },
        { status: 500, headers: corsHeaders }
      )
    }

    // The function returns an array with one row
    const result = data[0]

    if (!result) {
      return NextResponse.json(
        { valid: false, error: 'Invalid voucher code' },
        { status: 200, headers: corsHeaders }
      )
    }

    return NextResponse.json(
      {
        valid: result.available,
        voucherId: result.voucher_id,
        status: result.status,
        validUntil: result.valid_until,
        voucherTypeName: result.voucher_type_name,
        error: result.error_message,
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('Voucher validation error:', error)
    return NextResponse.json(
      { error: 'Failed to validate voucher' },
      { status: 500, headers: corsHeaders }
    )
  }
}
