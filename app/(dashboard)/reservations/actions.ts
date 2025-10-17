'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getUserProfile } from '@/lib/supabase/server'
import type { ReservationInsert, ReservationUpdate } from '@/lib/database.types'

/**
 * Check if user has valid and approved license and medical documents
 */
async function hasValidDocuments(userId: string): Promise<{ valid: boolean; message?: string }> {
  const supabase = await createClient()

  const { data: documents, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', userId)
    .eq('approved', true)
    .in('category', ['license', 'medical'])
    .gte('expiry_date', new Date().toISOString())

  if (error) {
    return { valid: false, message: 'Failed to check documents' }
  }

  const hasLicense = documents.some(doc => doc.category === 'license')
  const hasMedical = documents.some(doc => doc.category === 'medical')

  if (!hasLicense) {
    return { valid: false, message: 'Valid and approved license document required' }
  }

  if (!hasMedical) {
    return { valid: false, message: 'Valid and approved medical document required' }
  }

  return { valid: true }
}

/**
 * Check if aircraft can be reserved (no expired blocking documents)
 */
async function canReserveAircraft(planeId: string): Promise<{ valid: boolean; message?: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('can_reserve_aircraft', {
    p_plane_id: planeId
  })

  if (error) {
    return { valid: false, message: 'Failed to check aircraft availability' }
  }

  if (!data) {
    return { valid: false, message: 'Aircraft has expired blocking documents and cannot be reserved' }
  }

  return { valid: true }
}

/**
 * Get conflicting active reservations (for checking or bumping)
 */
async function getConflictingReservations(
  planeId: string,
  startTime: string,
  endTime: string,
  excludeReservationId?: string
) {
  const supabase = await createClient()

  let query = supabase
    .from('reservations')
    .select('id, user_id, start_time, end_time, status, priority, users!reservations_user_id_fkey(name, surname)')
    .eq('plane_id', planeId)
    .eq('status', 'active') // Only check active reservations
    .or(`and(start_time.lt.${endTime},end_time.gt.${startTime})`)

  // Exclude current reservation when editing
  if (excludeReservationId) {
    query = query.neq('id', excludeReservationId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error checking conflicts:', error)
    return { data: [], error }
  }

  return { data: data || [], error: null }
}

/**
 * Get all reservations (including standby and cancelled)
 */
export async function getReservations() {
  const supabase = await createClient()

  // Get all reservations with user and plane info
  const { data, error } = await supabase
    .from('reservations')
    .select(`
      *,
      users!reservations_user_id_fkey(name, surname, email),
      planes!reservations_plane_id_fkey(tail_number, type, color)
    `)
    .order('start_time', { ascending: true })

  if (error) {
    console.error('Error fetching reservations:', error)
    return { error: error.message }
  }

  // Transform to match ActiveReservation format
  const transformed = data?.map(r => ({
    ...r,
    user_name: (r.users as any)?.name || '',
    user_surname: (r.users as any)?.surname || '',
    user_email: (r.users as any)?.email || '',
    tail_number: (r.planes as any)?.tail_number || '',
    plane_type: (r.planes as any)?.type || '',
    plane_color: (r.planes as any)?.color || null,
    duration_hours: null,
  }))

  return { data: transformed }
}

/**
 * Get reservations for a specific aircraft
 */
export async function getReservationsByAircraft(planeId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('active_reservations')
    .select('*')
    .eq('plane_id', planeId)
    .order('start_time', { ascending: true })

  if (error) {
    console.error('Error fetching reservations:', error)
    return { error: error.message }
  }

  return { data }
}

/**
 * Create a new reservation
 */
export async function createReservation(reservation: Omit<ReservationInsert, 'user_id' | 'status'>) {
  const userProfile = await getUserProfile()

  if (!userProfile) {
    return { error: 'Not authenticated' }
  }

  const isBoardMember = userProfile.role?.includes('board')

  // Validate user documents (board members are exempt)
  if (!isBoardMember) {
    const documentCheck = await hasValidDocuments(userProfile.id)
    if (!documentCheck.valid) {
      return { error: documentCheck.message }
    }
  }

  // Validate aircraft availability
  const aircraftCheck = await canReserveAircraft(reservation.plane_id)
  if (!aircraftCheck.valid) {
    return { error: aircraftCheck.message }
  }

  const supabase = await createClient()

  // Check for conflicting active reservations
  const { data: conflicts } = await getConflictingReservations(
    reservation.plane_id,
    reservation.start_time,
    reservation.end_time
  )

  // Determine status based on conflicts and priority
  let status: 'active' | 'standby' = 'active'

  if (conflicts && conflicts.length > 0) {
    // If this is a priority reservation (board member only), bump conflicts to standby
    if (reservation.priority && isBoardMember) {
      // Move all conflicting reservations to standby
      const conflictIds = conflicts.map(c => c.id)
      await supabase
        .from('reservations')
        .update({ status: 'standby' })
        .in('id', conflictIds)

      status = 'active' // Priority reservation gets active status
    } else {
      // Non-priority reservation with conflicts becomes standby
      status = 'standby'
    }
  }

  // Create the reservation
  const { data, error } = await supabase
    .from('reservations')
    .insert({
      ...reservation,
      user_id: userProfile.id,
      status,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating reservation:', error)
    return { error: error.message }
  }

  revalidatePath('/reservations')
  revalidatePath('/')

  return { data, warning: status === 'standby' ? 'Reservation created as standby due to conflict with existing reservation' : undefined }
}

/**
 * Update an existing reservation
 */
export async function updateReservation(id: string, updates: ReservationUpdate) {
  const userProfile = await getUserProfile()

  if (!userProfile) {
    return { error: 'Not authenticated' }
  }

  const supabase = await createClient()

  // Get existing reservation
  const { data: existing, error: fetchError } = await supabase
    .from('reservations')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return { error: 'Reservation not found' }
  }

  // Check permissions (only owner or board member can edit)
  const isBoardMember = userProfile.role?.includes('board')
  const isOwner = existing.user_id === userProfile.id

  if (!isOwner && !isBoardMember) {
    return { error: 'Not authorized to update this reservation' }
  }

  // If changing aircraft, validate new aircraft
  if (updates.plane_id && updates.plane_id !== existing.plane_id) {
    const aircraftCheck = await canReserveAircraft(updates.plane_id)
    if (!aircraftCheck.valid) {
      return { error: aircraftCheck.message }
    }
  }

  // If changing time or aircraft, re-evaluate status based on conflicts
  let finalUpdates = { ...updates }
  let warning: string | undefined

  if (updates.start_time || updates.end_time || updates.plane_id) {
    const planeId = updates.plane_id || existing.plane_id
    const startTime = updates.start_time || existing.start_time
    const endTime = updates.end_time || existing.end_time

    const { data: conflicts } = await getConflictingReservations(planeId, startTime, endTime, id)

    if (conflicts && conflicts.length > 0) {
      // If this is a priority reservation, bump conflicts to standby
      if ((updates.priority !== undefined ? updates.priority : existing.priority) && isBoardMember) {
        const conflictIds = conflicts.map(c => c.id)
        await supabase
          .from('reservations')
          .update({ status: 'standby' })
          .in('id', conflictIds)

        finalUpdates = { ...finalUpdates, status: 'active' }
      } else {
        // Non-priority with conflicts becomes standby
        finalUpdates = { ...finalUpdates, status: 'standby' }
        warning = 'Reservation moved to standby due to conflict with existing reservation'
      }
    } else {
      // No conflicts, make it active if it was standby
      if (existing.status === 'standby') {
        finalUpdates = { ...finalUpdates, status: 'active' }
      }
    }
  }

  const { data, error } = await supabase
    .from('reservations')
    .update(finalUpdates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating reservation:', error)
    return { error: error.message }
  }

  revalidatePath('/reservations')
  revalidatePath('/')

  return { data, warning }
}

/**
 * Delete a reservation (or cancel it)
 */
export async function deleteReservation(id: string) {
  const userProfile = await getUserProfile()

  if (!userProfile) {
    return { error: 'Not authenticated' }
  }

  const supabase = await createClient()

  // Get existing reservation
  const { data: existing, error: fetchError } = await supabase
    .from('reservations')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return { error: 'Reservation not found' }
  }

  // Check permissions
  const isBoardMember = userProfile.role?.includes('board')
  const isOwner = existing.user_id === userProfile.id

  if (!isOwner && !isBoardMember) {
    return { error: 'Not authorized to delete this reservation' }
  }

  // Instead of deleting, mark as cancelled (better for audit trail)
  const { error } = await supabase
    .from('reservations')
    .update({ status: 'cancelled' })
    .eq('id', id)

  if (error) {
    console.error('Error cancelling reservation:', error)
    return { error: error.message }
  }

  revalidatePath('/reservations')
  revalidatePath('/')

  return { success: true }
}

/**
 * Get all active aircraft for reservation dropdown
 */
export async function getActiveAircraft() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('planes')
    .select('id, tail_number, type, color')
    .eq('active', true)
    .order('tail_number', { ascending: true })

  if (error) {
    console.error('Error fetching aircraft:', error)
    return { error: error.message }
  }

  return { data }
}
