import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is board member
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const isBoardMember = profile?.role?.includes('board') ?? false

    const formData = await request.formData()
    const file = formData.get('file') as File
    const documentTypeId = formData.get('documentTypeId') as string
    const userId = formData.get('userId') as string
    const expiryDate = formData.get('expiryDate') as string | null

    if (!file || !documentTypeId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only PDF and images are allowed.' }, { status: 400 })
    }

    // Get document type info
    const { data: documentType, error: docTypeError } = await supabase
      .from('document_types')
      .select('*')
      .eq('id', documentTypeId)
      .single()

    if (docTypeError || !documentType) {
      return NextResponse.json({ error: 'Invalid document type' }, { status: 400 })
    }

    // Upload file to Supabase Storage
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

    // For private buckets, store the file path - we'll generate signed URLs when needed
    const fileUrl = `documents/${fileName}`

    // Calculate expiry date if needed
    let calculatedExpiryDate = expiryDate

    if (!calculatedExpiryDate && documentType.expires && documentType.expiry_type === 'DURATION' && documentType.default_validity_months) {
      const expiry = new Date()
      expiry.setMonth(expiry.getMonth() + documentType.default_validity_months)
      calculatedExpiryDate = expiry.toISOString().split('T')[0]
    }

    // Create document record
    // Auto-approve if uploaded by board member, otherwise requires approval
    // Note: category must be NULL for user documents (per documents_entity_check constraint)
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        name: documentType.name,
        category: null, // Must be NULL for user documents
        tags: [documentType.category || 'user-document'],
        file_url: fileUrl,
        uploaded_by: user.id,
        user_id: userId,
        plane_id: null,
        expiry_date: calculatedExpiryDate || null,
        approved: isBoardMember, // Auto-approve if uploaded by board member
        approved_by: isBoardMember ? user.id : null,
        approved_at: isBoardMember ? new Date().toISOString() : null,
        blocks_aircraft: false,
        document_type_id: documentTypeId,
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      // Cleanup uploaded file
      await supabase.storage.from('documents').remove([fileName])
      return NextResponse.json({ error: `Database error: ${dbError.message}` }, { status: 500 })
    }

    // Create notification for board members if this is a user document that requires approval
    if (userId && !isBoardMember) {
      // Get the user who is uploading to check their functions
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
          // Create notifications for all board members
          const notifications = boardMembers.map(boardMember => ({
            user_id: boardMember.id,
            type: 'document_uploaded',
            title: 'New Document Uploaded',
            message: `${uploadingUser?.name || 'A user'} ${uploadingUser?.surname || ''} uploaded a document (${documentType.name}) that needs approval.`,
            link: `/members`,
            document_id: document.id,
            read: false,
          }))

          const { error: notificationError } = await supabase
            .from('notifications')
            .insert(notifications)

          if (notificationError) {
            console.error('Error creating notifications:', notificationError)
            // Don't fail the upload if notification creation fails
          }
        }
      }
    }

    return NextResponse.json({ document, url: fileUrl })
  } catch (error) {
    console.error('Error in POST /api/documents/upload:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
