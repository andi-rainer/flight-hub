'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Server actions for ticket booking management
 */

// ============================================================================
// AUTHORIZATION HELPER
// ============================================================================

async function verifyBoardOrManifest() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { authorized: false, error: 'Not authenticated', supabase: null, userId: null }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const isBoard = profile?.role?.includes('board')

  // Check if user is manifest coordinator
  const { data: userFunctions } = await supabase
    .from('user_functions')
    .select('function_id, functions_master:function_id(code)')
    .eq('user_id', user.id)

  const isManifest = userFunctions?.some((uf: any) => uf.functions_master?.code === 'manifest_coordinator')

  if (!isBoard && !isManifest) {
    return { authorized: false, error: 'Not authorized - board or manifest coordinator only', supabase: null, userId: null }
  }

  return { authorized: true, supabase, userId: user.id }
}

// ============================================================================
// GET BOOKINGS
// ============================================================================

export async function getBookings(filters?: {
  status?: string
  operationDayId?: string
  searchCode?: string
  searchEmail?: string
  dateFrom?: string
  dateTo?: string
}) {
  const auth = await verifyBoardOrManifest()
  if (!auth.authorized || !auth.supabase) {
    return { success: false, error: auth.error }
  }

  let query = auth.supabase
    .from('ticket_bookings')
    .select(`
      *,
      voucher_type:voucher_types(*),
      operation_day:skydive_operation_days(
        id,
        operation_date,
        plane:planes(tail_number, type)
      ),
      timeframe:manifest_booking_timeframes(*),
      assigned_by_user:users!ticket_bookings_assigned_by_fkey(id, name, surname)
    `)

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.operationDayId) {
    query = query.eq('operation_day_id', filters.operationDayId)
  }

  if (filters?.searchCode) {
    query = query.ilike('booking_code', `%${filters.searchCode}%`)
  }

  if (filters?.searchEmail) {
    query = query.ilike('purchaser_email', `%${filters.searchEmail}%`)
  }

  if (filters?.dateFrom) {
    query = query.gte('purchase_date', filters.dateFrom)
  }

  if (filters?.dateTo) {
    query = query.lte('purchase_date', filters.dateTo)
  }

  const { data, error } = await query.order('purchase_date', { ascending: false })

  if (error) {
    console.error('Error fetching bookings:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

// ============================================================================
// ASSIGN BOOKING TO FLIGHT JUMPER
// ============================================================================

export async function assignBookingToSlot(data: {
  bookingId: string
  flightJumperId: string
}) {
  const auth = await verifyBoardOrManifest()
  if (!auth.authorized || !auth.supabase) {
    return { success: false, error: auth.error }
  }

  // Verify booking exists and is pending
  const { data: booking } = await auth.supabase
    .from('ticket_bookings')
    .select('*')
    .eq('id', data.bookingId)
    .single()

  if (!booking) {
    return { success: false, error: 'Booking not found' }
  }

  if (booking.status !== 'pending' && booking.status !== 'confirmed') {
    return { success: false, error: `Cannot assign booking - status is ${booking.status}` }
  }

  // Assign booking
  const { error } = await auth.supabase
    .from('ticket_bookings')
    .update({
      status: 'assigned',
      assigned_to_flight_jumper_id: data.flightJumperId,
      assigned_by: auth.userId,
      assigned_at: new Date().toISOString(),
    })
    .eq('id', data.bookingId)

  if (error) {
    console.error('Error assigning booking:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/bookings')
  revalidatePath('/manifest')
  return { success: true }
}

// ============================================================================
// COMPLETE BOOKING
// ============================================================================

export async function completeBooking(bookingId: string) {
  const auth = await verifyBoardOrManifest()
  if (!auth.authorized || !auth.supabase) {
    return { success: false, error: auth.error }
  }

  const { error } = await auth.supabase
    .from('ticket_bookings')
    .update({ status: 'completed' })
    .eq('id', bookingId)

  if (error) {
    console.error('Error completing booking:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/bookings')
  return { success: true }
}

// ============================================================================
// CANCEL BOOKING
// ============================================================================

export async function cancelBooking(bookingId: string, reason: string) {
  const auth = await verifyBoardOrManifest()
  if (!auth.authorized || !auth.supabase) {
    return { success: false, error: auth.error }
  }

  // Get booking to decrement timeframe counter
  const { data: booking } = await auth.supabase
    .from('ticket_bookings')
    .select('timeframe_id, status')
    .eq('id', bookingId)
    .single()

  if (!booking) {
    return { success: false, error: 'Booking not found' }
  }

  // Cancel booking
  const { error } = await auth.supabase
    .from('ticket_bookings')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: auth.userId,
      cancellation_reason: reason,
    })
    .eq('id', bookingId)

  if (error) {
    console.error('Error cancelling booking:', error)
    return { success: false, error: error.message }
  }

  // Decrement timeframe booking count if it was pending or confirmed
  if ((booking.status === 'pending' || booking.status === 'confirmed') && booking.timeframe_id) {
    await auth.supabase.rpc('decrement_timeframe_bookings', {
      timeframe_id: booking.timeframe_id
    })
  }

  revalidatePath('/bookings')
  return { success: true }
}

// ============================================================================
// MANAGE TIMEFRAMES
// ============================================================================

export async function createTimeframe(data: {
  operationDayId: string
  startTime: string
  endTime: string
  maxBookings: number
  overbookingAllowed: number
}) {
  const auth = await verifyBoardOrManifest()
  if (!auth.authorized || !auth.supabase) {
    return { success: false, error: auth.error }
  }

  const { data: timeframe, error } = await auth.supabase
    .from('manifest_booking_timeframes')
    .insert({
      operation_day_id: data.operationDayId,
      start_time: data.startTime,
      end_time: data.endTime,
      max_bookings: data.maxBookings,
      overbooking_allowed: data.overbookingAllowed,
      active: true,
      created_by: auth.userId,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating timeframe:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/manifest')
  return { success: true, data: timeframe }
}

export async function updateTimeframe(
  timeframeId: string,
  data: {
    startTime?: string
    endTime?: string
    maxBookings?: number
    overbookingAllowed?: number
    active?: boolean
  }
) {
  const auth = await verifyBoardOrManifest()
  if (!auth.authorized || !auth.supabase) {
    return { success: false, error: auth.error }
  }

  const updateData: any = {}
  if (data.startTime !== undefined) updateData.start_time = data.startTime
  if (data.endTime !== undefined) updateData.end_time = data.endTime
  if (data.maxBookings !== undefined) updateData.max_bookings = data.maxBookings
  if (data.overbookingAllowed !== undefined) updateData.overbooking_allowed = data.overbookingAllowed
  if (data.active !== undefined) updateData.active = data.active

  const { error } = await auth.supabase
    .from('manifest_booking_timeframes')
    .update(updateData)
    .eq('id', timeframeId)

  if (error) {
    console.error('Error updating timeframe:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/manifest')
  return { success: true }
}

export async function deleteTimeframe(timeframeId: string) {
  const auth = await verifyBoardOrManifest()
  if (!auth.authorized || !auth.supabase) {
    return { success: false, error: auth.error }
  }

  // Check if timeframe has bookings
  const { data: bookings } = await auth.supabase
    .from('ticket_bookings')
    .select('id')
    .eq('timeframe_id', timeframeId)
    .limit(1)

  if (bookings && bookings.length > 0) {
    return { success: false, error: 'Cannot delete timeframe with existing bookings' }
  }

  const { error } = await auth.supabase
    .from('manifest_booking_timeframes')
    .delete()
    .eq('id', timeframeId)

  if (error) {
    console.error('Error deleting timeframe:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/manifest')
  return { success: true }
}
