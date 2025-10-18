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
    const fileName = `user-${userId}-${documentType.name.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.${fileExt}`
    const filePath = `user-documents/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('club-documents')
      .upload(filePath, file)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('club-documents')
      .getPublicUrl(filePath)

    // Calculate expiry date if needed
    let calculatedExpiryDate = expiryDate

    if (!calculatedExpiryDate && documentType.expires && documentType.expiry_type === 'DURATION' && documentType.default_validity_months) {
      const expiry = new Date()
      expiry.setMonth(expiry.getMonth() + documentType.default_validity_months)
      calculatedExpiryDate = expiry.toISOString().split('T')[0]
    }

    // Create document record
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        name: documentType.name,
        category: documentType.category,
        tags: [documentType.category || 'user-document'],
        file_url: publicUrl,
        uploaded_by: user.id,
        user_id: userId,
        plane_id: null,
        expiry_date: calculatedExpiryDate || null,
        approved: false, // Requires board approval
        blocks_aircraft: false,
        document_type_id: documentTypeId,
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      // Cleanup uploaded file
      await supabase.storage.from('club-documents').remove([filePath])
      return NextResponse.json({ error: `Database error: ${dbError.message}` }, { status: 500 })
    }

    return NextResponse.json({ document, url: publicUrl })
  } catch (error) {
    console.error('Error in POST /api/documents/upload:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
