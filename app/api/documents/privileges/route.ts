import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    const { data: privileges, error } = await supabase
      .from('document_privileges')
      .select(`
        *,
        document_endorsements (
          id,
          name,
          code,
          description
        ),
        users (
          id,
          name,
          surname
        )
      `)
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching document privileges:', error)
      return NextResponse.json({ error: 'Failed to fetch document privileges' }, { status: 500 })
    }

    return NextResponse.json({ privileges })
  } catch (error) {
    console.error('Error in GET /api/documents/privileges:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    if (!body.document_id) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    // Verify user has access to this document
    const { data: document } = await supabase
      .from('documents')
      .select('user_id, uploaded_by')
      .eq('id', body.document_id)
      .single()

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check if user is board member or document owner
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const isBoardMember = userProfile?.role?.includes('board') || false
    const isDocumentOwner = document.user_id === user.id || document.uploaded_by === user.id

    if (!isBoardMember && !isDocumentOwner) {
      return NextResponse.json({ error: 'You do not have permission to add privileges to this document' }, { status: 403 })
    }

    // Validate that either endorsement_id OR custom_name is provided
    if ((body.endorsement_id && body.custom_name) || (!body.endorsement_id && !body.custom_name)) {
      return NextResponse.json({ error: 'Either endorsement_id or custom_name must be provided (not both)' }, { status: 400 })
    }

    const { data: privilege, error } = await supabase
      .from('document_privileges')
      .insert({
        document_id: body.document_id,
        endorsement_id: body.endorsement_id || null,
        custom_name: body.custom_name || null,
        expiry_date: body.expiry_date || null,
        notes: body.notes || null,
        added_by: user.id,
      })
      .select(`
        *,
        document_endorsements (
          id,
          name,
          code,
          description
        )
      `)
      .single()

    if (error) {
      console.error('Error creating document privilege:', error)
      return NextResponse.json({ error: 'Failed to create document privilege' }, { status: 500 })
    }

    return NextResponse.json({ privilege })
  } catch (error) {
    console.error('Error in POST /api/documents/privileges:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Privilege ID is required' }, { status: 400 })
    }

    const body = await request.json()

    // Get the privilege to check document ownership
    const { data: existingPrivilege } = await supabase
      .from('document_privileges')
      .select(`
        document_id,
        documents (
          user_id,
          uploaded_by
        )
      `)
      .eq('id', id)
      .single()

    if (!existingPrivilege) {
      return NextResponse.json({ error: 'Privilege not found' }, { status: 404 })
    }

    // Check if user is board member or document owner
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const isBoardMember = userProfile?.role?.includes('board') || false
    const isDocumentOwner =
      existingPrivilege.documents?.user_id === user.id ||
      existingPrivilege.documents?.uploaded_by === user.id

    if (!isBoardMember && !isDocumentOwner) {
      return NextResponse.json({ error: 'You do not have permission to update this privilege' }, { status: 403 })
    }

    const { data: privilege, error } = await supabase
      .from('document_privileges')
      .update({
        expiry_date: body.expiry_date || null,
        notes: body.notes || null,
      })
      .eq('id', id)
      .select(`
        *,
        document_endorsements (
          id,
          name,
          code,
          description
        )
      `)
      .single()

    if (error) {
      console.error('Error updating document privilege:', error)
      return NextResponse.json({ error: 'Failed to update document privilege' }, { status: 500 })
    }

    return NextResponse.json({ privilege })
  } catch (error) {
    console.error('Error in PUT /api/documents/privileges:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Privilege ID is required' }, { status: 400 })
    }

    // Get the privilege to check document ownership
    const { data: existingPrivilege } = await supabase
      .from('document_privileges')
      .select(`
        document_id,
        documents (
          user_id,
          uploaded_by
        )
      `)
      .eq('id', id)
      .single()

    if (!existingPrivilege) {
      return NextResponse.json({ error: 'Privilege not found' }, { status: 404 })
    }

    // Check if user is board member or document owner
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const isBoardMember = userProfile?.role?.includes('board') || false
    const isDocumentOwner =
      existingPrivilege.documents?.user_id === user.id ||
      existingPrivilege.documents?.uploaded_by === user.id

    if (!isBoardMember && !isDocumentOwner) {
      return NextResponse.json({ error: 'You do not have permission to delete this privilege' }, { status: 403 })
    }

    const { error } = await supabase.from('document_privileges').delete().eq('id', id)

    if (error) {
      console.error('Error deleting document privilege:', error)
      return NextResponse.json({ error: 'Failed to delete document privilege' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/documents/privileges:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
