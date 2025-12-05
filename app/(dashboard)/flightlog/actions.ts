'use server'

import { createClient } from '@/lib/supabase/server'
import { requirePermission, getCurrentUserWithFunctions, hasPermission } from '@/lib/permissions'
import type { FlightlogInsert, FlightlogUpdate } from '@/lib/types'

export type FlightWarning = {
  type: 'location_disconnect' | 'flight_overlap' | 'excessive_ground_time'
  message: string
  severity: 'warning'
}

export type FlightWarningCheckResult = {
  warnings: FlightWarning[]
  hasWarnings: boolean
}

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

export async function createFlightlog(
  entry: FlightlogInsert,
  overrideWarnings: boolean = false,
  warnings: FlightWarning[] = []
) {
  const supabase = await createClient()

  // Check permission to create flight log
  const { user, error: permError } = await requirePermission(supabase, 'flight.log.create')
  if (permError || !user) {
    return { data: null, error: permError || 'Not authenticated' }
  }

  // Board members can create for anyone, others can only create for themselves
  const canCreateForOthers = hasPermission(user, 'flight.log.edit.any')

  if (!canCreateForOthers && entry.pilot_id !== user.id) {
    return { data: null, error: 'You can only create flightlog entries for yourself' }
  }

  // Validate times - Chronological order: Block Off ≤ Takeoff ≤ Landing ≤ Block On
  const blockOff = new Date(entry.block_off)
  const takeoffTime = new Date(entry.takeoff_time)
  const landingTime = new Date(entry.landing_time)
  const blockOn = new Date(entry.block_on)

  if (takeoffTime < blockOff) {
    return { data: null, error: 'Takeoff time must be after or at Block Off time' }
  }

  if (landingTime < takeoffTime) {
    return { data: null, error: 'Landing time must be after or at takeoff time' }
  }

  if (blockOn < landingTime) {
    return { data: null, error: 'Block On time must be after or at landing time' }
  }

  // Check for pilot/crew conflict
  if (entry.copilot_id && entry.copilot_id === entry.pilot_id) {
    return { data: null, error: 'Additional crewmember cannot be the same as pilot' }
  }

  // Insert flightlog entry with needs_board_review flag set based on overrideWarnings
  const { data, error } = await supabase
    .from('flightlog')
    .insert({
      ...entry,
      needs_board_review: overrideWarnings
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating flightlog:', error)
    return { data: null, error: error.message }
  }

  // If warnings were overridden, create notifications for board members
  if (overrideWarnings && data) {
    const { data: boardMembers } = await getBoardMembers()

    if (boardMembers && boardMembers.length > 0) {
      // Get aircraft details
      const { data: aircraft } = await supabase
        .from('planes')
        .select('tail_number')
        .eq('id', entry.plane_id)
        .single()

      const tailNumber = aircraft?.tail_number || 'Unknown'

      // Create notification message
      const warningMessages = warnings.map(w => w.message).join('; ')
      const notificationMessage = `Flight entry for ${tailNumber} created with warnings: ${warningMessages}`

      // Create notifications for all board members using the RPC function
      // This bypasses RLS to allow non-board members to create notifications
      for (const member of boardMembers) {
        const { error: notificationError } = await supabase.rpc('create_notification', {
          p_user_id: member.id,
          p_type: 'flight_warning',
          p_title: 'Flight Entry Needs Review',
          p_message: notificationMessage,
          p_link: `/flightlog/${entry.plane_id}`,
          p_flightlog_id: data.id
        })

        if (notificationError) {
          console.error('Error creating notification for board member:', notificationError)
          // Don't fail the flight creation if notifications fail
        }
      }
    }
  }

  return { data, error: null }
}

export async function updateFlightlog(id: string, updates: FlightlogUpdate) {
  const supabase = await createClient()

  // Get current user with functions
  const user = await getCurrentUserWithFunctions(supabase)
  if (!user) {
    return { data: null, error: 'Not authenticated' }
  }

  // Get existing flightlog entry to check permissions
  const { data: existing, error: fetchError } = await supabase
    .from('flightlog')
    .select('locked, charged, pilot_id, copilot_id')
    .eq('id', id)
    .single()

  if (fetchError) {
    return { data: null, error: 'Flightlog entry not found' }
  }

  // Use the permission system's canEditFlightLog function
  const { canEditFlightLog } = await import('@/lib/permissions')
  if (!canEditFlightLog(user, existing)) {
    return { data: null, error: 'You do not have permission to edit this flightlog entry' }
  }

  // Validate times if they're being updated - Chronological order: Block Off ≤ Takeoff ≤ Landing ≤ Block On
  if (updates.block_on || updates.block_off || updates.takeoff_time || updates.landing_time) {
    const { data: current } = await supabase
      .from('flightlog')
      .select('block_on, block_off, takeoff_time, landing_time')
      .eq('id', id)
      .single()

    if (current) {
      const blockOff = new Date(updates.block_off || current.block_off)
      const takeoffTime = new Date(updates.takeoff_time || current.takeoff_time)
      const landingTime = new Date(updates.landing_time || current.landing_time)
      const blockOn = new Date(updates.block_on || current.block_on)

      if (takeoffTime < blockOff) {
        return { data: null, error: 'Takeoff time must be after or at Block Off time' }
      }

      if (landingTime < takeoffTime) {
        return { data: null, error: 'Landing time must be after or at takeoff time' }
      }

      if (blockOn < landingTime) {
        return { data: null, error: 'Block On time must be after or at landing time' }
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

  // Get today's date for comparison
  const today = new Date().toISOString().split('T')[0]

  // Get all users with their active memberships
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, name, surname, email, role')
    .order('surname', { ascending: true })

  if (usersError) {
    console.error('Error fetching users:', usersError)
    return { data: null, error: usersError.message }
  }

  // Get active memberships for all users
  const { data: memberships, error: membershipsError } = await supabase
    .from('user_memberships')
    .select('user_id, end_date')
    .eq('status', 'active')
    .gte('end_date', today)

  if (membershipsError) {
    console.error('Error fetching memberships:', membershipsError)
    return { data: null, error: membershipsError.message }
  }

  // Create a set of user IDs with active memberships
  const activeUserIds = new Set(memberships?.map(m => m.user_id) || [])

  // Filter to only include users with active memberships or board members
  const activeUsers = users.filter(user =>
    activeUserIds.has(user.id) || user.role?.includes('board')
  )

  // Remove role field from response (not needed in UI)
  const sanitizedUsers = activeUsers.map(({ role: _role, ...user }) => user)

  return { data: sanitizedUsers, error: null }
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

export async function getOperationTypesForPlane(planeId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('operation_types')
    .select('*')
    .eq('plane_id', planeId)
    .order('is_default', { ascending: false })
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching operation types:', error)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

export async function checkFlightWarnings(
  planeId: string,
  blockOff: string,
  blockOn: string,
  takeoffTime: string,
  landingTime: string,
  icaoDeparture: string | null,
  _icaoDestination: string | null
): Promise<{ data: FlightWarningCheckResult | null; error: string | null }> {
  const supabase = await createClient()

  const warnings: FlightWarning[] = []

  // Parse dates
  const newBlockOff = new Date(blockOff)
  const newBlockOn = new Date(blockOn)
  const newTakeoffTime = new Date(takeoffTime)
  const newLandingTime = new Date(landingTime)

  // Get the flight date (from block_off)
  const flightDate = new Date(newBlockOff)
  flightDate.setHours(0, 0, 0, 0)

  // Get previous day start/end
  const previousDayStart = new Date(flightDate)
  previousDayStart.setDate(previousDayStart.getDate() - 1)
  previousDayStart.setHours(0, 0, 0, 0)

  const currentDayEnd = new Date(flightDate)
  currentDayEnd.setDate(currentDayEnd.getDate() + 1)
  currentDayEnd.setHours(23, 59, 59, 999)

  // 1. Check for excessive ground time (>45 minutes)
  const GROUND_TIME_THRESHOLD_MINUTES = 45

  // Check block-off to takeoff time
  const preFlightGroundTimeMinutes = (newTakeoffTime.getTime() - newBlockOff.getTime()) / (1000 * 60)
  if (preFlightGroundTimeMinutes > GROUND_TIME_THRESHOLD_MINUTES) {
    const roundedMinutes = Math.round(preFlightGroundTimeMinutes)
    warnings.push({
      type: 'excessive_ground_time',
      message: `Excessive pre-flight ground time: ${roundedMinutes} minutes between Block Off and Takeoff (threshold: ${GROUND_TIME_THRESHOLD_MINUTES} minutes)`,
      severity: 'warning'
    })
  }

  // Check landing to block-on time
  const postFlightGroundTimeMinutes = (newBlockOn.getTime() - newLandingTime.getTime()) / (1000 * 60)
  if (postFlightGroundTimeMinutes > GROUND_TIME_THRESHOLD_MINUTES) {
    const roundedMinutes = Math.round(postFlightGroundTimeMinutes)
    warnings.push({
      type: 'excessive_ground_time',
      message: `Excessive post-flight ground time: ${roundedMinutes} minutes between Landing and Block On (threshold: ${GROUND_TIME_THRESHOLD_MINUTES} minutes)`,
      severity: 'warning'
    })
  }

  // 2. Check for location disconnect - get the most recent flight for this aircraft before the new flight
  if (icaoDeparture) {
    const { data: previousFlights, error: prevFlightError } = await supabase
      .from('flightlog')
      .select('icao_destination, block_on, landing_time')
      .eq('plane_id', planeId)
      .lt('block_off', newBlockOff.toISOString())
      .order('block_on', { ascending: false })
      .limit(1)

    if (prevFlightError) {
      console.error('Error checking previous flights:', prevFlightError)
      return { data: null, error: 'Failed to check previous flights' }
    }

    if (previousFlights && previousFlights.length > 0) {
      const lastFlight = previousFlights[0]
      const lastDestination = lastFlight.icao_destination

      // Check if there's a location mismatch
      if (lastDestination && lastDestination !== icaoDeparture) {
        warnings.push({
          type: 'location_disconnect',
          message: `Location disconnect: Previous flight landed at ${lastDestination} but new flight departs from ${icaoDeparture}`,
          severity: 'warning'
        })
      }
    }
  }

  // 3. Check for flight overlap - check if this flight's time overlaps with any existing flight for the same aircraft on the same day
  const { data: overlappingFlights, error: overlapError } = await supabase
    .from('flightlog')
    .select('id, block_off, block_on')
    .eq('plane_id', planeId)
    .gte('block_off', flightDate.toISOString())
    .lt('block_off', currentDayEnd.toISOString())

  if (overlapError) {
    console.error('Error checking overlapping flights:', overlapError)
    return { data: null, error: 'Failed to check for overlapping flights' }
  }

  if (overlappingFlights && overlappingFlights.length > 0) {
    // Check each flight for time overlap
    for (const flight of overlappingFlights) {
      const existingBlockOff = new Date(flight.block_off)
      const existingBlockOn = new Date(flight.block_on)

      // Check if times overlap: new flight starts before existing ends AND new flight ends after existing starts
      const hasOverlap =
        newBlockOff < existingBlockOn && newBlockOn > existingBlockOff

      if (hasOverlap) {
        const overlapDate = new Date(existingBlockOff).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
        warnings.push({
          type: 'flight_overlap',
          message: `Flight overlap detected with another flight on ${overlapDate}`,
          severity: 'warning'
        })
        break // Only report one overlap warning
      }
    }
  }

  return {
    data: {
      warnings,
      hasWarnings: warnings.length > 0
    },
    error: null
  }
}

export async function getBoardMembers() {
  const supabase = await createClient()

  // Filter users where role array overlaps with ['board']
  // This gets all users who have 'board' in their role array
  const { data, error } = await supabase
    .from('users')
    .select('id, name, surname, email')
    .overlaps('role', ['board'])
    .not('email', 'like', '%@deleted.local') // Exclude deleted users

  if (error) {
    console.error('Error fetching board members:', error)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

export async function getPreviousFlightDestination(planeId: string): Promise<{ data: string | null; error: string | null }> {
  const supabase = await createClient()

  // Get the most recent flight for this aircraft
  const { data, error } = await supabase
    .from('flightlog')
    .select('icao_destination, block_on')
    .eq('plane_id', planeId)
    .order('block_on', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    // If no previous flights found, that's okay - return null
    if (error.code === 'PGRST116') {
      return { data: null, error: null }
    }
    console.error('Error fetching previous flight:', error)
    return { data: null, error: error.message }
  }

  return { data: data?.icao_destination || null, error: null }
}

export async function markFlightlogAsReviewed(flightlogId: string) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Check if user is board member
  const { data: userProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const isBoardMember = userProfile?.role?.includes('board') || false

  if (!isBoardMember) {
    return { error: 'Only board members can mark flight entries as reviewed' }
  }

  // Update flightlog entry to clear needs_board_review flag
  const { error: updateError } = await supabase
    .from('flightlog')
    .update({ needs_board_review: false })
    .eq('id', flightlogId)

  if (updateError) {
    console.error('Error updating flightlog:', updateError)
    return { error: 'Failed to mark flightlog as reviewed' }
  }

  // Mark all notifications associated with this flightlog as read
  const { error: notificationError } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('flightlog_id', flightlogId)

  if (notificationError) {
    console.error('Error updating notifications:', notificationError)
    // Don't fail the operation if notification update fails
  }

  return { error: null }
}

export async function uploadMassAndBalanceDocument(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const file = formData.get('file') as File
  const planeId = formData.get('planeId') as string
  const flightlogId = formData.get('flightlogId') as string | null

  if (!file || !planeId) {
    return { error: 'Missing required fields' }
  }

  // Validate file type (PDF or Image)
  const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!validTypes.includes(file.type)) {
    return { error: 'Invalid file type. Only PDF and images are allowed.' }
  }

  // Upload to Supabase Storage
  const fileExt = file.name.split('.').pop()
  const timestamp = Date.now()
  const fileName = `mb-${planeId}-${timestamp}.${fileExt}`
  const filePath = `mass-and-balance/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('club-documents')
    .upload(filePath, file)

  if (uploadError) {
    return { error: `Upload failed: ${uploadError.message}` }
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('club-documents')
    .getPublicUrl(filePath)

  // Get plane tail number for document name
  const { data: plane } = await supabase
    .from('planes')
    .select('tail_number')
    .eq('id', planeId)
    .single()

  // Create database record in documents table
  const { data: document, error: dbError } = await supabase
    .from('documents')
    .insert({
      name: `M&B - ${plane?.tail_number || 'Unknown'} - ${new Date().toLocaleDateString()}`,
      category: 'Mass & Balance',
      tags: ['mass-and-balance', 'flight-preparation'],
      file_url: publicUrl,
      uploaded_by: user.id,
      plane_id: planeId,
      user_id: null,
      approved: true,
    })
    .select()
    .single()

  if (dbError) {
    // Cleanup uploaded file
    await supabase.storage.from('club-documents').remove([filePath])
    return { error: `Database error: ${dbError.message}` }
  }

  // Update flightlog entry if flightlogId is provided
  if (flightlogId) {
    const { error: updateError } = await supabase
      .from('flightlog')
      .update({ m_and_b_pdf_url: publicUrl })
      .eq('id', flightlogId)

    if (updateError) {
      console.error('Error updating flightlog:', updateError)
    }
  }

  return { data: { url: publicUrl, documentId: document.id }, error: null }
}
