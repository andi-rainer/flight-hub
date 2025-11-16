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
    const subcategoryId = formData.get('subcategoryId') as string | null
    const endorsementsJson = formData.get('endorsements') as string | null
    const endorsements = endorsementsJson ? JSON.parse(endorsementsJson) : []

    if (!file || !documentTypeId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only PDF and images are allowed.' }, { status: 400 })
    }

    // Get document definition info
    const { data: documentDefinition, error: docDefError } = await supabase
      .from('document_definitions')
      .select('*')
      .eq('id', documentTypeId)
      .single()

    if (docDefError || !documentDefinition) {
      return NextResponse.json({ error: 'Invalid document definition' }, { status: 400 })
    }

    // Upload file to Supabase Storage
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

    // For private buckets, store the file path - we'll generate signed URLs when needed
    const fileUrl = `documents/${fileName}`

    // Calculate expiry date if needed
    let calculatedExpiryDate = expiryDate

    // Note: document_definitions table doesn't have expiry_type or default_validity_months
    // User must provide expiry_date if the definition has expires=true
    // Removed automatic calculation - user provides expiry date during upload

    // Create document record
    // Auto-approve if uploaded by board member, otherwise requires approval
    // Note: category must be NULL for user documents (per documents_entity_check constraint)
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        name: documentDefinition.name,
        category: null, // Must be NULL for user documents
        tags: ['user-document'],
        file_url: fileUrl,
        uploaded_by: user.id,
        user_id: userId,
        plane_id: null,
        expiry_date: calculatedExpiryDate || null,
        approved: isBoardMember, // Auto-approve if uploaded by board member
        approved_by: isBoardMember ? user.id : null,
        approved_at: isBoardMember ? new Date().toISOString() : null,
        blocks_aircraft: false,
        document_definition_id: documentTypeId, // NEW: use document_definition_id instead of document_type_id
        subcategory_id: subcategoryId || null, // User-selected subcategory (e.g., PPL vs CPL, Class 1 vs Class 2)
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      // Cleanup uploaded file
      await supabase.storage.from('documents').remove([fileName])
      return NextResponse.json({ error: `Database error: ${dbError.message}` }, { status: 500 })
    }

    // Create user document endorsement records if provided
    if (endorsements.length > 0) {
      const endorsementRecords = endorsements.map((endorsement: any) => ({
        document_id: document.id,
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
        // Don't fail the whole upload, just log the error
        // The document was created successfully
      }
    }

    // Create notification for board members if this is a user document that requires approval
    if (userId && !isBoardMember) {
      // Get the user who is uploading to check their functions
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
          const notificationMessage = `${uploadingUser?.name || 'A user'} ${uploadingUser?.surname || ''} uploaded a document (${documentDefinition.name}) that needs approval.`

          for (const member of boardMembers) {
            const { error: notificationError } = await supabase.rpc('create_notification', {
              p_user_id: member.id,
              p_type: 'document_uploaded',
              p_title: 'New Document Uploaded',
              p_message: notificationMessage,
              p_link: `/members`,
              p_document_id: document.id,
              p_flightlog_id: null
            })

            if (notificationError) {
              console.error('Error creating notification:', notificationError)
              // Don't fail the upload if notification creation fails
            }
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
