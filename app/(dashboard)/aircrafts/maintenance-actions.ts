'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type MaintenanceRecordInsert = {
  plane_id: string
  performed_at: string
  performed_at_hours: number
  maintenance_type: string
  description?: string | null
  next_due_hours?: number | null
  cost?: number | null
  vendor?: string | null
  notes?: string | null
  tach_hours?: number | null
  hobbs_hours?: number | null
}

export type MaintenanceRecordUpdate = {
  performed_at?: string
  performed_at_hours?: number
  maintenance_type?: string
  description?: string | null
  next_due_hours?: number | null
  cost?: number | null
  vendor?: string | null
  notes?: string | null
  tach_hours?: number | null
  hobbs_hours?: number | null
}

/**
 * Check if the current user is a board member
 */
async function checkBoardMemberAccess(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role?.includes('board') ?? false
}

/**
 * Get maintenance history for an aircraft
 * @param planeId - Aircraft ID
 * @param limit - Optional limit for number of records
 */
export async function getMaintenanceHistory(planeId: string, limit?: number) {
  const supabase = await createClient()

  let query = supabase
    .from('maintenance_records')
    .select(`
      *,
      performed_by_user:users!maintenance_records_performed_by_fkey(id, name, surname)
    `)
    .eq('plane_id', planeId)
    .order('performed_at', { ascending: false })

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching maintenance history:', error)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

/**
 * Create a new maintenance record (board members only)
 */
export async function createMaintenanceRecord(data: MaintenanceRecordInsert) {
  const isBoardMember = await checkBoardMemberAccess()

  if (!isBoardMember) {
    return { data: null, error: 'Unauthorized: Only board members can create maintenance records' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: 'Unauthorized' }
  }

  // Insert maintenance record
  const { data: record, error } = await supabase
    .from('maintenance_records')
    .insert({
      ...data,
      performed_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating maintenance record:', error)
    return { data: null, error: error.message }
  }

  // If next_due_hours is provided, update the plane's next_maintenance_hours
  if (data.next_due_hours) {
    const { error: updateError } = await supabase
      .from('planes')
      .update({ next_maintenance_hours: data.next_due_hours })
      .eq('id', data.plane_id)

    if (updateError) {
      console.error('Error updating plane maintenance schedule:', updateError)
      // Don't fail the whole operation, just log the error
    }
  }

  revalidatePath('/aircrafts')
  revalidatePath(`/aircrafts/${data.plane_id}`)
  return { data: record, error: null }
}

/**
 * Update a maintenance record (board members only)
 */
export async function updateMaintenanceRecord(id: string, planeId: string, data: MaintenanceRecordUpdate) {
  const isBoardMember = await checkBoardMemberAccess()

  if (!isBoardMember) {
    return { data: null, error: 'Unauthorized: Only board members can update maintenance records' }
  }

  const supabase = await createClient()

  const { data: record, error } = await supabase
    .from('maintenance_records')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating maintenance record:', error)
    return { data: null, error: error.message }
  }

  // If next_due_hours is updated, also update the plane
  if (data.next_due_hours !== undefined) {
    const { error: updateError } = await supabase
      .from('planes')
      .update({ next_maintenance_hours: data.next_due_hours })
      .eq('id', planeId)

    if (updateError) {
      console.error('Error updating plane maintenance schedule:', updateError)
    }
  }

  revalidatePath('/aircrafts')
  revalidatePath(`/aircrafts/${planeId}`)
  return { data: record, error: null }
}

/**
 * Delete a maintenance record (board members only)
 */
export async function deleteMaintenanceRecord(id: string, planeId: string) {
  const isBoardMember = await checkBoardMemberAccess()

  if (!isBoardMember) {
    return { error: 'Unauthorized: Only board members can delete maintenance records' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('maintenance_records')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting maintenance record:', error)
    return { error: error.message }
  }

  revalidatePath('/aircrafts')
  revalidatePath(`/aircrafts/${planeId}`)
  return { error: null }
}

/**
 * Update aircraft maintenance schedule (board members only)
 * @param planeId - Aircraft ID
 * @param nextDueHours - Aircraft hours when next maintenance is due
 * @param intervalHours - Standard maintenance interval in hours
 */
export async function updateMaintenanceSchedule(
  planeId: string,
  nextDueHours: number | null,
  intervalHours?: number | null
) {
  const isBoardMember = await checkBoardMemberAccess()

  if (!isBoardMember) {
    return { error: 'Unauthorized: Only board members can update maintenance schedules' }
  }

  const supabase = await createClient()

  const updateData: { next_maintenance_hours: number | null; maintenance_interval_hours?: number } = {
    next_maintenance_hours: nextDueHours,
  }

  if (intervalHours !== undefined) {
    updateData.maintenance_interval_hours = intervalHours
  }

  const { data, error } = await supabase
    .from('planes')
    .update(updateData)
    .eq('id', planeId)
    .select()
    .single()

  if (error) {
    console.error('Error updating maintenance schedule:', error)
    return { data: null, error: error.message }
  }

  revalidatePath('/aircrafts')
  revalidatePath(`/aircrafts/${planeId}`)
  return { data, error: null }
}

/**
 * Get aircraft with maintenance status
 * @param planeId - Optional aircraft ID for single aircraft
 */
export async function getAircraftWithMaintenance(planeId?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('aircraft_with_maintenance')
    .select('*')
    .order('tail_number', { ascending: true })

  if (planeId) {
    query = query.eq('id', planeId).single()
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching aircraft with maintenance:', error)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}
