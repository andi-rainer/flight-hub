'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireAnyPermission } from '@/lib/permissions'

/**
 * Server actions for Accounting page
 * Handles user account transactions and cost center transactions with edit/reversal capabilities
 */

// ============================================================================
// AUTHORIZATION HELPER
// ============================================================================

/**
 * Verify user has accounting permissions (board members or treasurers)
 */
async function verifyAccountingAccess() {
  const supabase = await createClient()

  const { user, error } = await requireAnyPermission(supabase, ['billing.view.all', 'billing.manage'])
  if (error || !user) {
    return { authorized: false, error: error || 'Not authenticated' }
  }

  return { authorized: true, supabase, userId: user.id }
}

// ============================================================================
// USER TRANSACTIONS
// ============================================================================

export async function getUserTransactions(userId: string) {
  const auth = await verifyAccountingAccess()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  const { data: transactions, error } = await auth.supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching user transactions:', error)
    return { success: false, error: error.message }
  }

  // Fetch related data separately to avoid PostgREST self-referencing issues
  const enrichedTransactions = await Promise.all(
    transactions.map(async (tx) => {
      // Fetch created_by user
      let created_by_user = null
      if (tx.created_by) {
        const { data: creator } = await auth.supabase
          .from('users')
          .select('id, name, surname')
          .eq('id', tx.created_by)
          .single()
        created_by_user = creator
      }

      // Fetch reversed_by user
      let reversed_by_user = null
      if (tx.reversed_by) {
        const { data: reverser } = await auth.supabase
          .from('users')
          .select('id, name, surname')
          .eq('id', tx.reversed_by)
          .single()
        reversed_by_user = reverser
      }

      // Fetch reversal transaction
      let reversal_transaction = null
      if (tx.reversal_transaction_id) {
        const { data: reversal } = await auth.supabase
          .from('accounts')
          .select('id, amount, created_at')
          .eq('id', tx.reversal_transaction_id)
          .single()
        reversal_transaction = reversal
      }

      // Fetch reverses transaction
      let reverses_transaction = null
      if (tx.reverses_transaction_id) {
        const { data: reverses } = await auth.supabase
          .from('accounts')
          .select('id, amount, created_at')
          .eq('id', tx.reverses_transaction_id)
          .single()
        reverses_transaction = reverses
      }

      // Fetch flight log
      let flightlog = null
      if (tx.flightlog_id) {
        const { data: flight } = await auth.supabase
          .from('flightlog')
          .select('id, block_off, block_on, plane:planes(tail_number)')
          .eq('id', tx.flightlog_id)
          .single()
        flightlog = flight
      }

      return {
        ...tx,
        created_by_user,
        reversed_by_user,
        reversal_transaction,
        reverses_transaction,
        flightlog,
      }
    })
  )

  return { success: true, data: enrichedTransactions }
}

export async function editUserTransaction(
  transactionId: string,
  data: { description?: string; created_at?: string }
) {
  const auth = await verifyAccountingAccess()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  // Fetch the original transaction
  const { data: transaction, error: fetchError } = await auth.supabase
    .from('accounts')
    .select('*')
    .eq('id', transactionId)
    .single()

  if (fetchError || !transaction) {
    return { success: false, error: 'Transaction not found' }
  }

  // Check if transaction has been reversed
  if (transaction.reversed_at) {
    return { success: false, error: 'Cannot edit a reversed transaction' }
  }

  // Validate the 1-hour rule for date editing
  if (data.created_at) {
    const insertedAt = new Date(transaction.inserted_at)
    const now = new Date()
    const hoursSinceInsertion = (now.getTime() - insertedAt.getTime()) / (1000 * 60 * 60)

    if (hoursSinceInsertion > 1) {
      return {
        success: false,
        error: 'Date can only be edited within 1 hour of transaction creation'
      }
    }
  }

  // Update the transaction
  const updateData: Record<string, any> = {}
  if (data.description !== undefined) updateData.description = data.description
  if (data.created_at !== undefined) updateData.created_at = data.created_at

  const { error: updateError } = await auth.supabase
    .from('accounts')
    .update(updateData)
    .eq('id', transactionId)

  if (updateError) {
    console.error('Error updating user transaction:', updateError)
    return { success: false, error: updateError.message }
  }

  revalidatePath('/accounting')
  return { success: true, message: 'Transaction updated successfully' }
}

export async function reverseUserTransaction(transactionId: string) {
  const auth = await verifyAccountingAccess()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  // Fetch the original transaction
  const { data: transaction, error: fetchError } = await auth.supabase
    .from('accounts')
    .select('*')
    .eq('id', transactionId)
    .single()

  if (fetchError || !transaction) {
    return { success: false, error: 'Transaction not found' }
  }

  // Check if already reversed
  if (transaction.reversed_at) {
    return { success: false, error: 'Transaction has already been reversed' }
  }

  // Check if this is itself a reversal transaction
  if (transaction.reverses_transaction_id) {
    return { success: false, error: 'Cannot reverse a reversal transaction' }
  }

  // Create the reversal transaction
  const { data: reversalTransaction, error: insertError } = await auth.supabase
    .from('accounts')
    .insert({
      user_id: transaction.user_id,
      amount: -transaction.amount, // Opposite amount
      description: `REVERSAL: ${transaction.description}`,
      created_by: auth.userId,
      reverses_transaction_id: transaction.id,
    })
    .select()
    .single()

  if (insertError || !reversalTransaction) {
    console.error('Error creating reversal transaction:', insertError)
    return { success: false, error: 'Failed to create reversal transaction' }
  }

  // Mark the original transaction as reversed
  const { error: updateError } = await auth.supabase
    .from('accounts')
    .update({
      reversed_at: new Date().toISOString(),
      reversed_by: auth.userId,
      reversal_transaction_id: reversalTransaction.id,
    })
    .eq('id', transaction.id)

  if (updateError) {
    console.error('Error marking transaction as reversed:', updateError)
    // Try to clean up the reversal transaction
    await auth.supabase.from('accounts').delete().eq('id', reversalTransaction.id)
    return { success: false, error: 'Failed to mark transaction as reversed' }
  }

  revalidatePath('/accounting')
  return { success: true, message: 'Transaction reversed successfully' }
}

// ============================================================================
// COST CENTER TRANSACTIONS
// ============================================================================

export async function getCostCenterTransactions(costCenterId: string) {
  const auth = await verifyAccountingAccess()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  const { data: transactions, error } = await auth.supabase
    .from('cost_center_transactions')
    .select('*')
    .eq('cost_center_id', costCenterId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching cost center transactions:', error)
    return { success: false, error: error.message }
  }

  // Fetch related data separately to avoid PostgREST self-referencing issues
  const enrichedTransactions = await Promise.all(
    transactions.map(async (tx) => {
      // Fetch created_by user
      let created_by_user = null
      if (tx.created_by) {
        const { data: creator } = await auth.supabase
          .from('users')
          .select('id, name, surname')
          .eq('id', tx.created_by)
          .single()
        created_by_user = creator
      }

      // Fetch reversed_by user
      let reversed_by_user = null
      if (tx.reversed_by) {
        const { data: reverser } = await auth.supabase
          .from('users')
          .select('id, name, surname')
          .eq('id', tx.reversed_by)
          .single()
        reversed_by_user = reverser
      }

      // Fetch flight log
      let flightlog = null
      if (tx.flightlog_id) {
        const { data: flight } = await auth.supabase
          .from('flightlog')
          .select('id, block_off, block_on, plane:planes(tail_number)')
          .eq('id', tx.flightlog_id)
          .single()
        flightlog = flight
      }

      // Fetch reversal transaction
      let reversal_transaction = null
      if (tx.reversal_transaction_id) {
        const { data: reversal } = await auth.supabase
          .from('cost_center_transactions')
          .select('id, amount, created_at')
          .eq('id', tx.reversal_transaction_id)
          .single()
        reversal_transaction = reversal
      }

      // Fetch reverses transaction
      let reverses_transaction = null
      if (tx.reverses_transaction_id) {
        const { data: reverses } = await auth.supabase
          .from('cost_center_transactions')
          .select('id, amount, created_at')
          .eq('id', tx.reverses_transaction_id)
          .single()
        reverses_transaction = reverses
      }

      return {
        ...tx,
        created_by_user,
        reversed_by_user,
        flightlog,
        reversal_transaction,
        reverses_transaction,
      }
    })
  )

  return { success: true, data: enrichedTransactions }
}

export async function editCostCenterTransaction(
  transactionId: string,
  data: { description?: string; created_at?: string }
) {
  const auth = await verifyAccountingAccess()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  // Fetch the original transaction
  const { data: transaction, error: fetchError } = await auth.supabase
    .from('cost_center_transactions')
    .select('*')
    .eq('id', transactionId)
    .single()

  if (fetchError || !transaction) {
    return { success: false, error: 'Transaction not found' }
  }

  // Check if transaction has been reversed
  if (transaction.reversed_at) {
    return { success: false, error: 'Cannot edit a reversed transaction' }
  }

  // Validate the 1-hour rule for date editing
  if (data.created_at) {
    const insertedAt = new Date(transaction.inserted_at)
    const now = new Date()
    const hoursSinceInsertion = (now.getTime() - insertedAt.getTime()) / (1000 * 60 * 60)

    if (hoursSinceInsertion > 1) {
      return {
        success: false,
        error: 'Date can only be edited within 1 hour of transaction creation'
      }
    }
  }

  // Update the transaction
  const updateData: Record<string, any> = {}
  if (data.description !== undefined) updateData.description = data.description
  if (data.created_at !== undefined) updateData.created_at = data.created_at

  const { error: updateError } = await auth.supabase
    .from('cost_center_transactions')
    .update(updateData)
    .eq('id', transactionId)

  if (updateError) {
    console.error('Error updating cost center transaction:', updateError)
    return { success: false, error: updateError.message }
  }

  revalidatePath('/accounting')
  return { success: true, message: 'Transaction updated successfully' }
}

export async function reverseCostCenterTransaction(transactionId: string) {
  const auth = await verifyAccountingAccess()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  // Fetch the original transaction
  const { data: transaction, error: fetchError } = await auth.supabase
    .from('cost_center_transactions')
    .select('*')
    .eq('id', transactionId)
    .single()

  if (fetchError || !transaction) {
    return { success: false, error: 'Transaction not found' }
  }

  // Check if already reversed
  if (transaction.reversed_at) {
    return { success: false, error: 'Transaction has already been reversed' }
  }

  // Check if this is itself a reversal transaction
  if (transaction.reverses_transaction_id) {
    return { success: false, error: 'Cannot reverse a reversal transaction' }
  }

  // For cost center transactions with flightlog_id, we need to handle it specially
  // We'll create a manual reversal without a flightlog_id since we can't reuse it
  const { data: reversalTransaction, error: insertError } = await auth.supabase
    .from('cost_center_transactions')
    .insert({
      cost_center_id: transaction.cost_center_id,
      flightlog_id: transaction.flightlog_id,
      amount: -transaction.amount, // Opposite amount
      description: `REVERSAL: ${transaction.description}`,
      created_by: auth.userId,
      reverses_transaction_id: transaction.id,
    })
    .select()
    .single()

  if (insertError || !reversalTransaction) {
    console.error('Error creating reversal transaction:', insertError)
    return { success: false, error: 'Failed to create reversal transaction' }
  }

  // Mark the original transaction as reversed
  const { error: updateError } = await auth.supabase
    .from('cost_center_transactions')
    .update({
      reversed_at: new Date().toISOString(),
      reversed_by: auth.userId,
      reversal_transaction_id: reversalTransaction.id,
    })
    .eq('id', transaction.id)

  if (updateError) {
    console.error('Error marking transaction as reversed:', updateError)
    // Try to clean up the reversal transaction
    await auth.supabase.from('cost_center_transactions').delete().eq('id', reversalTransaction.id)
    return { success: false, error: 'Failed to mark transaction as reversed' }
  }

  revalidatePath('/accounting')
  return { success: true, message: 'Transaction reversed successfully' }
}

// ============================================================================
// FETCH ALL USERS WITH BALANCES (for user list panel)
// ============================================================================

export async function getUserBalances() {
  const auth = await verifyAccountingAccess()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  // Get today's date for filtering active memberships
  const today = new Date().toISOString().split('T')[0]

  const { data: users, error } = await auth.supabase
    .from('user_balances')
    .select('*')

  if (error) {
    console.error('Error fetching user balances:', error)
    return { success: false, error: error.message }
  }

  // Get active memberships for all users
  const { data: memberships, error: membershipsError } = await auth.supabase
    .from('user_memberships')
    .select('user_id, end_date')
    .eq('status', 'active')
    .gte('end_date', today)

  if (membershipsError) {
    console.error('Error fetching memberships:', membershipsError)
    return { success: false, error: membershipsError.message }
  }

  // Create a set of user IDs with active memberships
  const activeUserIds = new Set(memberships?.map(m => m.user_id) || [])

  // Get user roles to check for board members
  const { data: userRoles, error: rolesError } = await auth.supabase
    .from('users')
    .select('id, role')

  if (rolesError) {
    console.error('Error fetching user roles:', rolesError)
    return { success: false, error: rolesError.message }
  }

  const boardMemberIds = new Set(
    userRoles?.filter(u => u.role?.includes('board')).map(u => u.id) || []
  )

  // Filter to only include users with active memberships or board members
  const activeUsers = users.filter(user =>
    user.user_id && (activeUserIds.has(user.user_id) || boardMemberIds.has(user.user_id))
  )

  // Fetch the most recent transaction date for each active user
  const usersWithLastTransaction = await Promise.all(
    activeUsers.map(async (user) => {
      const { data: latestTx } = await auth.supabase
        .from('accounts')
        .select('created_at')
        .eq('user_id', user.user_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      return {
        ...user,
        last_transaction_at: latestTx?.created_at || null,
      }
    })
  )

  // Sort by most recent transaction first, then by name
  const sortedUsers = usersWithLastTransaction.sort((a, b) => {
    // Users with transactions come before users without
    if (a.last_transaction_at && !b.last_transaction_at) return -1
    if (!a.last_transaction_at && b.last_transaction_at) return 1

    // Both have transactions - sort by most recent first
    if (a.last_transaction_at && b.last_transaction_at) {
      return new Date(b.last_transaction_at).getTime() - new Date(a.last_transaction_at).getTime()
    }

    // Neither has transactions - sort alphabetically
    const nameA = `${a.surname} ${a.name}`.toLowerCase()
    const nameB = `${b.surname} ${b.name}`.toLowerCase()
    return nameA.localeCompare(nameB)
  })

  return { success: true, data: sortedUsers }
}

// ============================================================================
// FETCH ALL COST CENTERS WITH TOTALS (for cost center list panel)
// ============================================================================

export async function getCostCentersWithTotals() {
  const auth = await verifyAccountingAccess()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  // Fetch all cost centers
  const { data: costCenters, error: costCentersError } = await auth.supabase
    .from('cost_centers')
    .select('*')
    .order('name')

  if (costCentersError) {
    console.error('Error fetching cost centers:', costCentersError)
    return { success: false, error: costCentersError.message }
  }

  // Fetch transaction totals for each cost center
  const costCentersWithTotals = await Promise.all(
    costCenters.map(async (costCenter) => {
      // Fetch ALL transactions to calculate total correctly
      // (reversals will naturally cancel out with their original transactions)
      const { data: transactions, error: txError } = await auth.supabase
        .from('cost_center_transactions')
        .select('amount')
        .eq('cost_center_id', costCenter.id)

      if (txError) {
        console.error(`Error fetching transactions for cost center ${costCenter.id}:`, txError)
        return { ...costCenter, total_amount: 0 }
      }

      const totalAmount = transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0)
      return { ...costCenter, total_amount: totalAmount }
    })
  )

  return { success: true, data: costCentersWithTotals }
}
