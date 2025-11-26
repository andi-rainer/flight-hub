import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/store/bookings/availability
 * Checks slot availability for an operation day and timeframe
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { operationDayId, timeframeId } = body

    if (!operationDayId || !timeframeId) {
      return NextResponse.json(
        { error: 'Operation day ID and timeframe ID are required' },
        { status: 400 }
      )
    }

    // Get timeframe details
    const { data: timeframe, error: timeframeError } = await supabase
      .from('manifest_booking_timeframes')
      .select('*')
      .eq('id', timeframeId)
      .eq('operation_day_id', operationDayId)
      .eq('active', true)
      .single()

    if (timeframeError || !timeframe) {
      return NextResponse.json(
        { error: 'Timeframe not found or inactive' },
        { status: 404 }
      )
    }

    // Check availability using database function
    const { data: availability, error: availError } = await supabase
      .rpc('check_timeframe_availability', { timeframe_id: timeframeId })
      .single()

    if (availError) {
      console.error('Error checking availability:', availError)
      return NextResponse.json(
        { error: 'Failed to check availability' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      available: availability.available,
      timeframe: {
        id: timeframe.id,
        startTime: timeframe.start_time,
        endTime: timeframe.end_time,
      },
      capacity: {
        maxBookings: availability.max_bookings,
        currentBookings: availability.current_bookings,
        overbookingAllowed: availability.overbooking_allowed,
        slotsRemaining: availability.slots_remaining,
      },
    })
  } catch (error) {
    console.error('Error in POST /api/store/bookings/availability:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
