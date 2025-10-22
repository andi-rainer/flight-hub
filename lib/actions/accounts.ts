'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { AccountInsert, AccountUpdate } from '@/lib/database.types'

/**
 * Server actions for User Accounts management
 * Handles viewing user balances, transactions, and manual adjustments (board members only)
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
  })
}

export async function addCharge(data: {
  userId: string
  amount: number
  description: string
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
  })
}

export async function addAdjustment(data: {
  userId: string
  amount: number
  description: string
}) {
  const auth = await verifyBoardMember()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  return await createAccountTransaction({
    user_id: data.userId,
    amount: data.amount, // Can be positive or negative
    description: data.description,
  })
}
