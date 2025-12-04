import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Generates a unique booking code
 */
function generateBookingCode(prefix: string): string {
  const year = new Date().getFullYear()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}-${year}-${random}`
}

/**
 * POST /api/store/bookings/create
 * Creates a ticket booking after successful payment
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
    const keyHash = Buffer.from(apiKey).toString('base64')
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
      operationDayId,
      timeframeId,
      voucherTypeId,
      ticketTypeId,
      purchaserName,
      purchaserEmail,
      purchaserPhone,
      pricePaid,
      paymentIntentId,
    } = body

    if (
      !operationDayId ||
      !timeframeId ||
      !purchaserName ||
      !purchaserEmail ||
      !pricePaid
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Must have either ticketTypeId or voucherTypeId
    if (!ticketTypeId && !voucherTypeId) {
      return NextResponse.json(
        { error: 'Either ticketTypeId or voucherTypeId is required' },
        { status: 400 }
      )
    }

    // Check availability
    const { data: availability, error: availError } = await supabase
      .rpc('check_timeframe_availability', { timeframe_id: timeframeId })
      .single()

    if (availError || !availability?.available) {
      return NextResponse.json(
        { error: 'No slots available for this timeframe' },
        { status: 400 }
      )
    }

    // Get prefix from ticket type or voucher type
    let prefix = 'TKT'
    if (ticketTypeId) {
      const { data: ticketType } = await supabase
        .from('ticket_types')
        .select('code_prefix')
        .eq('id', ticketTypeId)
        .single()

      prefix = ticketType?.code_prefix || 'TKT'
    } else if (voucherTypeId) {
      const { data: voucherType } = await supabase
        .from('voucher_types')
        .select('code_prefix')
        .eq('id', voucherTypeId)
        .single()

      prefix = voucherType?.code_prefix || 'TDM'
    }

    // Generate unique booking code
    let bookingCode = generateBookingCode(prefix)
    let attempts = 0
    while (attempts < 10) {
      const { data: existing } = await supabase
        .from('ticket_bookings')
        .select('id')
        .eq('booking_code', bookingCode)
        .single()

      if (!existing) break
      bookingCode = generateBookingCode(prefix)
      attempts++
    }

    // Create booking and increment counter atomically
    const { data: booking, error: createError } = await supabase
      .from('ticket_bookings')
      .insert({
        booking_code: bookingCode,
        operation_day_id: operationDayId,
        timeframe_id: timeframeId,
        voucher_type_id: voucherTypeId || null,
        ticket_type_id: ticketTypeId || null,
        purchaser_name: purchaserName,
        purchaser_email: purchaserEmail,
        purchaser_phone: purchaserPhone || null,
        price_paid_eur: pricePaid,
        payment_intent_id: paymentIntentId || null,
        status: 'pending',
      })
      .select(`
        *,
        voucher_type:voucher_types(*),
        ticket_type:ticket_types(*),
        timeframe:manifest_booking_timeframes(*),
        operation_day:skydive_operation_days(*)
      `)
      .single()

    if (createError) {
      console.error('Error creating booking:', createError)
      return NextResponse.json(
        { error: 'Failed to create booking' },
        { status: 500 }
      )
    }

    // Increment timeframe booking count
    const { error: incrementError } = await supabase.rpc(
      'increment_timeframe_bookings',
      { timeframe_id: timeframeId }
    )

    if (incrementError) {
      console.error('Error incrementing bookings:', incrementError)
      // Rollback booking creation
      await supabase.from('ticket_bookings').delete().eq('id', booking.id)
      return NextResponse.json(
        { error: 'Failed to reserve slot' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        code: booking.booking_code,
        voucherType: booking.voucher_type,
        operationDay: booking.operation_day,
        timeframe: booking.timeframe,
        purchaserName: booking.purchaser_name,
        purchaserEmail: booking.purchaser_email,
      },
    })
  } catch (error) {
    console.error('Error in POST /api/store/bookings/create:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
