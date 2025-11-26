'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { AccountInsert, AccountUpdate } from '@/lib/database.types'

/**
 * Server actions for User Accounts management
 *
 * Handles:
 * - Viewing user balances and transactions
 * - Manual account adjustments (board members only)
 * - FLIGHT CHARGE REVERSALS (reverseFlightCharge function)
 *
 * NOTE: Flight charge reversals in this file handle split charges by reversing
 * ALL related transactions (user accounts + cost centers) atomically.
 * See reverseFlightCharge() documentation for details.
 */

// ============================================================================
// AUTHORIZATION HELPER
// ============================================================================

async function verifyBoardMember(): Promise<
  | { authorized: false; error: string; supabase?: undefined; userId?: undefined }
  | { authorized: true; error?: undefined; supabase: Awaited<ReturnType<typeof createClient>>; userId: string }
> {
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
// USER BALANCES
// ============================================================================

export async function getUserBalances() {
  const auth = await verifyBoardMember()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  const { data, error } = await auth.supabase
    .from('user_balances')
    .select('*')
    .order('surname')
    .order('name')

  if (error) {
    console.error('Error fetching user balances:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

export async function getUserBalance(userId: string) {
  const auth = await verifyBoardMember()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  const { data, error } = await auth.supabase
    .from('user_balances')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    console.error('Error fetching user balance:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

// ============================================================================
// ACCOUNT TRANSACTIONS
// ============================================================================

export async function getAccountTransactions(userId?: string) {
  const auth = await verifyBoardMember()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  let query = auth.supabase
    .from('accounts')
    .select(`
      *,
      user:users!accounts_user_id_fkey(id, name, surname, email),
      created_by_user:users!accounts_created_by_fkey(id, name, surname)
    `)
    .order('created_at', { ascending: false })

  if (userId) {
    query = query.eq('user_id', userId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching account transactions:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

export async function getAccountTransaction(transactionId: string) {
  const auth = await verifyBoardMember()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  const { data, error } = await auth.supabase
    .from('accounts')
    .select(`
      *,
      user:users!accounts_user_id_fkey(id, name, surname, email),
      created_by_user:users!accounts_created_by_fkey(id, name, surname)
    `)
    .eq('id', transactionId)
    .single()

  if (error) {
    console.error('Error fetching account transaction:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

// ============================================================================
// CREATE/UPDATE/DELETE TRANSACTIONS
// ============================================================================

export async function createAccountTransaction(data: Omit<AccountInsert, 'created_by'>) {
  const auth = await verifyBoardMember()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  // Verify user exists
  const { data: user } = await auth.supabase
    .from('users')
    .select('id, name, surname')
    .eq('id', data.user_id)
    .single()

  if (!user) {
    return { success: false, error: 'User not found' }
  }

  const { data: transaction, error } = await auth.supabase
    .from('accounts')
    .insert({
      ...data,
      created_by: auth.userId,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating account transaction:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/billing')
  return { success: true, data: transaction }
}

export async function updateAccountTransaction(transactionId: string, data: AccountUpdate) {
  const auth = await verifyBoardMember()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  const { data: transaction, error } = await auth.supabase
    .from('accounts')
    .update(data)
    .eq('id', transactionId)
    .select()
    .single()

  if (error) {
    console.error('Error updating account transaction:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/billing')
  return { success: true, data: transaction }
}

export async function deleteAccountTransaction(transactionId: string) {
  const auth = await verifyBoardMember()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  const { error } = await auth.supabase
    .from('accounts')
    .delete()
    .eq('id', transactionId)

  if (error) {
    console.error('Error deleting account transaction:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/billing')
  return { success: true, message: 'Transaction deleted successfully' }
}

// ============================================================================
// MANUAL ADJUSTMENTS
// ============================================================================

export async function addPayment(data: {
  userId: string
  amount: number
  description: string
  created_at?: string
}) {
  const auth = await verifyBoardMember()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  if (data.amount <= 0) {
    return { success: false, error: 'Payment amount must be positive' }
  }

  return await createAccountTransaction({
    user_id: data.userId,
    amount: Math.abs(data.amount), // Positive for credit/payment
    description: data.description,
    ...(data.created_at && { created_at: data.created_at }),
  })
}

export async function addCharge(data: {
  userId: string
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

  return await createAccountTransaction({
    user_id: data.userId,
    amount: -Math.abs(data.amount), // Negative for debit/charge
    description: data.description,
    ...(data.created_at && { created_at: data.created_at }),
  })
}

export async function addAdjustment(data: {
  userId: string
  amount: number
  description: string
  created_at?: string
}) {
  const auth = await verifyBoardMember()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  return await createAccountTransaction({
    user_id: data.userId,
    amount: data.amount, // Can be positive or negative
    description: data.description,
    ...(data.created_at && { created_at: data.created_at }),
  })
}

// ============================================================================
// REVERSE FLIGHT CHARGES
// ============================================================================

/**
 * Reverse a flight charge (user account transaction)
 *
 * This function handles reversing ALL transactions related to a flight, including:
 * - All user account transactions for the flight
 * - All cost center transactions for the flight
 *
 * This is crucial for split-charged flights where costs are distributed across
 * multiple accounts (e.g., 50% pilot, 25% Cost Center A, 25% Cost Center B).
 * Reversing any single transaction will reverse ALL related transactions to
 * prevent partial reversals and accounting inconsistencies.
 *
 * The flight will be marked as uncharged and unlocked, allowing it to be
 * re-charged with correct amounts or allocations.
 *
 * NOTE: This is different from reverseUserTransaction() in accounting.ts,
 * which only handles manual (non-flight) transactions.
 */
export async function reverseFlightCharge(transactionId: string) {
  const auth = await verifyBoardMember()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  // Get the original transaction
  const { data: originalTx, error: fetchError } = await auth.supabase
    .from('accounts')
    .select(`
      *,
      flight:flightlog!accounts_flightlog_id_fkey(
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

  const flightlogId = originalTx.flightlog_id

  // For split charges, we need to reverse ALL transactions for this flight
  // Find all user account transactions for this flight
  const { data: allUserTransactions, error: userTxError } = await auth.supabase
    .from('accounts')
    .select('*')
    .eq('flightlog_id', flightlogId)
    .is('reverses_transaction_id', null) // Only original transactions, not reversals

  // Find all cost center transactions for this flight
  const { data: allCostCenterTransactions, error: ccTxError } = await auth.supabase
    .from('cost_center_transactions')
    .select('*')
    .eq('flightlog_id', flightlogId)
    .is('reverses_transaction_id', null) // Only original transactions, not reversals

  if (userTxError || ccTxError) {
    console.error('Error fetching related transactions:', userTxError || ccTxError)
    return { success: false, error: 'Failed to fetch related transactions' }
  }

  const reversalTimestamp = new Date().toISOString()
  let reversedCount = 0

  try {
    // Reverse all user account transactions for this flight
    for (const tx of allUserTransactions || []) {
      // Create reverse transaction
      const { data: reverseTx, error: reverseError } = await auth.supabase
        .from('accounts')
        .insert({
          user_id: tx.user_id,
          amount: -tx.amount,
          description: `REVERSAL: ${tx.description}`,
          created_by: auth.userId,
          reverses_transaction_id: tx.id,
        })
        .select()
        .single()

      if (reverseError) {
        throw new Error(`Failed to create reversal for user transaction: ${reverseError.message}`)
      }

      // Mark original as reversed
      const { error: updateError } = await auth.supabase
        .from('accounts')
        .update({
          reversed_at: reversalTimestamp,
          reversed_by: auth.userId,
          reversal_transaction_id: reverseTx.id,
        })
        .eq('id', tx.id)

      if (updateError) {
        throw new Error(`Failed to mark user transaction as reversed: ${updateError.message}`)
      }

      reversedCount++
    }

    // Reverse all cost center transactions for this flight
    for (const tx of allCostCenterTransactions || []) {
      // Create reverse transaction
      const { data: reverseTx, error: reverseError } = await auth.supabase
        .from('cost_center_transactions')
        .insert({
          cost_center_id: tx.cost_center_id,
          flightlog_id: tx.flightlog_id,
          amount: -tx.amount,
          description: `REVERSAL: ${tx.description}`,
          created_by: auth.userId,
          reverses_transaction_id: tx.id,
        })
        .select()
        .single()

      if (reverseError) {
        throw new Error(`Failed to create reversal for cost center transaction: ${reverseError.message}`)
      }

      // Mark original as reversed
      const { error: updateError } = await auth.supabase
        .from('cost_center_transactions')
        .update({
          reversed_at: reversalTimestamp,
          reversed_by: auth.userId,
          reversal_transaction_id: reverseTx.id,
        })
        .eq('id', tx.id)

      if (updateError) {
        throw new Error(`Failed to mark cost center transaction as reversed: ${updateError.message}`)
      }

      reversedCount++
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
      .eq('id', flightlogId)

    if (unlockError) {
      throw new Error(`Failed to unlock flight: ${unlockError.message}`)
    }

    revalidatePath('/accounting')
    revalidatePath('/billing')
    return {
      success: true,
      message: `Flight charges reversed successfully (${reversedCount} transaction(s)) and flight unlocked for re-charging`
    }
  } catch (error) {
    console.error('Error during flight charge reversal:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reverse flight charges'
    }
  }
}
