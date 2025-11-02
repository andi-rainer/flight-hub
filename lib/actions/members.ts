'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { UserUpdate } from '@/lib/database.types'
import { assignMembership } from './memberships'

/**
 * Server actions for Members page
 * Handles user management, role assignment, invitations, and document approval
 */

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export async function updateMember(userId: string, data: UserUpdate) {
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

  // Update member
  const { data: updatedUser, error } = await supabase
    .from('users')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating member:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/members')
  return { success: true, data: updatedUser }
}

export async function inviteUser(data: {
  email: string
  name: string
  surname: string
  functions: string[]
  role?: string[]
  membershipTypeId: string
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

  // Check if user already exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', data.email)
    .single()

  if (existingUser) {
    return { success: false, error: 'A user with this email already exists' }
  }

  // Create user via Supabase Auth using admin client
  // For testing/development, create user without email confirmation
  const adminClient = createAdminClient()

  // Try to create user directly (better for testing environments without SMTP)
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: data.email,
    email_confirm: true, // Auto-confirm email for easier testing
    user_metadata: {
      name: data.name,
      surname: data.surname,
    }
  })

  if (authError) {
    console.error('Error creating user:', authError)
    return { success: false, error: authError.message }
  }

  // Create or update user profile using upsert (in case profile was auto-created by trigger)
  const { error: profileError } = await supabase
    .from('users')
    .upsert({
      id: authData.user.id,
      email: data.email,
      name: data.name,
      surname: data.surname,
      role: data.role || ['member'],
    }, {
      onConflict: 'id'
    })

  if (profileError) {
    console.error('Error creating user profile:', profileError)
    // If profile creation fails, try to delete the auth user to maintain consistency
    await adminClient.auth.admin.deleteUser(authData.user.id)
    return { success: false, error: profileError.message }
  }

  // Assign functions to user via user_functions junction table
  if (data.functions && data.functions.length > 0) {
    const functionAssignments = data.functions.map(functionId => ({
      user_id: authData.user.id,
      function_id: functionId,
      assigned_at: new Date().toISOString(),
      assigned_by: user, // Board member who created this user
    }))

    const { error: functionsError } = await supabase
      .from('user_functions')
      .insert(functionAssignments)

    if (functionsError) {
      console.error('Error assigning functions:', functionsError)
      // Continue anyway - user is created, functions can be assigned later
    }
  }

  // Assign membership to the new user (required)
  const membershipResult = await assignMembership({
    user_id: authData.user.id,
    membership_type_id: data.membershipTypeId,
    start_date: new Date().toISOString().split('T')[0],
    payment_status: 'unpaid',
    notes: 'Membership assigned during user invitation',
  })

  if (!membershipResult.success) {
    console.error('Error assigning membership:', membershipResult.error)
    // If membership assignment fails, delete the auth user and profile
    await adminClient.auth.admin.deleteUser(authData.user.id)
    return { success: false, error: `User created but membership assignment failed: ${membershipResult.error}` }
  }

  // Refresh materialized view so PersonSelector shows new user with functions
  await supabase.rpc('refresh_users_with_functions_search').catch(console.error)

  revalidatePath('/members')
  return {
    success: true,
    message: 'User invited successfully with membership assigned. They will receive an email to set their password.'
  }
}

export async function resendInvitation(userId: string) {
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

  // Get the user to resend invite to
  const { data: targetUser } = await supabase
    .from('users')
    .select('email')
    .eq('id', userId)
    .single()

  if (!targetUser) {
    return { success: false, error: 'User not found' }
  }

  // Resend invitation using admin client
  const adminClient = createAdminClient()
  const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    targetUser.email
  )

  if (inviteError) {
    console.error('Error resending invitation:', inviteError)
    return { success: false, error: inviteError.message }
  }

  revalidatePath('/members')
  return {
    success: true,
    message: 'Invitation resent successfully'
  }
}

export async function deleteMember(userId: string) {
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

  // Prevent deleting yourself
  if (userId === user.id) {
    return { success: false, error: 'You cannot delete your own account' }
  }

  // Check if user has associated flight logs
  const { data: flightLogs } = await supabase
    .from('flightlog')
    .select('id')
    .or(`pic_id.eq.${userId},sic_id.eq.${userId}`)
    .limit(1)

  if (flightLogs && flightLogs.length > 0) {
    return {
      success: false,
      error: 'Cannot delete user with associated flight logs. Please reassign or delete flight logs first.'
    }
  }

  // Get user's documents for cleanup
  const { data: userDocuments } = await supabase
    .from('documents')
    .select('id, file_url')
    .eq('user_id', userId)

  // Delete user's documents from storage
  if (userDocuments && userDocuments.length > 0) {
    const filePaths = userDocuments
      .map(doc => doc.file_url.split('/').pop())
      .filter(Boolean) as string[]

    if (filePaths.length > 0) {
      await supabase.storage
        .from('documents')
        .remove(filePaths)
    }
  }

  // Delete user's documents from database
  await supabase
    .from('documents')
    .delete()
    .eq('user_id', userId)

  // Soft delete: Mark user as left and keep data for historical records
  // This ensures flight logs and other records still show the user's name
  const { error: updateError } = await supabase
    .from('users')
    .update({
      left_at: new Date().toISOString(),
      email: `deleted_${userId}@deleted.local`, // Prevent email conflicts if they rejoin
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (updateError) {
    console.error('Error soft deleting user profile:', updateError)
    return { success: false, error: updateError.message }
  }

  // Delete from auth using admin client (removes login capability but keeps DB record)
  const adminClient = createAdminClient()
  const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId)

  if (authDeleteError) {
    console.error('Error deleting auth user:', authDeleteError)
    return { success: false, error: 'Failed to remove authentication access' }
  }

  revalidatePath('/members')
  return {
    success: true,
    message: 'User removed successfully. User data retained for historical records.'
  }
}

// ============================================================================
// DOCUMENT APPROVAL
// ============================================================================

export async function approveUserDocument(documentId: string) {
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

  // Update document approval status
  const { error } = await supabase
    .from('documents')
    .update({
      approved: true,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', documentId)

  if (error) {
    console.error('Error approving document:', error)
    return { success: false, error: error.message }
  }

  // Mark related notifications as read
  await supabase
    .from('notifications')
    .update({
      read: true,
      read_at: new Date().toISOString(),
    })
    .eq('document_id', documentId)
    .eq('type', 'document_uploaded')

  revalidatePath('/members')
  return { success: true }
}

export async function unapproveUserDocument(documentId: string) {
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

  // Update document approval status
  const { error } = await supabase
    .from('documents')
    .update({
      approved: false,
      approved_by: null,
      approved_at: null,
    })
    .eq('id', documentId)

  if (error) {
    console.error('Error unapproving document:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/members')
  return { success: true }
}

export async function deleteUserDocument(documentId: string) {
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

  // Get document info for file deletion
  const { data: document } = await supabase
    .from('documents')
    .select('file_url')
    .eq('id', documentId)
    .single()

  if (!document) {
    return { success: false, error: 'Document not found' }
  }

  // Delete from storage
  const filePath = document.file_url.split('/').pop()
  if (filePath) {
    await supabase.storage
      .from('documents')
      .remove([filePath])
  }

  // Delete from database
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId)

  if (error) {
    console.error('Error deleting document:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/members')
  return { success: true }
}

// ============================================================================
// DOCUMENT UPLOAD (Board can upload for users)
// ============================================================================

export async function uploadUserDocument(data: {
  userId: string
  file: File
  category: string
  name: string
  expiryDate?: string
  tags?: string[]
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

  // Upload file to storage
  const fileExt = data.file.name.split('.').pop()
  const fileName = `${data.userId}/${Date.now()}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(fileName, data.file)

  if (uploadError) {
    console.error('Error uploading file:', uploadError)
    return { success: false, error: uploadError.message }
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('documents')
    .getPublicUrl(fileName)

  // Create document record
  const { error: dbError } = await supabase
    .from('documents')
    .insert({
      user_id: data.userId,
      name: data.name,
      category: data.category,
      file_url: publicUrl,
      uploaded_by: user.id,
      expiry_date: data.expiryDate || null,
      tags: data.tags || [],
      approved: true, // Auto-approve when uploaded by board
      blocks_aircraft: false,
    })

  if (dbError) {
    console.error('Error creating document record:', dbError)
    // Clean up uploaded file
    await supabase.storage.from('documents').remove([fileName])
    return { success: false, error: dbError.message }
  }

  revalidatePath('/members')
  return { success: true }
}
