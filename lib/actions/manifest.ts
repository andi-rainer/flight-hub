'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/permissions'

/**
 * Server actions for Skydive Manifest System
 * Handles operation days, flights, and jumper assignments
 */

// ============================================================================
// OPERATION DAY ACTIONS
// ============================================================================

export async function createOperationDay(data: {
  operation_date: string
  plane_id: string
  notes?: string
}) {
  const supabase = await createClient()

  const { user, error: permError } = await requirePermission(
    supabase,
    'manifest.operation_days.create'
  )
  if (!user) return { success: false, error: permError || 'Not authenticated' }

  // Validate plane exists and is active
  const { data: plane, error: planeError } = await supabase
    .from('planes')
    .select('id, active')
    .eq('id', data.plane_id)
    .single()

  if (planeError || !plane?.active) {
    return { success: false, error: 'Invalid or inactive aircraft selected' }
  }

  // Check for existing operation day on same date with same plane
  const { data: existing } = await supabase
    .from('skydive_operation_days')
    .select('id')
    .eq('plane_id', data.plane_id)
    .eq('operation_date', data.operation_date)
    .single()

  if (existing) {
    return { success: false, error: 'Operation day already exists for this aircraft on this date' }
  }

  const { data: operationDay, error } = await supabase
    .from('skydive_operation_days')
    .insert({
      operation_date: data.operation_date,
      plane_id: data.plane_id,
      notes: data.notes,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating operation day:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/manifest')
  return { success: true, data: operationDay }
}

export async function updateOperationDay(
  id: string,
  updates: {
    status?: 'planned' | 'active' | 'completed' | 'cancelled'
    notes?: string
  }
) {
  const supabase = await createClient()

  const { user, error: permError } = await requirePermission(
    supabase,
    'manifest.operation_days.edit'
  )
  if (!user) return { success: false, error: permError || 'Not authenticated' }

  const { data, error } = await supabase
    .from('skydive_operation_days')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating operation day:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/manifest')
  return { success: true, data }
}

export async function deleteOperationDay(id: string) {
  const supabase = await createClient()

  const { user, error: permError } = await requirePermission(
    supabase,
    'manifest.operation_days.delete'
  )
  if (!user) return { success: false, error: permError || 'Not authenticated' }

  // Check if any flights exist
  const { count } = await supabase
    .from('skydive_flights')
    .select('*', { count: 'exact', head: true })
    .eq('operation_day_id', id)

  if (count && count > 0) {
    return { success: false, error: 'Cannot delete operation day with scheduled flights' }
  }

  const { error } = await supabase
    .from('skydive_operation_days')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting operation day:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/manifest')
  return { success: true }
}

// ============================================================================
// FLIGHT ACTIONS
// ============================================================================

export async function createFlight(data: {
  operation_day_id: string
  flight_number: number
  scheduled_time: string
  altitude_feet?: number
  pilot_id?: string
  notes?: string
}) {
  const supabase = await createClient()

  const { user, error: permError } = await requirePermission(
    supabase,
    'manifest.flights.create'
  )
  if (!user) return { success: false, error: permError || 'Not authenticated' }

  const { data: flight, error } = await supabase
    .from('skydive_flights')
    .insert({
      operation_day_id: data.operation_day_id,
      flight_number: data.flight_number,
      scheduled_time: data.scheduled_time,
      altitude_feet: data.altitude_feet,
      pilot_id: data.pilot_id,
      notes: data.notes,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating flight:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/manifest')
  return { success: true, data: flight }
}

export async function updateFlight(
  id: string,
  updates: {
    scheduled_time?: string
    pilot_id?: string | null
    status?: 'planned' | 'ready' | 'boarding' | 'in_air' | 'completed' | 'cancelled'
    actual_takeoff?: string | null
    actual_landing?: string | null
    altitude_feet?: number | null
    notes?: string | null
  }
) {
  const supabase = await createClient()

  const { user, error: permError } = await requirePermission(
    supabase,
    'manifest.flights.edit'
  )
  if (!user) return { success: false, error: permError || 'Not authenticated' }

  // If status is being changed to 'ready', ensure pilot is assigned
  if (updates.status === 'ready') {
    const { data: flight } = await supabase
      .from('skydive_flights')
      .select('pilot_id')
      .eq('id', id)
      .single()

    if (!flight?.pilot_id && !updates.pilot_id) {
      return { success: false, error: 'Cannot mark flight as ready without assigned pilot' }
    }
  }

  const { data, error } = await supabase
    .from('skydive_flights')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating flight:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/manifest')
  return { success: true, data }
}

export async function deleteFlight(id: string) {
  const supabase = await createClient()

  const { user, error: permError } = await requirePermission(
    supabase,
    'manifest.flights.delete'
  )
  if (!user) return { success: false, error: permError || 'Not authenticated' }

  // Check if any jumpers are assigned
  const { count } = await supabase
    .from('skydive_flight_jumpers')
    .select('*', { count: 'exact', head: true })
    .eq('flight_id', id)

  if (count && count > 0) {
    return { success: false, error: 'Cannot delete flight with assigned jumpers' }
  }

  const { error } = await supabase
    .from('skydive_flights')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting flight:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/manifest')
  return { success: true }
}

export async function postponeFlight(id: string, new_time: string) {
  const supabase = await createClient()

  const { user, error: permError } = await requirePermission(
    supabase,
    'manifest.flights.edit'
  )
  if (!user) return { success: false, error: permError || 'Not authenticated' }

  const { data, error } = await supabase
    .from('skydive_flights')
    .update({ scheduled_time: new_time })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error postponing flight:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/manifest')
  return { success: true, data }
}

export async function postponeFlightCascade(params: {
  flight_id: string
  new_time: string
  time_diff_minutes: number
  custom_interval_minutes: number | null
  default_interval_minutes: number
}) {
  const supabase = await createClient()

  const { user, error: permError } = await requirePermission(
    supabase,
    'manifest.flights.edit'
  )
  if (!user) return { success: false, error: permError || 'Not authenticated' }

  // Get the current flight and its operation day
  const { data: currentFlight, error: flightError } = await supabase
    .from('skydive_flights')
    .select('operation_day_id, flight_number, scheduled_time')
    .eq('id', params.flight_id)
    .single()

  if (flightError || !currentFlight) {
    return { success: false, error: 'Flight not found' }
  }

  // Get all flights for this operation day, ordered by flight number
  const { data: allFlights, error: allFlightsError } = await supabase
    .from('skydive_flights')
    .select('id, flight_number, scheduled_time')
    .eq('operation_day_id', currentFlight.operation_day_id)
    .order('flight_number', { ascending: true })

  if (allFlightsError || !allFlights) {
    return { success: false, error: 'Failed to fetch flights' }
  }

  // Find flights that come after the current one
  const followingFlights = allFlights.filter(
    (f: any) => f.flight_number > currentFlight.flight_number
  )

  if (followingFlights.length === 0) {
    // No following flights, just update this one
    return postponeFlight(params.flight_id, params.new_time)
  }

  // Update the current flight first
  const { error: updateError } = await supabase
    .from('skydive_flights')
    .update({ scheduled_time: params.new_time })
    .eq('id', params.flight_id)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Calculate new times for following flights
  const [newH, newM] = params.new_time.split(':').map(Number)
  let baseMinutes = newH * 60 + newM

  // Update each following flight
  let updatedCount = 0
  for (let i = 0; i < followingFlights.length; i++) {
    const flight = followingFlights[i]

    // For the first following flight, use custom interval if provided
    const interval = i === 0 && params.custom_interval_minutes !== null
      ? params.custom_interval_minutes
      : params.default_interval_minutes

    baseMinutes += interval

    const nextH = Math.floor(baseMinutes / 60) % 24
    const nextM = baseMinutes % 60
    const nextTime = `${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`

    const { error: updateFollowingError } = await supabase
      .from('skydive_flights')
      .update({ scheduled_time: nextTime })
      .eq('id', flight.id)

    if (!updateFollowingError) {
      updatedCount++
    }
  }

  revalidatePath('/manifest')
  return { success: true, data: { updated_count: updatedCount } }
}

// ============================================================================
// JUMPER ASSIGNMENT ACTIONS
// ============================================================================

export async function addSportJumper(data: {
  flight_id: string
  sport_jumper_id: string
  slot_number: number
  notes?: string
}) {
  const supabase = await createClient()

  const { user, error: permError } = await requirePermission(
    supabase,
    'manifest.jumpers.assign'
  )
  if (!user) return { success: false, error: permError || 'Not authenticated' }

  // Validate sport jumper has appropriate function
  const { data: jumperFunctions } = await supabase
    .from('user_functions')
    .select('function_id, functions_master!inner(code)')
    .eq('user_id', data.sport_jumper_id)

  const hasSkydiveFunction = jumperFunctions?.some(
    (uf: any) => ['sport_jumper', 'skydive_instructor', 'tandem_master'].includes(uf.functions_master?.code)
  )

  if (!hasSkydiveFunction) {
    return { success: false, error: 'User does not have required skydiving function' }
  }

  const { data: jumper, error } = await supabase
    .from('skydive_flight_jumpers')
    .insert({
      flight_id: data.flight_id,
      jumper_type: 'sport',
      sport_jumper_id: data.sport_jumper_id,
      slot_number: data.slot_number,
      notes: data.notes,
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding sport jumper:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/manifest')
  return { success: true, data: jumper }
}

export async function addTandemPair(data: {
  flight_id: string
  tandem_master_id: string
  passenger_id: string
  slot_number: number
  payment_type: 'cash' | 'voucher' | 'pending'
  voucher_number?: string
  payment_amount?: number
  notes?: string
}) {
  const supabase = await createClient()

  const { user, error: permError } = await requirePermission(
    supabase,
    'manifest.jumpers.assign'
  )
  if (!user) return { success: false, error: permError || 'Not authenticated' }

  // Validate tandem master has tandem_master function
  const { data: tmFunctions } = await supabase
    .from('user_functions')
    .select('function_id, functions_master!inner(code)')
    .eq('user_id', data.tandem_master_id)

  const isTandemMaster = tmFunctions?.some(
    (uf: any) => uf.functions_master?.code === 'tandem_master'
  )

  if (!isTandemMaster) {
    return { success: false, error: 'User is not a certified tandem master' }
  }

  // Validate passenger exists and is an active user
  // Note: We don't strictly require short-term membership here to allow flexibility
  // (e.g., when "Show all users" is enabled in the UI)
  const { data: passenger } = await supabase
    .from('users')
    .select('id, left_at')
    .eq('id', data.passenger_id)
    .single()

  if (!passenger) {
    return { success: false, error: 'Invalid passenger selected' }
  }

  // Check if user is active (not left the club)
  if (passenger.left_at !== null) {
    return { success: false, error: 'Selected passenger is no longer an active member' }
  }

  const { data: jumper, error } = await supabase
    .from('skydive_flight_jumpers')
    .insert({
      flight_id: data.flight_id,
      jumper_type: 'tandem',
      tandem_master_id: data.tandem_master_id,
      passenger_id: data.passenger_id,
      slot_number: data.slot_number,
      slots_occupied: 2, // Tandem pairs take 2 slots (master + passenger)
      payment_type: data.payment_type,
      voucher_number: data.voucher_number,
      payment_amount: data.payment_amount,
      payment_received: data.payment_type === 'cash',
      notes: data.notes,
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding tandem pair:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/manifest')
  return { success: true, data: jumper }
}

export async function removeJumper(id: string) {
  const supabase = await createClient()

  const { user, error: permError } = await requirePermission(
    supabase,
    'manifest.jumpers.remove'
  )
  if (!user) return { success: false, error: permError || 'Not authenticated' }

  const { error } = await supabase
    .from('skydive_flight_jumpers')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error removing jumper:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/manifest')
  return { success: true }
}

export async function updateJumperPayment(
  id: string,
  updates: {
    payment_type?: 'cash' | 'voucher' | 'pending'
    voucher_number?: string | null
    payment_received?: boolean
    payment_amount?: number | null
  }
) {
  const supabase = await createClient()

  const { user, error: permError } = await requirePermission(
    supabase,
    'manifest.payments.update'
  )
  if (!user) return { success: false, error: permError || 'Not authenticated' }

  const { data, error } = await supabase
    .from('skydive_flight_jumpers')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating jumper payment:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/manifest')
  return { success: true, data }
}

// ============================================================================
// QUERY ACTIONS
// ============================================================================

export async function getOperationDaysByDateRange(start_date: string, end_date: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('skydive_operation_days')
    .select(`
      *,
      plane:planes(tail_number, type),
      flights:skydive_flights(
        id,
        flight_number,
        scheduled_time,
        status,
        pilot:users(name, surname)
      )
    `)
    .gte('operation_date', start_date)
    .lte('operation_date', end_date)
    .order('operation_date', { ascending: true })

  if (error) {
    console.error('Error fetching operation days:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

export async function getFlightDetails(flight_id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('manifest_flights_with_details')
    .select('*')
    .eq('id', flight_id)
    .single()

  if (error) {
    console.error('Error fetching flight details:', error)
    return { success: false, error: error.message }
  }

  // Get jumpers
  const { data: jumpers } = await supabase
    .from('skydive_flight_jumpers')
    .select(`
      *,
      sport_jumper:users!sport_jumper_id(name, surname),
      tandem_master:users!tandem_master_id(name, surname),
      passenger:users!passenger_id(name, surname, email)
    `)
    .eq('flight_id', flight_id)
    .order('slot_number', { ascending: true })

  return { success: true, data: { ...data, jumpers } }
}

export async function getOperationDayDetails(operation_day_id: string) {
  const supabase = await createClient()

  const { data: operationDay, error } = await supabase
    .from('skydive_operation_days')
    .select(`
      *,
      plane:planes(tail_number, type),
      flights:skydive_flights(
        *,
        pilot:users(name, surname),
        jumpers:skydive_flight_jumpers(
          *,
          sport_jumper:users!sport_jumper_id(name, surname),
          tandem_master:users!tandem_master_id(name, surname),
          passenger:users!passenger_id(name, surname, email)
        )
      )
    `)
    .eq('id', operation_day_id)
    .single()

  if (error) {
    console.error('Error fetching operation day details:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data: operationDay }
}

// ============================================================================
// HELPER ACTIONS
// ============================================================================

export async function getAvailableTandemMasters(operation_date: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .rpc('get_available_tandem_masters', { operation_date })

  if (error) {
    console.error('Error fetching tandem masters:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

export async function getAvailableSportJumpers(operation_date: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .rpc('get_available_sport_jumpers', { operation_date })

  if (error) {
    console.error('Error fetching sport jumpers:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

export async function getAvailablePilots(operation_date: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .rpc('get_available_pilots', { operation_date })

  if (error) {
    console.error('Error fetching pilots:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

export async function getTandemPassengers(showAll: boolean = false) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .rpc('get_available_tandem_passengers', { show_all: showAll })

  if (error) {
    console.error('Error fetching tandem passengers:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

export async function markFlightCompleted(flight_id: string) {
  const supabase = await createClient()

  const { user, error: permError } = await requirePermission(
    supabase,
    'manifest.flights.edit'
  )
  if (!user) return { success: false, error: permError || 'Not authenticated' }

  const { data, error } = await supabase
    .rpc('mark_flight_completed', { flight_id_param: flight_id })

  if (error) {
    console.error('Error marking flight as completed:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/manifest')
  return { success: true, data }
}

// ============================================================================
// MANIFEST SETTINGS ACTIONS
// ============================================================================

export async function updateManifestSettings(updates: {
  default_jump_altitude_feet?: number
  min_jump_altitude_feet?: number
  max_jump_altitude_feet?: number
  default_flight_interval_minutes?: number
  default_operation_start_time?: string
  default_operation_end_time?: string
  default_tandem_price_eur?: string | number
}) {
  const supabase = await createClient()

  const { user, error: permError } = await requirePermission(
    supabase,
    'settings.edit.system'
  )
  if (!user) return { success: false, error: permError || 'Not authenticated' }

  // Validate altitude ranges
  if (updates.default_jump_altitude_feet && updates.min_jump_altitude_feet && updates.max_jump_altitude_feet) {
    if (updates.default_jump_altitude_feet < updates.min_jump_altitude_feet) {
      return { success: false, error: 'Default altitude cannot be less than minimum altitude' }
    }
    if (updates.default_jump_altitude_feet > updates.max_jump_altitude_feet) {
      return { success: false, error: 'Default altitude cannot exceed maximum altitude' }
    }
  }

  // Parse tandem price
  const tandemPrice = updates.default_tandem_price_eur
    ? parseFloat(updates.default_tandem_price_eur.toString())
    : null

  // Get existing settings
  const { data: existing } = await supabase
    .from('manifest_settings')
    .select('id')
    .single()

  const updateData = {
    ...updates,
    default_tandem_price_eur: tandemPrice,
    updated_by: user.id,
  }

  const { data, error } = await supabase
    .from('manifest_settings')
    .update(updateData)
    .eq('id', existing?.id ?? '')
    .select()
    .single()

  if (error) {
    console.error('Error updating manifest settings:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/manifest')
  return { success: true, data }
}

// ============================================================================
// BOOKING TIMEFRAME ACTIONS
// ============================================================================

export async function getOperationDayTimeframes(operationDayId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('manifest_booking_timeframes')
    .select('*')
    .eq('operation_day_id', operationDayId)
    .order('start_time', { ascending: true })

  if (error) {
    console.error('Error fetching timeframes:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

export async function createBookingTimeframe(data: {
  operation_day_id: string
  start_time: string
  end_time: string
  max_bookings: number
  overbooking_allowed?: number
}) {
  const supabase = await createClient()

  const { user, error: permError } = await requirePermission(
    supabase,
    'manifest.operation_days.create'
  )
  if (!user) return { success: false, error: permError || 'Not authenticated' }

  // Validate timeframe
  if (data.start_time >= data.end_time) {
    return { success: false, error: 'End time must be after start time' }
  }

  if (data.max_bookings <= 0) {
    return { success: false, error: 'Max bookings must be greater than 0' }
  }

  const { data: timeframe, error } = await supabase
    .from('manifest_booking_timeframes')
    .insert({
      operation_day_id: data.operation_day_id,
      start_time: data.start_time,
      end_time: data.end_time,
      max_bookings: data.max_bookings,
      overbooking_allowed: data.overbooking_allowed || 0,
      created_by: user.id,
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

export async function updateBookingTimeframe(
  timeframeId: string,
  data: {
    start_time?: string
    end_time?: string
    max_bookings?: number
    overbooking_allowed?: number
    active?: boolean
  }
) {
  const supabase = await createClient()

  const { user, error: permError } = await requirePermission(
    supabase,
    'manifest.operation_days.create'
  )
  if (!user) return { success: false, error: permError || 'Not authenticated' }

  // Validate timeframe if times are being updated
  if (data.start_time && data.end_time && data.start_time >= data.end_time) {
    return { success: false, error: 'End time must be after start time' }
  }

  if (data.max_bookings !== undefined && data.max_bookings <= 0) {
    return { success: false, error: 'Max bookings must be greater than 0' }
  }

  const { data: timeframe, error } = await supabase
    .from('manifest_booking_timeframes')
    .update(data)
    .eq('id', timeframeId)
    .select()
    .single()

  if (error) {
    console.error('Error updating timeframe:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/manifest')
  return { success: true, data: timeframe }
}

export async function deleteBookingTimeframe(timeframeId: string) {
  const supabase = await createClient()

  const { user, error: permError} = await requirePermission(
    supabase,
    'manifest.operation_days.create'
  )
  if (!user) return { success: false, error: permError || 'Not authenticated' }

  // Check if timeframe has any bookings
  const { count } = await supabase
    .from('ticket_bookings')
    .select('*', { count: 'exact', head: true })
    .eq('timeframe_id', timeframeId)
    .in('status', ['active', 'pending'])

  if (count && count > 0) {
    return {
      success: false,
      error: `Cannot delete timeframe with ${count} active booking(s). Cancel bookings first.`,
    }
  }

  const { error } = await supabase
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
