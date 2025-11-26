'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Create a new custom function
 */
export async function createFunction(data: {
  name: string
  name_de: string
  description: string | null
  description_de: string | null
  category_id: string | null
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

  // Create the function (as custom, not system)
  const { data: newFunction, error } = await supabase
    .from('functions_master')
    .insert({
      name: data.name,
      name_de: data.name_de,
      description: data.description,
      description_de: data.description_de,
      category_id: data.category_id,
      is_system: false,
      active: true,
      sort_order: 100, // Custom functions at the end
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating function:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/members')
  return { success: true, data: newFunction }
}

/**
 * Update a function (name and description only for system functions)
 */
export async function updateFunction(functionId: string, data: {
  name: string
  name_de: string
  description: string | null
  description_de: string | null
  category_id: string | null
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

  // Check if function exists and get its system status
  const { data: existingFunction } = await supabase
    .from('functions_master')
    .select('is_system, code')
    .eq('id', functionId)
    .single()

  if (!existingFunction) {
    return { success: false, error: 'Function not found' }
  }

  // Update function (code cannot be changed for system functions due to database trigger)
  const { data: updatedFunction, error } = await supabase
    .from('functions_master')
    .update({
      name: data.name,
      name_de: data.name_de,
      description: data.description,
      description_de: data.description_de,
      category_id: data.category_id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', functionId)
    .select()
    .single()

  if (error) {
    console.error('Error updating function:', error)
    return { success: false, error: error.message }
  }

  // Refresh materialized view
  const { error: refreshError } = await supabase.rpc('refresh_users_with_functions_search')
  if (refreshError) {
    console.error('Error refreshing users search view:', refreshError)
  }

  revalidatePath('/members')
  return { success: true, data: updatedFunction }
}

/**
 * Delete a custom function (system functions cannot be deleted due to database trigger)
 */
export async function deleteFunction(functionId: string) {
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

  // Check if function is system function
  const { data: func } = await supabase
    .from('functions_master')
    .select('is_system, name')
    .eq('id', functionId)
    .single()

  if (func?.is_system) {
    return { success: false, error: 'System functions cannot be deleted. You can deactivate them instead.' }
  }

  // Delete the function (this will also delete user_function assignments due to CASCADE)
  const { error } = await supabase
    .from('functions_master')
    .delete()
    .eq('id', functionId)

  if (error) {
    console.error('Error deleting function:', error)
    // Check if error is due to database trigger
    if (error.message.includes('Cannot delete system function')) {
      return { success: false, error: 'System functions cannot be deleted' }
    }
    return { success: false, error: error.message }
  }

  // Refresh materialized view
  const { error: refreshError } = await supabase.rpc('refresh_users_with_functions_search')
  if (refreshError) {
    console.error('Error refreshing users search view:', refreshError)
  }

  revalidatePath('/members')
  return { success: true }
}

/**
 * Toggle active status of a function (useful for system functions)
 */
export async function toggleFunctionActive(functionId: string, active: boolean) {
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

  // Update active status
  const { error } = await supabase
    .from('functions_master')
    .update({
      active,
      updated_at: new Date().toISOString(),
    })
    .eq('id', functionId)

  if (error) {
    console.error('Error toggling function active status:', error)
    return { success: false, error: error.message }
  }

  // Refresh materialized view
  const { error: refreshError } = await supabase.rpc('refresh_users_with_functions_search')
  if (refreshError) {
    console.error('Error refreshing users search view:', refreshError)
  }

  revalidatePath('/members')
  return { success: true }
}
