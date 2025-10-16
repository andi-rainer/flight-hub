'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { PlaneInsert, PlaneUpdate } from '@/lib/database.types'

/**
 * Check if the current user is a board member
 */
async function checkBoardMemberAccess(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role?.includes('board') ?? false
}

/**
 * Create a new aircraft (board members only)
 */
export async function createAircraft(data: PlaneInsert) {
  const isBoardMember = await checkBoardMemberAccess()

  if (!isBoardMember) {
    return { error: 'Unauthorized: Only board members can create aircraft' }
  }

  const supabase = await createClient()

  const { data: aircraft, error } = await supabase
    .from('planes')
    .insert(data)
    .select()
    .single()

  if (error) {
    console.error('Error creating aircraft:', error)
    return { error: error.message }
  }

  revalidatePath('/aircrafts')
  return { data: aircraft }
}

/**
 * Update an existing aircraft (board members only)
 */
export async function updateAircraft(id: string, data: PlaneUpdate) {
  const isBoardMember = await checkBoardMemberAccess()

  if (!isBoardMember) {
    return { error: 'Unauthorized: Only board members can update aircraft' }
  }

  const supabase = await createClient()

  const { data: aircraft, error } = await supabase
    .from('planes')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating aircraft:', error)
    return { error: error.message }
  }

  revalidatePath('/aircrafts')
  revalidatePath(`/aircrafts/${id}`)
  return { data: aircraft }
}

/**
 * Upload a document for an aircraft (board members only)
 */
export async function uploadAircraftDocument(formData: FormData) {
  const isBoardMember = await checkBoardMemberAccess()

  if (!isBoardMember) {
    return { error: 'Unauthorized: Only board members can upload documents' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  const file = formData.get('file') as File
  const planeId = formData.get('planeId') as string
  const name = formData.get('name') as string
  const tags = formData.get('tags') as string
  const expiryDate = formData.get('expiryDate') as string | null
  const blocksAircraft = formData.get('blocksAircraft') === 'true'

  if (!file || !planeId || !name) {
    return { error: 'Missing required fields' }
  }

  // Upload file to Supabase Storage
  const fileExt = file.name.split('.').pop()
  const fileName = `${planeId}/${Date.now()}.${fileExt}`

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('aircraft-documents')
    .upload(fileName, file)

  if (uploadError) {
    console.error('Error uploading file:', uploadError)
    return { error: uploadError.message }
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('aircraft-documents')
    .getPublicUrl(uploadData.path)

  // Create document record
  const tagsArray = tags ? tags.split(',').map(t => t.trim()) : []

  const { data: document, error: dbError } = await supabase
    .from('documents')
    .insert({
      plane_id: planeId,
      name,
      file_url: publicUrl,
      tags: tagsArray,
      uploaded_by: user.id,
      expiry_date: expiryDate || null,
      blocks_aircraft: blocksAircraft,
      approved: false,
    })
    .select()
    .single()

  if (dbError) {
    console.error('Error creating document record:', dbError)
    // Clean up uploaded file
    await supabase.storage.from('aircraft-documents').remove([uploadData.path])
    return { error: dbError.message }
  }

  revalidatePath(`/aircrafts/${planeId}`)
  return { data: document }
}

/**
 * Delete an aircraft document (board members only)
 */
export async function deleteAircraftDocument(documentId: string, planeId: string) {
  const isBoardMember = await checkBoardMemberAccess()

  if (!isBoardMember) {
    return { error: 'Unauthorized: Only board members can delete documents' }
  }

  const supabase = await createClient()

  // Get document to find file URL
  const { data: document } = await supabase
    .from('documents')
    .select('file_url')
    .eq('id', documentId)
    .single()

  if (document?.file_url) {
    // Extract file path from URL
    const urlParts = document.file_url.split('aircraft-documents/')
    if (urlParts.length > 1) {
      const filePath = urlParts[1]
      await supabase.storage.from('aircraft-documents').remove([filePath])
    }
  }

  // Delete document record
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId)

  if (error) {
    console.error('Error deleting document:', error)
    return { error: error.message }
  }

  revalidatePath(`/aircrafts/${planeId}`)
  return { success: true }
}

/**
 * Toggle document approval status (board members only)
 */
export async function toggleDocumentApproval(documentId: string, planeId: string, approved: boolean) {
  const isBoardMember = await checkBoardMemberAccess()

  if (!isBoardMember) {
    return { error: 'Unauthorized: Only board members can approve documents' }
  }

  const supabase = await createClient()

  const { data: document, error } = await supabase
    .from('documents')
    .update({ approved })
    .eq('id', documentId)
    .select()
    .single()

  if (error) {
    console.error('Error updating document:', error)
    return { error: error.message }
  }

  revalidatePath(`/aircrafts/${planeId}`)
  return { data: document }
}

/**
 * Update document name (board members only)
 */
export async function updateDocumentName(documentId: string, planeId: string, name: string) {
  const isBoardMember = await checkBoardMemberAccess()

  if (!isBoardMember) {
    return { error: 'Unauthorized: Only board members can update documents' }
  }

  const supabase = await createClient()

  const { data: document, error } = await supabase
    .from('documents')
    .update({ name })
    .eq('id', documentId)
    .select()
    .single()

  if (error) {
    console.error('Error updating document name:', error)
    return { error: error.message }
  }

  revalidatePath(`/aircrafts/${planeId}`)
  return { data: document }
}
