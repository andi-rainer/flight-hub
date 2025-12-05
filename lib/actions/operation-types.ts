'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { OperationTypeInsert, OperationTypeUpdate } from '@/lib/types'

/**
 * Server actions for Operation Types Management
 * Handles CRUD operations for aircraft operation types and billing configuration
 */

// ============================================================================
// OPERATION TYPES MANAGEMENT
// ============================================================================

export async function createOperationType(data: Omit<OperationTypeInsert, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = await createClient()

  // Verify user is board member
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile?.role?.includes('board')) {
    return { success: false, error: 'Not authorized - board members only' }
  }

  // Check if operation type with this name already exists for this plane
  const { data: existing } = await supabase
    .from('operation_types')
    .select('id')
    .eq('plane_id', data.plane_id)
    .eq('name', data.name)
    .single()

  if (existing) {
    return { success: false, error: 'An operation type with this name already exists for this aircraft' }
  }

  // Create operation type
  const { data: newOperationType, error } = await supabase
    .from('operation_types')
    .insert(data)
    .select()
    .single()

  if (error) {
    console.error('Error creating operation type:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/members')
  revalidatePath('/flightlog')
  return { success: true, data: newOperationType }
}

export async function updateOperationType(id: string, data: OperationTypeUpdate) {
  const supabase = await createClient()

  // Verify user is board member
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile?.role?.includes('board')) {
    return { success: false, error: 'Not authorized - board members only' }
  }

  // Get the current operation type to check plane_id
  const { data: currentOpType } = await supabase
    .from('operation_types')
    .select('plane_id')
    .eq('id', id)
    .single()

  if (!currentOpType) {
    return { success: false, error: 'Operation type not found' }
  }

  // If name is being changed, check for conflicts
  if (data.name) {
    const { data: existing } = await supabase
      .from('operation_types')
      .select('id')
      .eq('plane_id', currentOpType.plane_id)
      .eq('name', data.name)
      .neq('id', id)
      .single()

    if (existing) {
      return { success: false, error: 'An operation type with this name already exists for this aircraft' }
    }
  }

  // Update operation type
  const { data: updatedOperationType, error } = await supabase
    .from('operation_types')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating operation type:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/members')
  revalidatePath('/flightlog')
  return { success: true, data: updatedOperationType }
}

export async function deleteOperationType(id: string) {
  const supabase = await createClient()

  // Verify user is board member
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile?.role?.includes('board')) {
    return { success: false, error: 'Not authorized - board members only' }
  }

  // Check if any flightlog entries use this operation type
  const { data: flightlogsWithOpType } = await supabase
    .from('flightlog')
    .select('id')
    .eq('operation_type_id', id)
    .limit(1)

  if (flightlogsWithOpType && flightlogsWithOpType.length > 0) {
    return {
      success: false,
      error: 'Cannot delete operation type - it is used in one or more flight log entries'
    }
  }

  // Delete operation type
  const { error } = await supabase
    .from('operation_types')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting operation type:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/members')
  revalidatePath('/flightlog')
  return { success: true }
}

// ============================================================================
// AIRCRAFT BILLING CONFIGURATION
// ============================================================================

export async function updateAircraftBillingConfig(planeId: string, data: {
  billing_unit?: 'hour' | 'minute'
  default_rate?: number
}) {
  const supabase = await createClient()

  // Verify user is board member
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile?.role?.includes('board')) {
    return { success: false, error: 'Not authorized - board members only' }
  }

  // Update aircraft billing configuration
  const { data: updatedPlane, error } = await supabase
    .from('planes')
    .update(data)
    .eq('id', planeId)
    .select()
    .single()

  if (error) {
    console.error('Error updating aircraft billing config:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/members')
  revalidatePath('/flightlog')
  return { success: true, data: updatedPlane }
}
