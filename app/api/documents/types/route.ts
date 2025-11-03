import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: documentTypes, error } = await supabase
      .from('document_types')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching document types:', error)
      return NextResponse.json({ error: 'Failed to fetch document types' }, { status: 500 })
    }

    return NextResponse.json({ documentTypes })
  } catch (error) {
    console.error('Error in GET /api/documents/types:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication and board member status
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const isBoardMember = userProfile?.role?.includes('board') || false
    if (!isBoardMember) {
      return NextResponse.json({ error: 'Only board members can create document types' }, { status: 403 })
    }

    const body = await request.json()

    const { data: documentType, error } = await supabase
      .from('document_types')
      .insert({
        name: body.name,
        description: body.description || null,
        category: body.category || null,
        mandatory: body.mandatory || false,
        expires: body.expires || false,
        required_for_functions: body.required_for_functions || [],
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating document type:', error)
      return NextResponse.json({ error: 'Failed to create document type' }, { status: 500 })
    }

    return NextResponse.json({ documentType })
  } catch (error) {
    console.error('Error in POST /api/documents/types:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication and board member status
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const isBoardMember = userProfile?.role?.includes('board') || false
    if (!isBoardMember) {
      return NextResponse.json({ error: 'Only board members can update document types' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Document type ID is required' }, { status: 400 })
    }

    const body = await request.json()

    const { data: documentType, error } = await supabase
      .from('document_types')
      .update({
        name: body.name,
        description: body.description || null,
        category: body.category || null,
        mandatory: body.mandatory || false,
        expires: body.expires || false,
        required_for_functions: body.required_for_functions || [],
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating document type:', error)
      return NextResponse.json({ error: 'Failed to update document type' }, { status: 500 })
    }

    return NextResponse.json({ documentType })
  } catch (error) {
    console.error('Error in PUT /api/documents/types:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication and board member status
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const isBoardMember = userProfile?.role?.includes('board') || false
    if (!isBoardMember) {
      return NextResponse.json({ error: 'Only board members can delete document types' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Document type ID is required' }, { status: 400 })
    }

    const { error } = await supabase.from('document_types').delete().eq('id', id)

    if (error) {
      console.error('Error deleting document type:', error)
      return NextResponse.json({ error: 'Failed to delete document type' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/documents/types:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
