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

export async function createFlightlog(entry: FlightlogInsert) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { data: null, error: 'Not authenticated' }
  }

  // Check if user is board member
  const { data: userProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const isBoardMember = userProfile?.role?.includes('board') || false

  // If not board member, pilot must be current user
  if (!isBoardMember && entry.pilot_id !== user.id) {
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

  // Insert flightlog entry
  const { data, error } = await supabase
    .from('flightlog')
    .insert(entry)
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
