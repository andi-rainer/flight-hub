'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { CostCenterTransactionInsert, AccountInsert } from '@/lib/database.types'

/**
 * Server actions for Billing and Charging operations
 * Handles charging flights to users or cost centers (board members only)
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
// UNCHARGED FLIGHTS
// ============================================================================

export async function getUnchargedFlights() {
  const auth = await verifyBoardMember()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  const { data, error } = await auth.supabase
    .from('uncharged_flights')
    .select('*')
    .order('block_off', { ascending: false })

  if (error) {
    console.error('Error fetching uncharged flights:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

// ============================================================================
// CHARGE FLIGHT TO USER
// ============================================================================

export async function chargeFlightToUser(data: {
  flightlogId: string
  userId: string
  amount: number
  description: string
}) {
  const auth = await verifyBoardMember()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  // Verify flight exists and is not already charged
  const { data: flight, error: flightError } = await auth.supabase
    .from('flightlog')
    .select('id, charged, locked, pilot_id')
    .eq('id', data.flightlogId)
    .single()

  if (flightError || !flight) {
    return { success: false, error: 'Flight not found' }
  }

  if (flight.charged) {
    return { success: false, error: 'Flight has already been charged' }
  }

  // Create account transaction (debit for user)
  const { error: accountError } = await auth.supabase
    .from('accounts')
    .insert({
      user_id: data.userId,
      flightlog_id: data.flightlogId,
      amount: -Math.abs(data.amount), // Negative for debit
      description: data.description,
      created_by: auth.userId,
    })

  if (accountError) {
    console.error('Error creating account transaction:', accountError)
    return { success: false, error: accountError.message }
  }

  // Mark flight as charged and locked
  const { error: updateError } = await auth.supabase
    .from('flightlog')
    .update({
      charged: true,
      locked: true,
      charged_by: auth.userId,
      charged_at: new Date().toISOString(),
    })
    .eq('id', data.flightlogId)

  if (updateError) {
    console.error('Error updating flight charged status:', updateError)
    return { success: false, error: updateError.message }
  }

  revalidatePath('/billing')
  revalidatePath('/flightlog')
  return { success: true, message: 'Flight charged to user successfully' }
}

// ============================================================================
// CHARGE FLIGHT TO COST CENTER
// ============================================================================

export async function chargeFlightToCostCenter(data: {
  flightlogId: string
  costCenterId: string
  amount: number
  description: string
}) {
  const auth = await verifyBoardMember()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  // Verify flight exists and is not already charged
  const { data: flight, error: flightError } = await auth.supabase
    .from('flightlog')
    .select('id, charged, locked')
    .eq('id', data.flightlogId)
    .single()

  if (flightError || !flight) {
    return { success: false, error: 'Flight not found' }
  }

  if (flight.charged) {
    return { success: false, error: 'Flight has already been charged' }
  }

  // Verify cost center exists and is active
  const { data: costCenter, error: costCenterError } = await auth.supabase
    .from('cost_centers')
    .select('id, active, name')
    .eq('id', data.costCenterId)
    .single()

  if (costCenterError || !costCenter) {
    return { success: false, error: 'Cost center not found' }
  }

  if (!costCenter.active) {
    return { success: false, error: 'Cost center is not active' }
  }

  // Create cost center transaction (negative for charges/costs)
  const { error: transactionError } = await auth.supabase
    .from('cost_center_transactions')
    .insert({
      cost_center_id: data.costCenterId,
      flightlog_id: data.flightlogId,
      amount: -Math.abs(data.amount), // Negative for charges/costs
      description: data.description,
      created_by: auth.userId,
    })

  if (transactionError) {
    console.error('Error creating cost center transaction:', transactionError)
    return { success: false, error: transactionError.message }
  }

  // Mark flight as charged and locked
  const { error: updateError } = await auth.supabase
    .from('flightlog')
    .update({
      charged: true,
      locked: true,
      charged_by: auth.userId,
      charged_at: new Date().toISOString(),
    })
    .eq('id', data.flightlogId)

  if (updateError) {
    console.error('Error updating flight charged status:', updateError)
    return { success: false, error: updateError.message }
  }

  revalidatePath('/billing')
  revalidatePath('/flightlog')
  return { success: true, message: `Flight charged to cost center "${costCenter.name}" successfully` }
}

// ============================================================================
// UNCHARGE FLIGHT (REVERSE CHARGE)
// ============================================================================

export async function unchargeFlow(flightlogId: string) {
  const auth = await verifyBoardMember()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  // Verify flight exists and is charged
  const { data: flight, error: flightError } = await auth.supabase
    .from('flightlog')
    .select('id, charged, locked')
    .eq('id', flightlogId)
    .single()

  if (flightError || !flight) {
    return { success: false, error: 'Flight not found' }
  }

  if (!flight.charged) {
    return { success: false, error: 'Flight is not charged' }
  }

  // Check if it's a cost center transaction
  const { data: costCenterTx } = await auth.supabase
    .from('cost_center_transactions')
    .select('id')
    .eq('flightlog_id', flightlogId)
    .single()

  if (costCenterTx) {
    // Delete cost center transaction
    const { error: deleteError } = await auth.supabase
      .from('cost_center_transactions')
      .delete()
      .eq('flightlog_id', flightlogId)

    if (deleteError) {
      console.error('Error deleting cost center transaction:', deleteError)
      return { success: false, error: deleteError.message }
    }
  } else {
    // Find and delete user account transaction
    // Note: This is trickier as we need to find the matching transaction
    // We'll need to add a flightlog_id reference to accounts table in a future migration
    // For now, warn the user
    return {
      success: false,
      error: 'Cannot automatically reverse user charges. Please manually adjust user account.'
    }
  }

  // Mark flight as uncharged
  const { error: updateError } = await auth.supabase
    .from('flightlog')
    .update({
      charged: false,
      charged_by: null,
      charged_at: null,
    })
    .eq('id', flightlogId)

  if (updateError) {
    console.error('Error updating flight charged status:', updateError)
    return { success: false, error: updateError.message }
  }

  revalidatePath('/billing')
  revalidatePath('/flightlog')
  return { success: true, message: 'Flight charge reversed successfully' }
}

// ============================================================================
// BATCH CHARGING
// ============================================================================

export async function batchChargeFlights(charges: Array<{
  flightlogId: string
  targetType: 'user' | 'cost_center'
  targetId: string
  amount: number
  description: string
}>) {
  const auth = await verifyBoardMember()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  }

  for (const charge of charges) {
    try {
      if (charge.targetType === 'user') {
        const result = await chargeFlightToUser({
          flightlogId: charge.flightlogId,
          userId: charge.targetId,
          amount: charge.amount,
          description: charge.description,
        })
        if (result.success) {
          results.success++
        } else {
          results.failed++
          results.errors.push(result.error || 'Unknown error')
        }
      } else {
        const result = await chargeFlightToCostCenter({
          flightlogId: charge.flightlogId,
          costCenterId: charge.targetId,
          amount: charge.amount,
          description: charge.description,
        })
        if (result.success) {
          results.success++
        } else {
          results.failed++
          results.errors.push(result.error || 'Unknown error')
        }
      }
    } catch (error) {
      results.failed++
      results.errors.push(error instanceof Error ? error.message : 'Unknown error')
    }
  }

  revalidatePath('/billing')
  revalidatePath('/flightlog')

  return {
    success: true,
    data: results,
    message: `Charged ${results.success} flights successfully. ${results.failed} failed.`
  }
}

// ============================================================================
// SPLIT CHARGE FLIGHT
// ============================================================================

export async function splitChargeFlight(data: {
  flightlogId: string
  splits: Array<{
    type: 'user' | 'cost_center'
    targetId: string
    percentage: number
  }>
  totalAmount: number
  description: string
}) {
  const auth = await verifyBoardMember()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  // Validate percentages sum to 100
  const totalPercentage = data.splits.reduce((sum, split) => sum + split.percentage, 0)
  if (Math.abs(totalPercentage - 100) > 0.01) {
    return { success: false, error: 'Split percentages must sum to 100%' }
  }

  // Verify flight exists and is not already charged
  const { data: flight, error: flightError } = await auth.supabase
    .from('flightlog')
    .select('id, charged, locked')
    .eq('id', data.flightlogId)
    .single()

  if (flightError || !flight) {
    return { success: false, error: 'Flight not found' }
  }

  if (flight.charged) {
    return { success: false, error: 'Flight has already been charged' }
  }

  // Create transactions for each split
  const errors: string[] = []

  for (const split of data.splits) {
    const splitAmount = (data.totalAmount * split.percentage) / 100
    const splitDescription = `${data.description} (${split.percentage.toFixed(1)}% split)`

    if (split.type === 'user') {
      // Create account transaction
      const { error: accountError } = await auth.supabase
        .from('accounts')
        .insert({
          user_id: split.targetId,
          flightlog_id: data.flightlogId,
          amount: -Math.abs(splitAmount), // Negative for debit
          description: splitDescription,
          created_by: auth.userId,
        })

      if (accountError) {
        errors.push(`Failed to charge user: ${accountError.message}`)
      }
    } else {
      // Verify cost center exists and is active
      const { data: costCenter, error: costCenterError } = await auth.supabase
        .from('cost_centers')
        .select('id, active')
        .eq('id', split.targetId)
        .single()

      if (costCenterError || !costCenter) {
        errors.push(`Cost center ${split.targetId} not found`)
        continue
      }

      if (!costCenter.active) {
        errors.push(`Cost center ${split.targetId} is not active`)
        continue
      }

      // Create cost center transaction
      const { error: transactionError } = await auth.supabase
        .from('cost_center_transactions')
        .insert({
          cost_center_id: split.targetId,
          flightlog_id: data.flightlogId,
          amount: -Math.abs(splitAmount), // Negative for charges/costs
          description: splitDescription,
          created_by: auth.userId,
        })

      if (transactionError) {
        errors.push(`Failed to charge cost center: ${transactionError.message}`)
      }
    }
  }

  if (errors.length > 0) {
    return { success: false, error: `Some charges failed: ${errors.join(', ')}` }
  }

  // Mark flight as charged and locked
  const { error: updateError } = await auth.supabase
    .from('flightlog')
    .update({
      charged: true,
      locked: true,
      charged_by: auth.userId,
      charged_at: new Date().toISOString(),
    })
    .eq('id', data.flightlogId)

  if (updateError) {
    console.error('Error updating flight charged status:', updateError)
    return { success: false, error: updateError.message }
  }

  revalidatePath('/billing')
  revalidatePath('/flightlog')
  revalidatePath('/accounting')
  return { success: true, message: `Flight cost split among ${data.splits.length} targets successfully` }
}
