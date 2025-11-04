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

export async function addCostCenterTransaction(data: {
  costCenterId: string
  amount: number
  description: string
  created_at?: string
}) {
  const auth = await verifyBoardMember()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  const { data: transaction, error } = await auth.supabase
    .from('cost_center_transactions')
    .insert({
      cost_center_id: data.costCenterId,
      amount: data.amount,
      description: data.description,
      created_by: auth.userId,
      ...(data.created_at && { created_at: data.created_at }),
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding cost center transaction:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/accounting')
  return { success: true, data: transaction }
}

// ============================================================================
// MANUAL ADJUSTMENTS FOR COST CENTERS
// ============================================================================

export async function addCostCenterCredit(data: {
  costCenterId: string
  amount: number
  description: string,
  transactionDate: string,
  created_at: string
}) {
  const auth = await verifyBoardMember()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  if (data.amount <= 0) {
    return { success: false, error: 'Credit amount must be positive' }
  }

  return await addCostCenterTransaction({
    costCenterId: data.costCenterId,
    amount: Math.abs(data.amount), // Positive for credit
    description: data.description,
    ...(data.created_at && { created_at: data.created_at }),
  })
}

export async function addCostCenterCharge(data: {
  costCenterId: string
  amount: number
  description: string
  created_at?: string
}) {
  const auth = await verifyBoardMember()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  if (data.amount <= 0) {
    return { success: false, error: 'Charge amount must be positive' }
  }

  return await addCostCenterTransaction({
    costCenterId: data.costCenterId,
    amount: -Math.abs(data.amount), // Negative for charge/cost
    description: data.description,
    ...(data.created_at && { created_at: data.created_at }),
  })
}

export async function addCostCenterAdjustment(data: {
  costCenterId: string
  amount: number
  description: string
  created_at?: string
}) {
  const auth = await verifyBoardMember()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  return await addCostCenterTransaction({
    costCenterId: data.costCenterId,
    amount: data.amount, // Can be positive or negative
    description: data.description,
    ...(data.created_at && { created_at: data.created_at }),
  })
}

// ============================================================================
// REVERSE FLIGHT CHARGES
// ============================================================================

export async function reverseCostCenterFlightCharge(transactionId: string) {
  const auth = await verifyBoardMember()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  // Get the original transaction
  const { data: originalTx, error: fetchError } = await auth.supabase
    .from('cost_center_transactions')
    .select(`
      *,
      cost_center:cost_centers(id, name),
      flight:flightlog!cost_center_transactions_flightlog_id_fkey(
        id,
        charged,
        locked,
        block_off,
        block_on,
        plane:planes(tail_number)
      )
    `)
    .eq('id', transactionId)
    .single()

  if (fetchError || !originalTx) {
    console.error('Error fetching original transaction:', fetchError)
    return { success: false, error: 'Transaction not found' }
  }

  // Verify this transaction is linked to a flight
  if (!originalTx.flightlog_id) {
    return { success: false, error: 'This transaction is not linked to a flight' }
  }

  // Check if already reversed
  const { data: existingReversal } = await auth.supabase
    .from('cost_center_transactions')
    .select('id')
    .eq('reverses_transaction_id', transactionId)
    .single()

  if (existingReversal) {
    return { success: false, error: 'This transaction has already been reversed' }
  }

  // Create reverse transaction
  const reverseAmount = -originalTx.amount
  const { data: reverseTx, error: reverseError } = await auth.supabase
    .from('cost_center_transactions')
    .insert({
      cost_center_id: originalTx.cost_center_id,
      amount: reverseAmount,
      description: `REVERSAL: ${originalTx.description}`,
      created_by: auth.userId,
      reverses_transaction_id: transactionId,
    })
    .select()
    .single()

  if (reverseError) {
    console.error('Error creating reverse transaction:', reverseError)
    return { success: false, error: reverseError.message }
  }

  // Unlock and uncharge the flight
  const { error: unlockError } = await auth.supabase
    .from('flightlog')
    .update({
      charged: false,
      locked: false,
      charged_by: null,
      charged_at: null,
    })
    .eq('id', originalTx.flightlog_id)

  if (unlockError) {
    console.error('Error unlocking flight:', unlockError)
    // Try to delete the reverse transaction since flight unlock failed
    await auth.supabase.from('cost_center_transactions').delete().eq('id', reverseTx.id)
    return { success: false, error: 'Failed to unlock flight: ' + unlockError.message }
  }

  revalidatePath('/accounting')
  revalidatePath('/billing')
  return {
    success: true,
    data: reverseTx,
    message: 'Flight charge reversed and flight unlocked for re-charging'
  }
}
