import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/store/vouchers/validate
 * Validates a voucher code and returns its details
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { voucherCode } = body

    if (!voucherCode) {
      return NextResponse.json(
        { error: 'Voucher code is required' },
        { status: 400 }
      )
    }

    // Fetch voucher with type details
    const { data: voucher, error } = await supabase
      .from('vouchers')
      .select(`
        *,
        voucher_type:voucher_types(*)
      `)
      .eq('voucher_code', voucherCode.toUpperCase())
      .single()

    if (error || !voucher) {
      return NextResponse.json(
        { valid: false, error: 'Voucher not found' },
        { status: 404 }
      )
    }

    // Check status
    if (voucher.status !== 'active') {
      return NextResponse.json(
        {
          valid: false,
          error: `Voucher is ${voucher.status}`,
          voucher: {
            code: voucher.voucher_code,
            status: voucher.status,
          },
        },
        { status: 400 }
      )
    }

    // Check expiry
    if (voucher.valid_until && new Date(voucher.valid_until) < new Date()) {
      // Auto-expire voucher
      await supabase
        .from('vouchers')
        .update({ status: 'expired' })
        .eq('id', voucher.id)

      return NextResponse.json(
        {
          valid: false,
          error: 'Voucher has expired',
          voucher: {
            code: voucher.voucher_code,
            status: 'expired',
            validUntil: voucher.valid_until,
          },
        },
        { status: 400 }
      )
    }

    // Voucher is valid
    return NextResponse.json({
      valid: true,
      voucher: {
        id: voucher.id,
        code: voucher.voucher_code,
        status: voucher.status,
        voucherType: voucher.voucher_type,
        validFrom: voucher.valid_from,
        validUntil: voucher.valid_until,
        purchaserName: voucher.purchaser_name,
        purchaserEmail: voucher.purchaser_email,
      },
    })
  } catch (error) {
    console.error('Error in POST /api/store/vouchers/validate:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
