import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const documentId = formData.get('documentId') as string
    const userId = formData.get('userId') as string
    const expiryDate = formData.get('expiryDate') as string | null

    if (!file || !documentId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only PDF and images are allowed.' }, { status: 400 })
    }

    // Get existing document
    const { data: existingDoc, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !existingDoc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Verify user owns this document
    if (existingDoc.user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get document type info
    const { data: documentType, error: docTypeError } = await supabase
      .from('document_types')
      .select('*')
      .eq('id', existingDoc.document_type_id)
      .single()

    if (docTypeError || !documentType) {
      return NextResponse.json({ error: 'Document type not found' }, { status: 400 })
    }

    // Upload new file to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const timestamp = Date.now()
    const fileName = `${userId}/${documentType.name.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, file)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
    }

    const fileUrl = `documents/${fileName}`

    // Calculate expiry date if needed
    let calculatedExpiryDate = expiryDate

    if (!calculatedExpiryDate && documentType.expires && documentType.expiry_type === 'DURATION' && documentType.default_validity_months) {
      const expiry = new Date()
      expiry.setMonth(expiry.getMonth() + documentType.default_validity_months)
      calculatedExpiryDate = expiry.toISOString().split('T')[0]
    }

    // Update document record with new file URL and reset approval status
    const { data: updatedDoc, error: updateError } = await supabase
      .from('documents')
      .update({
        file_url: fileUrl,
        expiry_date: calculatedExpiryDate || null,
        approved: false,
        approved_by: null,
        approved_at: null,
        uploaded_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .select()
      .single()

    if (updateError) {
      console.error('Database error:', updateError)
      // Cleanup uploaded file
      await supabase.storage.from('documents').remove([fileName])
      return NextResponse.json({ error: `Database error: ${updateError.message}` }, { status: 500 })
    }

    if (!updatedDoc) {
      console.error('Document update returned no data')
      // Cleanup uploaded file
      await supabase.storage.from('documents').remove([fileName])
      return NextResponse.json({ error: 'Failed to update document record' }, { status: 500 })
    }

    // Delete old file from storage
    if (existingDoc.file_url) {
      const oldFilePath = existingDoc.file_url.replace('documents/', '')
      await supabase.storage.from('documents').remove([oldFilePath])
    }

    // Create notification for board members
    const { data: uploadingUser } = await supabase
      .from('users')
      .select('name, surname')
      .eq('id', userId)
      .single()

    // Get user's function IDs
    const { data: userFunctionsData } = await supabase
      .from('user_functions')
      .select('function_id')
      .eq('user_id', userId)

    const userFunctionIds = userFunctionsData?.map(uf => uf.function_id) || []

    // Check if document is required (either globally mandatory or required for user's functions)
    const isRequired = documentType.mandatory ||
      (userFunctionIds.length > 0 && documentType.required_for_functions.some(
        (reqFuncId: string) => userFunctionIds.includes(reqFuncId)
      ))

    if (isRequired) {
      // Get all board members
      const { data: boardMembers } = await supabase
        .from('users')
        .select('id')
        .overlaps('role', ['board'])

      if (boardMembers && boardMembers.length > 0) {
        // Create notifications for all board members using RPC function to bypass RLS
        const notificationMessage = `${uploadingUser?.name || 'A user'} ${uploadingUser?.surname || ''} renewed their document (${documentType.name}) and it needs approval.`

        for (const member of boardMembers) {
          const { error: notificationError } = await supabase.rpc('create_notification', {
            p_user_id: member.id,
            p_type: 'document_uploaded',
            p_title: 'Document Renewed',
            p_message: notificationMessage,
            p_link: `/members`,
            p_document_id: documentId,
            p_flightlog_id: null
          })

          if (notificationError) {
            console.error('Error creating notification:', notificationError)
            // Don't fail the renewal if notification creation fails
          }
        }
      }
    }

    return NextResponse.json({ success: true, url: fileUrl })
  } catch (error) {
    console.error('Error in POST /api/documents/renew:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
