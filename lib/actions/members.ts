'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { UserUpdate } from '@/lib/database.types'

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

  // Invite user via Supabase Auth
  // Note: This requires SMTP configuration in Supabase
  const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(
    data.email,
    {
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

  // Create user profile
  const { error: profileError } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      email: data.email,
      name: data.name,
      surname: data.surname,
      functions: data.functions,
      role: data.role || ['member'],
    })

  if (profileError) {
    console.error('Error creating user profile:', profileError)
    return { success: false, error: profileError.message }
  }

  revalidatePath('/members')
  return {
    success: true,
    message: 'User invited successfully. They will receive an email to set their password.'
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
