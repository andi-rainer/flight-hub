'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { FunctionMasterInsert, FunctionMasterUpdate } from '@/lib/database.types'

/**
 * Server actions for Settings page
 * Handles functions management, billing rates, and user profile updates
 */

// ============================================================================
// FUNCTIONS MANAGEMENT
// ============================================================================

export async function createFunction(data: Omit<FunctionMasterInsert, 'id' | 'created_at'>) {
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

  // Check if function with this name already exists
  const { data: existing } = await supabase
    .from('functions_master')
    .select('id')
    .eq('name', data.name)
    .single()

  if (existing) {
    return { success: false, error: 'A function with this name already exists' }
  }

  // Create function
  const { data: newFunction, error } = await supabase
    .from('functions_master')
    .insert(data)
    .select()
    .single()

  if (error) {
    console.error('Error creating function:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/settings')
  revalidatePath('/members')
  return { success: true, data: newFunction }
}

export async function updateFunction(id: string, data: FunctionMasterUpdate) {
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
      .from('functions_master')
      .select('id')
      .eq('name', data.name)
      .neq('id', id)
      .single()

    if (existing) {
      return { success: false, error: 'A function with this name already exists' }
    }
  }

  // Update function
  const { data: updatedFunction, error } = await supabase
    .from('functions_master')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating function:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/settings')
  revalidatePath('/members')
  return { success: true, data: updatedFunction }
}

export async function deleteFunction(id: string) {
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

  // Check if any users have this function assigned
  const { data: usersWithFunction } = await supabase
    .from('users')
    .select('id')
    .contains('functions', [id])
    .limit(1)

  if (usersWithFunction && usersWithFunction.length > 0) {
    return {
      success: false,
      error: 'Cannot delete function - it is assigned to one or more users'
    }
  }

  // Delete function
  const { error } = await supabase
    .from('functions_master')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting function:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/settings')
  return { success: true }
}

// ============================================================================
// USER PROFILE MANAGEMENT
// ============================================================================

export async function updateUserProfile(data: {
  name?: string
  surname?: string
  license_number?: string | null
  street?: string | null
  house_number?: string | null
  city?: string | null
  zip?: string | null
  country?: string | null
  birthday?: string | null
  telephone?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
}) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Validate required address fields
  if (data.street !== undefined || data.house_number !== undefined ||
      data.city !== undefined || data.zip !== undefined || data.country !== undefined) {
    if (!data.street?.trim() || !data.house_number?.trim() ||
        !data.city?.trim() || !data.zip?.trim() || !data.country?.trim()) {
      return {
        success: false,
        error: 'All address fields are required: Street, House Number, City, ZIP, and Country'
      }
    }
  }

  // Update user profile
  const { data: updatedProfile, error } = await supabase
    .from('users')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating profile:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/settings')
  revalidatePath('/settings/profile')
  return { success: true, data: updatedProfile }
}

export async function updateUserMembershipDates(userId: string, data: {
  joined_at?: string | null
  left_at?: string | null
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

  // Update membership dates
  const { data: updatedProfile, error } = await supabase
    .from('users')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating membership dates:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/settings/profile')
  revalidatePath('/members')
  return { success: true, data: updatedProfile }
}

export async function updateMemberProfile(userId: string, data: {
  name?: string
  surname?: string
  email?: string
  license_number?: string | null
  street?: string | null
  house_number?: string | null
  city?: string | null
  zip?: string | null
  country?: string | null
  birthday?: string | null
  telephone?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  joined_at?: string | null
  left_at?: string | null
  functions?: string[]
  role?: string[]
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

  // Validate required address fields if any address field is being updated
  if (data.street !== undefined || data.house_number !== undefined ||
      data.city !== undefined || data.zip !== undefined || data.country !== undefined) {
    if (!data.street?.trim() || !data.house_number?.trim() ||
        !data.city?.trim() || !data.zip?.trim() || !data.country?.trim()) {
      return {
        success: false,
        error: 'All address fields are required: Street, House Number, City, ZIP, and Country'
      }
    }
  }

  // Validate email is not empty if being updated
  if (data.email !== undefined && !data.email?.trim()) {
    return { success: false, error: 'Email cannot be empty' }
  }

  // Update member profile in users table
  const { data: updatedProfile, error } = await supabase
    .from('users')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating member profile:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/members')
  revalidatePath('/settings/profile')
  return { success: true, data: updatedProfile }
}

export async function updateUserEmail(newEmail: string) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Update email in Supabase Auth
  const { error: authError } = await supabase.auth.updateUser({
    email: newEmail,
  })

  if (authError) {
    console.error('Error updating email:', authError)
    return { success: false, error: authError.message }
  }

  // Update email in users table
  const { error: dbError } = await supabase
    .from('users')
    .update({
      email: newEmail,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (dbError) {
    console.error('Error updating email in database:', dbError)
    return { success: false, error: dbError.message }
  }

  revalidatePath('/settings')
  return {
    success: true,
    message: 'Email updated. Please check your inbox to confirm the new email address.'
  }
}

export async function updateUserPassword(currentPassword: string, newPassword: string) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Verify current password by attempting to sign in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  })

  if (signInError) {
    return { success: false, error: 'Current password is incorrect' }
  }

  // Update password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (updateError) {
    console.error('Error updating password:', updateError)
    return { success: false, error: updateError.message }
  }

  return { success: true, message: 'Password updated successfully' }
}

// ============================================================================
// BILLING RATES MANAGEMENT
// ============================================================================

/**
 * NOTE: Aircraft hourly billing rates are not yet implemented in the database schema.
 * To enable this feature, add a 'hourly_rate' column to the 'planes' table:
 *
 * ALTER TABLE planes ADD COLUMN hourly_rate DECIMAL(10,2) DEFAULT 150.00;
 *
 * Then uncomment the functions below.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function updateAircraftHourlyRate(planeId: string, hourlyRate: number) {
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

  // TODO: Uncomment when hourly_rate column is added to planes table
  // const { error } = await supabase
  //   .from('planes')
  //   .update({ hourly_rate: hourlyRate })
  //   .eq('id', planeId)

  // if (error) {
  //   console.error('Error updating hourly rate:', error)
  //   return { success: false, error: error.message }
  // }

  // revalidatePath('/settings')
  // return { success: true }

  return {
    success: false,
    error: 'Hourly rate feature requires database migration. See settings.ts for details.'
  }
}
