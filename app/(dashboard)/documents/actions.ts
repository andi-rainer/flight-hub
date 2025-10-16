'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function uploadDocument(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Check if user is board member
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userData?.role?.includes('board')) {
    return { error: 'Unauthorized - Board members only' }
  }

  const file = formData.get('file') as File
  const name = formData.get('name') as string
  const category = formData.get('category') as string
  const tagsString = formData.get('tags') as string
  const tags = tagsString ? tagsString.split(',').map(t => t.trim()).filter(Boolean) : []

  if (!file || !name || !category) {
    return { error: 'Missing required fields' }
  }

  // Upload to Supabase Storage
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}-${name}.${fileExt}`
  const filePath = `${category}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('club-documents')
    .upload(filePath, file)

  if (uploadError) {
    return { error: `Upload failed: ${uploadError.message}` }
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('club-documents')
    .getPublicUrl(filePath)

  // Create database record
  const { error: dbError } = await supabase
    .from('documents')
    .insert({
      name,
      category,
      tags,
      file_url: publicUrl,
      uploaded_by: user.id,
      plane_id: null,
      user_id: null,
      approved: true, // Auto-approve club documents
    })

  if (dbError) {
    // Cleanup uploaded file
    await supabase.storage.from('club-documents').remove([filePath])
    return { error: `Database error: ${dbError.message}` }
  }

  revalidatePath('/documents')
  return { success: true }
}

export async function deleteDocument(documentId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Check if user is board member
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userData?.role?.includes('board')) {
    return { error: 'Unauthorized - Board members only' }
  }

  // Get document to find file URL
  const { data: doc } = await supabase
    .from('documents')
    .select('file_url, category')
    .eq('id', documentId)
    .single()

  if (!doc) {
    return { error: 'Document not found' }
  }

  // Extract file path from URL
  const urlParts = doc.file_url.split('/club-documents/')
  if (urlParts.length > 1) {
    const filePath = urlParts[1]
    await supabase.storage.from('club-documents').remove([filePath])
  }

  // Delete database record
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId)

  if (error) {
    return { error: `Delete failed: ${error.message}` }
  }

  revalidatePath('/documents')
  return { success: true }
}

export async function updateDocumentName(documentId: string, newName: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Check if user is board member
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userData?.role?.includes('board')) {
    return { error: 'Unauthorized - Board members only' }
  }

  const { error } = await supabase
    .from('documents')
    .update({ name: newName })
    .eq('id', documentId)

  if (error) {
    return { error: `Update failed: ${error.message}` }
  }

  revalidatePath('/documents')
  return { success: true }
}
