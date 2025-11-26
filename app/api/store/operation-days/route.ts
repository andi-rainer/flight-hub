import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/store/operation-days
 * Returns future operation days with available timeframes
 * Public endpoint for store
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Optional filters
    const fromDate = searchParams.get('from') || new Date().toISOString().split('T')[0]
    const limit = parseInt(searchParams.get('limit') || '30')

    // Get operation days with timeframes
    const { data: operationDays, error } = await supabase
      .from('skydive_operation_days')
      .select(`
        *,
        plane:planes(id, tail_number, type),
        timeframes:manifest_booking_timeframes(
          id,
          start_time,
          end_time,
          max_bookings,
          current_bookings,
          overbooking_allowed,
          active
        )
      `)
      .gte('operation_date', fromDate)
      .order('operation_date', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('Error fetching operation days:', error)
      return NextResponse.json(
        { error: 'Failed to fetch operation days' },
        { status: 500 }
      )
    }

    // Filter to only include days with active timeframes that have availability
    const availableDays = (operationDays || []).map((day) => {
      const availableTimeframes = (day.timeframes || [])
        .filter((tf: any) => {
          if (!tf.active) return false
          const totalAllowed = tf.max_bookings + tf.overbooking_allowed
          return tf.current_bookings < totalAllowed
        })
        .map((tf: any) => ({
          id: tf.id,
          startTime: tf.start_time,
          endTime: tf.end_time,
          maxBookings: tf.max_bookings,
          currentBookings: tf.current_bookings,
          overbookingAllowed: tf.overbooking_allowed,
          slotsRemaining: (tf.max_bookings + tf.overbooking_allowed) - tf.current_bookings,
        }))

      return {
        id: day.id,
        date: day.operation_date,
        plane: day.plane,
        notes: day.notes,
        timeframes: availableTimeframes,
        hasAvailability: availableTimeframes.length > 0,
      }
    }).filter((day) => day.hasAvailability)

    return NextResponse.json({
      operationDays: availableDays,
      count: availableDays.length,
    })
  } catch (error) {
    console.error('Error in GET /api/store/operation-days:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
