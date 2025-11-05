'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/permissions'
import type { UserUpdate } from '@/lib/database.types'
import { assignMembership } from './memberships'

/**
 * Server actions for Members page
 * Handles user management, role assignment, invitations, and document approval
 * All actions require proper permissions via RBAC system
 */

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export async function updateMember(userId: string, data: UserUpdate) {
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
  const adminClient = createAdminClient()

  // Create user without confirming email
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: data.email,
    email_confirm: false, // Don't auto-confirm - user needs to set password via email
    user_metadata: {
      name: data.name,
      surname: data.surname,
    }
  })

  if (authError) {
    console.error('Error creating user:', authError)
    return { success: false, error: authError.message }
  }

  // Send invitation email
  const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(data.email)

  if (inviteError) {
    console.error('Error sending invitation email:', inviteError)
    // Don't fail the entire operation - user is created, they can be invited later
    console.warn('User created but invitation email failed to send. Use resend invitation.')
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

export async function resendInvitation(userId: string) {
  const supabase = await createClient()

  // Check permission to edit members (resending invitation is an edit operation)
  const { user, error: permError } = await requirePermission(supabase, 'members.edit')
  if (permError || !user) {
    return { success: false, error: permError || 'Not authenticated' }
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

  // Get auth user details to check if confirmed
  const adminClient = createAdminClient()
  const { data: authUser, error: getUserError } = await adminClient.auth.admin.getUserById(userId)

  if (getUserError || !authUser) {
    console.error('Error getting user:', getUserError)
    return { success: false, error: 'Could not retrieve user information' }
  }

  // If user is already confirmed, send password reset instead of invitation
  if (authUser.user.email_confirmed_at) {
    const { data: resetLink, error: resetError } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: targetUser.email,
    })

    if (resetError) {
      console.error('Error generating reset link:', resetError)
      return { success: false, error: resetError.message }
    }

    // Note: The reset link is generated but Supabase should send the email automatically
    revalidatePath('/members')
    return {
      success: true,
      message: 'Password reset email sent successfully'
    }
  }

  // User is not confirmed, send regular invitation
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

export async function approveUserDocument(documentId: string) {
  const supabase = await createClient()

  // Check permission to approve documents
  const { user, error: permError } = await requirePermission(supabase, 'documents.approve')
  if (permError || !user) {
    return { success: false, error: permError || 'Not authenticated' }
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
