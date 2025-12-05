import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Generates a unique voucher code
 */
function generateVoucherCode(prefix: string): string {
  const year = new Date().getFullYear()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}-${year}-${random}`
}

/**
 * POST /api/store/vouchers/create
 * Creates a voucher after successful payment
 * Called by the store webhook handler
 * Requires API key authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Verify API key
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      )
    }

    const supabase = createAdminClient()

    // Validate API key
    const keyHash = Buffer.from(apiKey).toString('base64') // Simple hash for now
    const { data: apiKeyRecord } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key_hash', keyHash)
      .eq('active', true)
      .single()

    if (!apiKeyRecord) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      )
    }

    // Update last used timestamp
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKeyRecord.id)

    const body = await request.json()
    const {
      voucherTypeId,
      purchaserName,
      purchaserEmail,
      purchaserPhone,
      pricePaid,
      paymentIntentId,
    } = body

    if (!voucherTypeId || !purchaserName || !purchaserEmail || !pricePaid) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get voucher type details
    const { data: voucherType, error: typeError } = await supabase
      .from('voucher_types')
      .select('*')
      .eq('id', voucherTypeId)
      .single()

    if (typeError || !voucherType) {
      return NextResponse.json(
        { error: 'Voucher type not found' },
        { status: 404 }
      )
    }

    // Use voucher type's code prefix
    const prefix = voucherType.code_prefix || 'TDM'

    // Generate unique voucher code
    let voucherCode = generateVoucherCode(prefix)
    let attempts = 0
    while (attempts < 10) {
      const { data: existing } = await supabase
        .from('vouchers')
        .select('id')
        .eq('voucher_code', voucherCode)
        .single()

      if (!existing) break
      voucherCode = generateVoucherCode(prefix)
      attempts++
    }

    // Calculate validity period
    let validUntil = null
    if (voucherType.validity_months != null) {
      // Validate and coerce to non-negative integer
      const months = Math.max(0, Math.floor(Number(voucherType.validity_months)))
      if (!isNaN(months) && months > 0) {
        const validFrom = new Date()
        validUntil = new Date(validFrom)
        // Add months using setMonth to handle calendar month overflow correctly
        validUntil.setMonth(validUntil.getMonth() + months)
      }
    }

    // Create voucher
    const { data: voucher, error: createError } = await supabase
      .from('vouchers')
      .insert({
        voucher_code: voucherCode,
        voucher_type_id: voucherTypeId,
        purchaser_name: purchaserName,
        purchaser_email: purchaserEmail,
        purchaser_phone: purchaserPhone || null,
        price_paid_eur: pricePaid,
        payment_intent_id: paymentIntentId || null,
        status: 'active',
        valid_from: new Date().toISOString(),
        valid_until: validUntil ? validUntil.toISOString() : null,
      })
      .select(`
        *,
        voucher_type:voucher_types(*)
      `)
      .single()

    if (createError) {
      console.error('Error creating voucher:', createError)
      return NextResponse.json(
        { error: 'Failed to create voucher' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      voucher: {
        id: voucher.id,
        code: voucher.voucher_code,
        voucherType: voucher.voucher_type,
        validFrom: voucher.valid_from,
        validUntil: voucher.valid_until,
        purchaserName: voucher.purchaser_name,
        purchaserEmail: voucher.purchaser_email,
      },
    })
  } catch (error) {
    console.error('Error in POST /api/store/vouchers/create:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
