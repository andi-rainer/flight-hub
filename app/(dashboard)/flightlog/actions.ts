'use server'

import { createClient } from '@/lib/supabase/server'
import type { FlightlogInsert, FlightlogUpdate } from '@/lib/database.types'

export async function getFlightlogs() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('flightlog_with_times')
    .select('*')
    .order('block_on', { ascending: false })

  if (error) {
    console.error('Error fetching flightlogs:', error)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

export async function getFlightlogById(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('flightlog_with_times')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching flightlog:', error)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

export async function createFlightlog(entry: Omit<FlightlogInsert, 'pilot_id'>) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { data: null, error: 'Not authenticated' }
  }

  // Validate times
  const blockOn = new Date(entry.block_on)
  const blockOff = new Date(entry.block_off)
  const takeoffTime = new Date(entry.takeoff_time)
  const landingTime = new Date(entry.landing_time)

  if (blockOff <= blockOn) {
    return { data: null, error: 'Block off time must be after block on time' }
  }

  if (landingTime <= takeoffTime) {
    return { data: null, error: 'Landing time must be after takeoff time' }
  }

  if (takeoffTime < blockOn) {
    return { data: null, error: 'Takeoff time cannot be before block on time' }
  }

  if (landingTime > blockOff) {
    return { data: null, error: 'Landing time cannot be after block off time' }
  }

  // Check for pilot/copilot conflict
  if (entry.copilot_id && entry.copilot_id === user.id) {
    return { data: null, error: 'Copilot cannot be the same as pilot' }
  }

  // Insert flightlog entry
  const { data, error } = await supabase
    .from('flightlog')
    .insert({
      ...entry,
      pilot_id: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating flightlog:', error)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

export async function updateFlightlog(id: string, updates: FlightlogUpdate) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { data: null, error: 'Not authenticated' }
  }

  // Check if entry is locked
  const { data: existing, error: fetchError } = await supabase
    .from('flightlog')
    .select('locked, pilot_id')
    .eq('id', id)
    .single()

  if (fetchError) {
    return { data: null, error: 'Flightlog entry not found' }
  }

  // Check if user is board member
  const { data: userProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const isBoardMember = userProfile?.role?.includes('board') || false

  // If locked and not board, only allow locked/charged flag updates
  if (existing.locked && !isBoardMember) {
    return { data: null, error: 'Cannot modify locked flightlog entry' }
  }

  // If not board and not owner, deny
  if (!isBoardMember && existing.pilot_id !== user.id) {
    return { data: null, error: 'You can only edit your own flightlog entries' }
  }

  // Validate times if they're being updated
  if (updates.block_on || updates.block_off || updates.takeoff_time || updates.landing_time) {
    const { data: current } = await supabase
      .from('flightlog')
      .select('block_on, block_off, takeoff_time, landing_time')
      .eq('id', id)
      .single()

    if (current) {
      const blockOn = new Date(updates.block_on || current.block_on)
      const blockOff = new Date(updates.block_off || current.block_off)
      const takeoffTime = new Date(updates.takeoff_time || current.takeoff_time)
      const landingTime = new Date(updates.landing_time || current.landing_time)

      if (blockOff <= blockOn) {
        return { data: null, error: 'Block off time must be after block on time' }
      }

      if (landingTime <= takeoffTime) {
        return { data: null, error: 'Landing time must be after takeoff time' }
      }

      if (takeoffTime < blockOn) {
        return { data: null, error: 'Takeoff time cannot be before block on time' }
      }

      if (landingTime > blockOff) {
        return { data: null, error: 'Landing time cannot be after block off time' }
      }
    }
  }

  // Update flightlog entry
  const { data, error } = await supabase
    .from('flightlog')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating flightlog:', error)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

export async function deleteFlightlog(id: string) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Check if user is board member (only board can delete)
  const { data: userProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const isBoardMember = userProfile?.role?.includes('board') || false

  if (!isBoardMember) {
    return { error: 'Only board members can delete flightlog entries' }
  }

  // Delete flightlog entry
  const { error } = await supabase
    .from('flightlog')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting flightlog:', error)
    return { error: error.message }
  }

  return { error: null }
}

export async function getAllUsers() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('users')
    .select('id, name, surname, email')
    .order('surname', { ascending: true })

  if (error) {
    console.error('Error fetching users:', error)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

export async function getActiveAircraftForFlightlog() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('planes')
    .select('id, tail_number, type')
    .eq('active', true)
    .order('tail_number', { ascending: true })

  if (error) {
    console.error('Error fetching aircraft:', error)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}
