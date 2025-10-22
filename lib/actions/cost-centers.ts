'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { CostCenterInsert, CostCenterUpdate } from '@/lib/database.types'

/**
 * Server actions for Cost Centers management
 * Handles cost center CRUD operations (board members only)
 */

// ============================================================================
// AUTHORIZATION HELPER
// ============================================================================

async function verifyBoardMember() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { authorized: false, error: 'Not authenticated' }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile?.role?.includes('board')) {
    return { authorized: false, error: 'Not authorized - board members only' }
  }

  return { authorized: true, supabase, userId: user.id }
}

// ============================================================================
// COST CENTER MANAGEMENT
// ============================================================================

export async function getCostCenters() {
  const auth = await verifyBoardMember()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  const { data, error } = await auth.supabase
    .from('cost_centers')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching cost centers:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

export async function getActiveCostCenters() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('cost_centers')
    .select('*')
    .eq('active', true)
    .order('name')

  if (error) {
    console.error('Error fetching active cost centers:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

export async function createCostCenter(data: CostCenterInsert) {
  const auth = await verifyBoardMember()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  // Check if name already exists
  const { data: existing } = await auth.supabase
    .from('cost_centers')
    .select('id')
    .eq('name', data.name)
    .single()

  if (existing) {
    return { success: false, error: 'A cost center with this name already exists' }
  }

  const { data: costCenter, error } = await auth.supabase
    .from('cost_centers')
    .insert(data)
    .select()
    .single()

  if (error) {
    console.error('Error creating cost center:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/billing')
  return { success: true, data: costCenter }
}

export async function updateCostCenter(id: string, data: CostCenterUpdate) {
  const auth = await verifyBoardMember()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  // If updating name, check if it already exists
  if (data.name) {
    const { data: existing } = await auth.supabase
      .from('cost_centers')
      .select('id')
      .eq('name', data.name)
      .neq('id', id)
      .single()

    if (existing) {
      return { success: false, error: 'A cost center with this name already exists' }
    }
  }

  const { data: costCenter, error } = await auth.supabase
    .from('cost_centers')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating cost center:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/billing')
  return { success: true, data: costCenter }
}

export async function deleteCostCenter(id: string) {
  const auth = await verifyBoardMember()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  // Check if cost center has transactions
  const { data: transactions } = await auth.supabase
    .from('cost_center_transactions')
    .select('id')
    .eq('cost_center_id', id)
    .limit(1)

  if (transactions && transactions.length > 0) {
    return {
      success: false,
      error: 'Cannot delete cost center with existing transactions. Consider deactivating it instead.'
    }
  }

  // Check if cost center is used as default in operation types
  const { data: operationTypes } = await auth.supabase
    .from('operation_types')
    .select('id, name')
    .eq('default_cost_center_id', id)
    .limit(1)

  if (operationTypes && operationTypes.length > 0) {
    return {
      success: false,
      error: 'Cannot delete cost center that is set as default for operation types. Please update those operation types first.'
    }
  }

  const { error } = await auth.supabase
    .from('cost_centers')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting cost center:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/billing')
  return { success: true, message: 'Cost center deleted successfully' }
}

export async function toggleCostCenterActive(id: string, active: boolean) {
  const auth = await verifyBoardMember()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  const { data: costCenter, error } = await auth.supabase
    .from('cost_centers')
    .update({ active })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error toggling cost center active status:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/billing')
  return { success: true, data: costCenter }
}

// ============================================================================
// COST CENTER TRANSACTIONS
// ============================================================================

export async function getCostCenterTransactions(costCenterId?: string) {
  const auth = await verifyBoardMember()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  let query = auth.supabase
    .from('cost_center_transactions')
    .select(`
      *,
      cost_center:cost_centers(id, name),
      flight:flightlog(id, block_off, block_on, plane_id),
      created_by_user:users!cost_center_transactions_created_by_fkey(id, name, surname)
    `)
    .order('created_at', { ascending: false })

  if (costCenterId) {
    query = query.eq('cost_center_id', costCenterId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching cost center transactions:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}
