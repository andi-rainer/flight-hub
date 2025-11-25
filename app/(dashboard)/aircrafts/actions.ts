'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requirePermission, requireBoardMember } from '@/lib/permissions'
import type { PlaneInsert, PlaneUpdate } from '@/lib/database.types'

/**
 * Create a new aircraft
 * Requires: aircraft.create permission (board members only)
 */
export async function createAircraft(data: PlaneInsert) {
  const supabase = await createClient()

  // Check permission to create aircraft
  const { user, error: permError } = await requirePermission(supabase, 'aircraft.create')
  if (permError || !user) {
    return { error: permError || 'Unauthorized' }
  }

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
 * Update an existing aircraft
 * Requires: aircraft.edit permission (board members or chief pilot)
 */
export async function updateAircraft(id: string, data: PlaneUpdate) {
  const supabase = await createClient()

  // Check permission to edit aircraft
  const { user, error: permError } = await requirePermission(supabase, 'aircraft.edit')
  if (permError || !user) {
    return { error: permError || 'Unauthorized' }
  }

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
 * Upload a document for an aircraft (board members and chief pilot)
 */
export async function uploadAircraftDocument(formData: FormData) {
  const supabase = await createClient()

  // Check permission to upload aircraft documents
  const { user, error: permError } = await requirePermission(supabase, 'aircraft.documents.upload')
  if (permError || !user) {
    return { error: permError || 'Unauthorized' }
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

  // Validate file size (25MB max)
  const maxSize = 25 * 1024 * 1024 // 25MB in bytes
  if (file.size > maxSize) {
    return { error: 'File size must be less than 25MB' }
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

  // Generate signed URL (valid for 10 years) since bucket is private
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from('aircraft-documents')
    .createSignedUrl(uploadData.path, 315360000) // 10 years in seconds

  if (signedUrlError) {
    console.error('Error creating signed URL:', signedUrlError)
    // Clean up uploaded file
    await supabase.storage.from('aircraft-documents').remove([uploadData.path])
    return { error: signedUrlError.message }
  }

  const fileUrl = signedUrlData.signedUrl

  // Create document record
  const tagsArray = tags ? tags.split(',').map(t => t.trim()) : []

  const { data: document, error: dbError } = await supabase
    .from('documents')
    .insert({
      plane_id: planeId,
      name,
      file_url: fileUrl,
      tags: tagsArray,
      uploaded_by: user.id,
      expiry_date: expiryDate || null,
      blocks_aircraft: blocksAircraft,
      approved: true, // Aircraft documents are auto-approved
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
  const supabase = await createClient()

  // Check board member access
  const { user, error: permError } = await requireBoardMember(supabase)
  if (permError || !user) {
    return { error: permError || 'Unauthorized: Only board members can delete documents' }
  }

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
  const supabase = await createClient()

  // Check board member access
  const { user, error: permError } = await requireBoardMember(supabase)
  if (permError || !user) {
    return { error: permError || 'Unauthorized: Only board members can approve documents' }
  }

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
  const supabase = await createClient()

  // Check board member access
  const { user, error: permError } = await requireBoardMember(supabase)
  if (permError || !user) {
    return { error: permError || 'Unauthorized: Only board members can update documents' }
  }

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
