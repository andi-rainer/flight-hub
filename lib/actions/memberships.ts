'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type {
  MembershipTypeInsert,
  MembershipTypeUpdate,
  UserMembershipInsert
} from '@/lib/database.types'

/**
 * Server actions for Membership Management
 * Handles membership types, user memberships, and member number generation
 */

// ============================================================================
// MEMBERSHIP TYPES MANAGEMENT
// ============================================================================

export async function createMembershipType(data: Omit<MembershipTypeInsert, 'id' | 'created_at' | 'updated_at'>) {
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

  // Check if membership type with this name already exists
  const { data: existing } = await supabase
    .from('membership_types')
    .select('id')
    .eq('name', data.name)
    .single()

  if (existing) {
    return { success: false, error: 'A membership type with this name already exists' }
  }

  // Create membership type
  const { data: newMembershipType, error } = await supabase
    .from('membership_types')
    .insert(data)
    .select()
    .single()

  if (error) {
    console.error('Error creating membership type:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/settings')
  revalidatePath('/members')
  return { success: true, data: newMembershipType }
}

export async function updateMembershipType(id: string, data: MembershipTypeUpdate) {
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

  // If name is being changed, check for conflicts
  if (data.name) {
    const { data: existing } = await supabase
      .from('membership_types')
      .select('id')
      .eq('name', data.name)
      .neq('id', id)
      .single()

    if (existing) {
      return { success: false, error: 'A membership type with this name already exists' }
    }
  }

  // Update membership type
  const { data: updatedMembershipType, error } = await supabase
    .from('membership_types')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating membership type:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/settings')
  revalidatePath('/members')
  return { success: true, data: updatedMembershipType }
}

export async function deleteMembershipType(id: string) {
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

  // Check if any users have this membership type as ACTIVE
  const { data: usersWithMembership } = await supabase
    .from('user_memberships')
    .select('id')
    .eq('membership_type_id', id)
    .eq('status', 'active')
    .limit(1)

  if (usersWithMembership && usersWithMembership.length > 0) {
    return {
      success: false,
      error: 'Cannot delete membership type - it is currently assigned to one or more active users'
    }
  }

  // Set membership_type_id to NULL for all inactive memberships to preserve history
  // but remove the foreign key reference that would block deletion
  const { error: unlinkError } = await supabase
    .from('user_memberships')
    .update({ membership_type_id: undefined })
    .eq('membership_type_id', id)
    .neq('status', 'active')

  if (unlinkError) {
    console.error('Error unlinking inactive memberships:', unlinkError)
    return { success: false, error: 'Failed to unlink historical membership records' }
  }

  // Delete membership type
  const { error } = await supabase
    .from('membership_types')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting membership type:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/settings')
  revalidatePath('/members')
  return { success: true }
}

export async function getMembershipTypes() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('membership_types')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching membership types:', error)
    return { success: false, error: error.message, data: [] }
  }

  return { success: true, data: data || [] }
}

// ============================================================================
// USER MEMBERSHIPS MANAGEMENT
// ============================================================================

/**
 * Generate unique member number with prefix
 * Format: {PREFIX}-{YEAR}-{SEQUENTIAL}
 * Example: T-2025-001, M-2025-042
 */
async function generateMemberNumber(prefix: string): Promise<string> {
  const supabase = await createClient()
  const year = new Date().getFullYear()

  // Get the latest member number with this prefix for current year
  const { data: latestMembership } = await supabase
    .from('user_memberships')
    .select('member_number')
    .like('member_number', `${prefix}-${year}-%`)
    .order('member_number', { ascending: false })
    .limit(1)
    .single()

  let nextNumber = 1

  if (latestMembership) {
    // Extract the sequential number and increment
    const parts = latestMembership.member_number.split('-')
    if (parts.length === 3) {
      nextNumber = parseInt(parts[2], 10) + 1
    }
  }

  // Format: T-2025-001
  return `${prefix}-${year}-${nextNumber.toString().padStart(3, '0')}`
}

export async function assignMembership(data: {
  user_id: string
  membership_type_id: string
  start_date: string
  auto_renew?: boolean
  payment_status?: 'paid' | 'unpaid' | 'pending'
  notes?: string
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

  // Get membership type details
  const { data: membershipType, error: typeError } = await supabase
    .from('membership_types')
    .select('*')
    .eq('id', data.membership_type_id)
    .single()

  if (typeError || !membershipType) {
    return { success: false, error: 'Membership type not found' }
  }

  // Calculate end date based on duration
  const startDate = new Date(data.start_date)
  const endDate = new Date(startDate)

  switch (membershipType.duration_unit) {
    case 'days':
      endDate.setDate(endDate.getDate() + membershipType.duration_value)
      break
    case 'months':
      endDate.setMonth(endDate.getMonth() + membershipType.duration_value)
      break
    case 'years':
      endDate.setFullYear(endDate.getFullYear() + membershipType.duration_value)
      break
  }

  // Generate member number
  const memberNumber = await generateMemberNumber(membershipType.member_number_prefix)

  // Create membership record
  const membershipData: Omit<UserMembershipInsert, 'id' | 'created_at' | 'updated_at'> = {
    user_id: data.user_id,
    membership_type_id: data.membership_type_id,
    member_number: memberNumber,
    start_date: data.start_date,
    end_date: endDate.toISOString().split('T')[0],
    status: 'active',
    auto_renew: data.auto_renew ?? membershipType.auto_renew,
    payment_status: data.payment_status || 'unpaid',
    notes: data.notes || null,
    created_by: user.id,
  }

  const { data: newMembership, error } = await supabase
    .from('user_memberships')
    .insert(membershipData)
    .select()
    .single()

  if (error) {
    console.error('Error assigning membership:', error)
    return { success: false, error: error.message }
  }

  // Update user's member_category
  const { error: updateError } = await supabase
    .from('users')
    .update({
      member_category: membershipType.member_category,
      updated_at: new Date().toISOString(),
    })
    .eq('id', data.user_id)

  if (updateError) {
    console.error('Error updating user category:', updateError)
  }

  // Log initial payment status to history
  await supabase
    .from('payment_status_history')
    .insert({
      membership_id: newMembership.id,
      old_status: '',
      new_status: membershipData.payment_status ?? 'unpaid',
      changed_by: user.id,
      changed_at: new Date().toISOString(),
      notes: `Membership created with payment status: ${membershipData.payment_status ?? 'unpaid'}`,
    })

  revalidatePath('/members')
  return { success: true, data: newMembership }
}

export async function renewMembership(membershipId: string) {
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

  // Get current membership
  const { data: currentMembership, error: fetchError } = await supabase
    .from('user_memberships')
    .select('*, membership_types(*)')
    .eq('id', membershipId)
    .single()

  if (fetchError || !currentMembership) {
    return { success: false, error: 'Membership not found' }
  }

  // Mark current membership as expired
  await supabase
    .from('user_memberships')
    .update({ status: 'expired', updated_at: new Date().toISOString() })
    .eq('id', membershipId)

  // Create new membership starting from today
  const startDate = new Date().toISOString().split('T')[0]

  const result = await assignMembership({
    user_id: currentMembership.user_id,
    membership_type_id: currentMembership.membership_type_id,
    start_date: startDate,
    auto_renew: currentMembership.auto_renew ?? false,
    payment_status: 'unpaid',
    notes: 'Renewed from previous membership',
  })

  return result
}

export async function cancelMembership(
  membershipId: string,
  reason?: string,
  createFinalTransaction?: boolean
) {
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

  // Get membership details to get user_id
  const { data: membership, error: membershipError } = await supabase
    .from('user_memberships')
    .select('user_id')
    .eq('id', membershipId)
    .single()

  if (membershipError || !membership) {
    return { success: false, error: 'Membership not found' }
  }

  // Check user's account balance
  const { data: userBalance } = await supabase
    .from('user_balances')
    .select('balance')
    .eq('user_id', membership.user_id)
    .single()

  const balance = userBalance?.balance || 0

  // If balance is not zero, prevent ending membership
  if (balance !== 0) {
    if (balance < 0) {
      // User owes money to the club
      return {
        success: false,
        error: 'Cannot end membership',
        balanceError: 'negative',
        balance: balance,
        message: `User has a negative balance of ${new Intl.NumberFormat('de-DE', {
          style: 'currency',
          currency: 'EUR'
        }).format(Math.abs(balance))}. All debts must be paid before ending membership.`
      }
    } else {
      // Club owes money to the user (positive balance)
      if (!createFinalTransaction) {
        return {
          success: false,
          error: 'Cannot end membership',
          balanceError: 'positive',
          balance: balance,
          message: `User has a positive balance of ${new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency: 'EUR'
          }).format(balance)}. A final refund transaction can be created to settle the account.`
        }
      }

      // Create final refund transaction to settle positive balance
      const { error: transactionError } = await supabase
        .from('accounts')
        .insert({
          user_id: membership.user_id,
          amount: -balance, // Negative to deduct from their balance
          description: `Final settlement - membership ended. Refund processed.`,
          created_by: user.id,
          created_at: new Date().toISOString(),
        })

      if (transactionError) {
        console.error('Error creating final transaction:', transactionError)
        return {
          success: false,
          error: 'Failed to create final settlement transaction'
        }
      }
    }
  }

  // Update membership status
  const { data: cancelledMembership, error } = await supabase
    .from('user_memberships')
    .update({
      status: 'cancelled',
      end_date: new Date().toISOString().split('T')[0], // Set end date to today
      notes: reason ? `Cancelled: ${reason}` : 'Cancelled by board member',
      updated_at: new Date().toISOString(),
    })
    .eq('id', membershipId)
    .select()
    .single()

  if (error) {
    console.error('Error cancelling membership:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/members')
  return {
    success: true,
    data: cancelledMembership,
    message: createFinalTransaction
      ? 'Membership ended successfully. Final refund transaction created.'
      : 'Membership ended successfully.'
  }
}

export async function getUserMemberships(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('user_memberships')
    .select('*, membership_types(*)')
    .eq('user_id', userId)
    .order('start_date', { ascending: false })

  if (error) {
    console.error('Error fetching user memberships:', error)
    return { success: false, error: error.message, data: [] }
  }

  return { success: true, data: data || [] }
}

export async function getActiveMembership(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('user_memberships')
    .select('*, membership_types(*)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('end_date', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    // No active membership is not an error
    return { success: true, data: null }
  }

  return { success: true, data }
}

export async function getPaymentStatusHistory(membershipId: string) {
  const supabase = await createClient()

  // Verify user is board member
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated', data: [] }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile?.role?.includes('board')) {
    return { success: false, error: 'Not authorized - board members only', data: [] }
  }

  const { data, error } = await supabase
    .from('payment_status_history')
    .select(`
      *,
      changed_by_user:users!payment_status_history_changed_by_fkey(name, surname)
    `)
    .eq('membership_id', membershipId)
    .order('changed_at', { ascending: false })

  if (error) {
    console.error('Error fetching payment status history:', error)
    return { success: false, error: error.message, data: [] }
  }

  return { success: true, data: data || [] }
}

export async function updateMembershipPaymentStatus(
  membershipId: string,
  paymentStatus: 'paid' | 'unpaid' | 'pending'
) {
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

  // Get current membership to log old status
  const { data: currentMembership } = await supabase
    .from('user_memberships')
    .select('payment_status')
    .eq('id', membershipId)
    .single()

  if (!currentMembership) {
    return { success: false, error: 'Membership not found' }
  }

  const oldStatus = currentMembership.payment_status

  // Update payment status
  const { data: updatedMembership, error } = await supabase
    .from('user_memberships')
    .update({
      payment_status: paymentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', membershipId)
    .select()
    .single()

  if (error) {
    console.error('Error updating payment status:', error)
    return { success: false, error: error.message }
  }

  // Log payment status change to history
  if (oldStatus !== paymentStatus) {
    await supabase
      .from('payment_status_history')
      .insert({
        membership_id: membershipId,
        old_status: oldStatus ?? '',
        new_status: paymentStatus,
        changed_by: user.id,
        changed_at: new Date().toISOString(),
        notes: `Payment status changed from ${oldStatus ?? ''} to ${paymentStatus}`,
      })
  }

  revalidatePath('/members')
  return { success: true, data: updatedMembership }
}
