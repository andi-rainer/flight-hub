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
    const endorsementsJson = formData.get('endorsements') as string | null
    const endorsements = endorsementsJson ? JSON.parse(endorsementsJson) : []

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

    // Get document definition info
    const { data: documentDefinition, error: docDefError } = await supabase
      .from('document_definitions')
      .select('*')
      .eq('id', existingDoc.document_definition_id)
      .single()

    if (docDefError || !documentDefinition) {
      return NextResponse.json({ error: 'Document definition not found' }, { status: 400 })
    }

    // Upload new file to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const timestamp = Date.now()
    const fileName = `${userId}/${documentDefinition.name.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, file)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
    }

    const fileUrl = `documents/${fileName}`

    // Calculate expiry date if needed
    const calculatedExpiryDate = expiryDate

    // Note: document_definitions table doesn't have expiry_type or default_validity_months
    // User must provide expiry_date during renewal

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

    // Update user document endorsements - delete old ones and create new ones
    if (endorsements.length > 0) {
      // Delete existing user document endorsements for this document
      const { error: deleteError } = await supabase
        .from('user_document_endorsements')
        .delete()
        .eq('document_id', documentId)

      if (deleteError) {
        console.error('Error deleting old user document endorsements:', deleteError)
        // Don't fail the renewal, just log the error
      }

      // Create new user document endorsement records
      const endorsementRecords = endorsements.map((endorsement: any) => ({
        document_id: documentId,
        endorsement_id: endorsement.endorsementId,
        expiry_date: endorsement.expiryDate || null,
        has_ir: endorsement.hasIR || false,
        ir_expiry_date: endorsement.irExpiryDate || null,
      }))

      const { error: endorsementError } = await supabase
        .from('user_document_endorsements')
        .insert(endorsementRecords)

      if (endorsementError) {
        console.error('Error creating user document endorsements:', endorsementError)
        // Don't fail the renewal, just log the error
      }
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

    // Get user's function codes for comparison with required_for_functions
    const { data: userFunctionsWithCodes } = await supabase
      .from('user_functions')
      .select('functions_master(code)')
      .eq('user_id', userId)

    const userFunctionCodes = userFunctionsWithCodes?.map((uf: any) => uf.functions_master?.code).filter(Boolean) || []

    // Check if document is required (either globally mandatory or required for user's functions)
    const isRequired = documentDefinition.mandatory ||
      (userFunctionCodes.length > 0 && documentDefinition.required_for_functions.some(
        (reqFuncCode: string) => userFunctionCodes.includes(reqFuncCode)
      ))

    if (isRequired) {
      // Get all board members
      const { data: boardMembers } = await supabase
        .from('users')
        .select('id')
        .overlaps('role', ['board'])

      if (boardMembers && boardMembers.length > 0) {
        // Create notifications for all board members using RPC function to bypass RLS
        const notificationMessage = `${uploadingUser?.name || 'A user'} ${uploadingUser?.surname || ''} renewed their document (${documentDefinition.name}) and it needs approval.`

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
