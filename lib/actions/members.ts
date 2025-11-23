'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/permissions'
import type { TablesUpdate } from '@/lib/database.types'
import { assignMembership } from './memberships'

/**
 * Server actions for Members page
 * Handles user management, role assignment, invitations, and document approval
 * All actions require proper permissions via RBAC system
 */

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export async function updateMember(userId: string, data: TablesUpdate<'users'>) {
  const supabase = await createClient()

  // Check permission to edit members
  const { user, error: permError } = await requirePermission(supabase, 'members.edit')
  if (permError || !user) {
    return { success: false, error: permError || 'Not authenticated' }
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

  // Check permission to create members
  const { user, error: permError } = await requirePermission(supabase, 'members.create')
  if (permError || !user) {
    return { success: false, error: permError || 'Not authenticated' }
  }

  // Check if the user already exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', data.email)
    .single()

  if (existingUser) {
    return { success: false, error: 'A user with this email already exists' }
  }

  // Use Supabase's invite flow which generates a proper 24-hour token
  const adminClient = createAdminClient()
  const redirectTo = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')

  console.log('[Invite User] Inviting user with redirect URL:', `${redirectTo}/auth/callback`)

  // Use the inviteUserByEmail which creates the user AND sends the invite in one step
  // This generates a proper invite token with 24-hour expiry
  const { data: authData, error: authError } = await adminClient.auth.admin.inviteUserByEmail(
    data.email,
    {
      redirectTo: `${redirectTo}/auth/callback`,
      data: {
        name: data.name,
        surname: data.surname,
      }
    }
  )

  if (authError) {
    console.error('Error inviting user:', authError)
    return { success: false, error: authError.message }
  }

  if (!authData.user) {
    console.error('No user data returned from invite')
    return { success: false, error: 'Failed to create user' }
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
      assigned_by: user.id, // Board member who created this user
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
  const { error: refreshError } = await supabase.rpc('refresh_users_with_functions_search')
  if (refreshError) console.error('Error refreshing users search view:', refreshError)

  revalidatePath('/members')
  return {
    success: true,
    message: 'User invited successfully with membership assigned. They will receive an email to set their password.'
  }
}

export async function resendOwnInvitation(email: string) {
  console.log('[Resend Own Invite] START - email:', email)

  // This is a public action - no authentication required
  // Users can resend their own invitation if it expired

  const supabase = await createClient()

  // Verify user exists with this email
  const { data: targetUser } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', email)
    .single()

  if (!targetUser) {
    console.log('[Resend Own Invite] User not found with email:', email)
    return { success: false, error: 'No invitation found for this email address' }
  }
  console.log('[Resend Own Invite] User found:', targetUser.email)

  // Get auth user details to check if already confirmed
  const adminClient = createAdminClient()
  const { data: authUser, error: getUserError } = await adminClient.auth.admin.getUserById(targetUser.id)

  if (getUserError || !authUser) {
    console.error('[Resend Own Invite] Error getting auth user:', getUserError)
    return { success: false, error: 'Could not retrieve user information' }
  }

  // If user is already confirmed, they should use password reset instead
  if (authUser.user.email_confirmed_at) {
    console.log('[Resend Own Invite] User already confirmed, cannot resend invitation')
    return {
      success: false,
      error: 'This account is already activated. Please use the "Forgot Password" link on the login page instead.'
    }
  }

  // User is not confirmed, send invitation
  const redirectTo = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
  console.log('[Resend Own Invite] Sending invitation with redirect URL:', `${redirectTo}/auth/callback`)

  const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    targetUser.email,
    { redirectTo: `${redirectTo}/auth/callback` }
  )

  if (inviteError) {
    console.error('[Resend Own Invite] Error resending invitation:', inviteError)
    return { success: false, error: inviteError.message }
  }

  console.log('[Resend Own Invite] Invitation sent successfully to:', targetUser.email)
  return {
    success: true,
    message: 'A new invitation link has been sent to your email address'
  }
}

export async function resendInvitation(userId: string) {
  console.log('[Resend Invite] START - userId:', userId, 'type:', typeof userId)
  const supabase = await createClient()

  // Check permission to edit members (resending invitation is an edit operation)
  const { user, error: permError } = await requirePermission(supabase, 'members.edit')
  if (permError || !user) {
    console.log('[Resend Invite] Permission denied:', permError)
    return { success: false, error: permError || 'Not authenticated' }
  }
  console.log('[Resend Invite] Permission granted to user:', user.id)

  // Get the user to resend invite to
  const { data: targetUser } = await supabase
    .from('users')
    .select('email')
    .eq('id', userId)
    .single()

  if (!targetUser) {
    console.log('[Resend Invite] Target user not found in DB for id:', userId)
    return { success: false, error: 'User not found' }
  }
  console.log('[Resend Invite] Target user found:', targetUser.email)

  // Get auth user details to check if confirmed
  const adminClient = createAdminClient()
  const { data: authUser, error: getUserError } = await adminClient.auth.admin.getUserById(userId)

  if (getUserError || !authUser) {
    console.error('[Resend Invite] Error getting auth user:', getUserError)
    return { success: false, error: 'Could not retrieve user information' }
  }
  console.log('[Resend Invite] Auth user confirmed:', !!authUser.user.email_confirmed_at)

  // If user is already confirmed, send password reset instead of invitation
  if (authUser.user.email_confirmed_at) {
    console.log('[Resend Invite] User already confirmed, sending password reset email')
    const redirectTo = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')

    // Use resetPasswordForEmail to actually send the email (works with local Supabase/Inbucket)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      targetUser.email,
      { redirectTo: `${redirectTo}/auth/callback` }
    )

    if (resetError) {
      console.error('[Resend Invite] Error sending password reset email:', resetError)
      return { success: false, error: resetError.message }
    }

    console.log('[Resend Invite] Password reset email sent successfully to:', targetUser.email)
    revalidatePath('/members')
    return {
      success: true,
      message: 'Password reset email sent successfully'
    }
  }

  // User is not confirmed, send regular invitation with explicit redirect URL
  const redirectTo = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
  console.log('[Resend Invite] Sending invitation with redirect URL:', `${redirectTo}/auth/callback`)
  const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    targetUser.email,
    { redirectTo: `${redirectTo}/auth/callback` }
  )

  if (inviteError) {
    console.error('[Resend Invite] Error resending invitation:', inviteError)
    return { success: false, error: inviteError.message }
  }

  console.log('[Resend Invite] Invitation sent successfully to:', targetUser.email)
  revalidatePath('/members')
  return {
    success: true,
    message: 'Invitation email sent successfully'
  }
}

export async function deleteMember(userId: string) {
  const supabase = await createClient()

  // Check permission to delete members
  const { user, error: permError } = await requirePermission(supabase, 'members.delete')
  if (permError || !user) {
    return { success: false, error: permError || 'Not authenticated' }
  }

  // Prevent deleting yourself
  if (userId === user.id) {
    return { success: false, error: 'You cannot delete your own account' }
  }

  // Check if user is already deleted
  const { data: targetUser } = await supabase
    .from('users')
    .select('email, name, surname')
    .eq('id', userId)
    .single()

  if (!targetUser) {
    return { success: false, error: 'User not found' }
  }

  if (targetUser.email?.includes('@deleted.local')) {
    return {
      success: false,
      error: 'User has already been deleted'
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
      .map(doc => {
        // Extract file path from signed URL or public URL
        const urlParts = doc.file_url.split('/')
        const bucketIndex = urlParts.findIndex(part => part === 'user-documents')
        if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
          return urlParts.slice(bucketIndex + 1).join('/')
        }
        return doc.file_url.split('/').pop()
      })
      .filter(Boolean) as string[]

    if (filePaths.length > 0) {
      await supabase.storage
        .from('user-documents')
        .remove(filePaths)
    }
  }

  // Delete user's documents from database
  await supabase
    .from('documents')
    .delete()
    .eq('user_id', userId)

  // Delete from auth using admin client - try multiple times with delay
  const adminClient = createAdminClient()
  let authDeleted = false
  let lastAuthError = null

  for (let attempt = 1; attempt <= 3; attempt++) {
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId)

    if (!authDeleteError) {
      authDeleted = true
      break
    }

    lastAuthError = authDeleteError

    // If user not found, consider it deleted
    if (authDeleteError.message?.toLowerCase().includes('user not found')) {
      authDeleted = true
      break
    }

    // Wait before retry (except on last attempt)
    if (attempt < 3) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  if (!authDeleted) {
    console.error('Failed to delete auth user after 3 attempts:', lastAuthError)
  }

  // GDPR-compliant deletion: Remove all personal data except name for historical records
  // Keep only: id, name, surname, left_at
  // This ensures flight logs and created_by references still work
  const timestamp = Date.now()
  const { error: updateError } = await supabase
    .from('users')
    .update({
      // Clear all personal data
      email: `deleted-${timestamp}@deleted.local`,
      license_number: null,
      telephone: null,
      birthday: null,
      street: null,
      house_number: null,
      city: null,
      zip: null,
      country: null,
      emergency_contact_name: null,
      emergency_contact_phone: null,
      member_category: null,
      joined_at: null,
      functions: [],
      role: [],

      // Mark as deleted
      left_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (updateError) {
    console.error('Error deleting user data:', updateError)
    return { success: false, error: 'Failed to remove user data: ' + updateError.message }
  }

  revalidatePath('/members')

  if (!authDeleted) {
    return {
      success: true,
      message: 'User data deleted. WARNING: Authentication access could not be removed - please delete manually from Supabase Dashboard (Authentication → Users).'
    }
  }

  return {
    success: true,
    message: 'User deleted successfully. All personal data has been removed.'
  }
}

// ============================================================================
// DOCUMENT APPROVAL
// ============================================================================

export async function approveUserDocument(documentId: string, subcategoryId?: string | null) {
  const supabase = await createClient()

  // Check permission to approve documents
  const { user, error: permError } = await requirePermission(supabase, 'documents.approve')
  if (permError || !user) {
    return { success: false, error: permError || 'Not authenticated' }
  }

  // Update document approval status and optionally subcategory
  const updateData: any = {
    approved: true,
    approved_by: user.id,
    approved_at: new Date().toISOString(),
  }

  // If subcategory is provided, update it
  if (subcategoryId !== undefined) {
    updateData.subcategory_id = subcategoryId
  }

  const { error } = await supabase
    .from('documents')
    .update(updateData)
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

  // Check permission to approve/unapprove documents
  const { user, error: permError } = await requirePermission(supabase, 'documents.approve')
  if (permError || !user) {
    return { success: false, error: permError || 'Not authenticated' }
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

  // Check permission to delete documents
  const { user, error: permError } = await requirePermission(supabase, 'documents.delete')
  if (permError || !user) {
    return { success: false, error: permError || 'Not authenticated' }
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

  // Check permission to view all documents (board members can upload for others)
  const { user, error: permError } = await requirePermission(supabase, 'documents.view.all')
  if (permError || !user) {
    return { success: false, error: permError || 'Not authenticated' }
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
