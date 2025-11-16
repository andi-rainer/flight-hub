import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Get all document definitions
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: definitions, error } = await supabase
      .from('document_definitions')
      .select(`
        *,
        document_subcategories (
          id,
          name,
          code,
          description,
          sort_order,
          active
        ),
        definition_endorsements (
          endorsement_id,
          endorsements (
            id,
            code,
            name,
            name_de,
            description,
            active,
            supports_ir
          )
        )
      `)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching document definitions:', error)
      return NextResponse.json({ error: 'Failed to fetch document definitions' }, { status: 500 })
    }

    return NextResponse.json({ definitions })
  } catch (error) {
    console.error('Error in GET /api/documents/definitions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Create new document definition
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

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
      return NextResponse.json({ error: 'Only board members can create document definitions' }, { status: 403 })
    }

    const body = await request.json()

    const { data: definition, error } = await supabase
      .from('document_definitions')
      .insert({
        name: body.name,
        description: body.description || null,
        icon: body.icon || null,
        sort_order: body.sort_order || 0,
        active: body.active !== undefined ? body.active : true,
        mandatory: body.mandatory || false,
        expires: body.expires || false,
        has_subcategories: body.has_subcategories || false,
        has_endorsements: body.has_endorsements || false,
        required_for_functions: body.required_for_functions || [],
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating document definition:', error)
      return NextResponse.json({ error: 'Failed to create document definition' }, { status: 500 })
    }

    return NextResponse.json({ definition })
  } catch (error) {
    console.error('Error in POST /api/documents/definitions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update document definition
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

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
      return NextResponse.json({ error: 'Only board members can update document definitions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Definition ID is required' }, { status: 400 })
    }

    const body = await request.json()

    const { data: definition, error } = await supabase
      .from('document_definitions')
      .update({
        name: body.name,
        description: body.description || null,
        icon: body.icon || null,
        sort_order: body.sort_order || 0,
        active: body.active !== undefined ? body.active : true,
        mandatory: body.mandatory || false,
        expires: body.expires || false,
        has_subcategories: body.has_subcategories || false,
        has_endorsements: body.has_endorsements || false,
        required_for_functions: body.required_for_functions || [],
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating document definition:', error)
      return NextResponse.json({ error: 'Failed to update document definition' }, { status: 500 })
    }

    return NextResponse.json({ definition })
  } catch (error) {
    console.error('Error in PUT /api/documents/definitions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Delete document definition
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

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
      return NextResponse.json({ error: 'Only board members can delete document definitions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Definition ID is required' }, { status: 400 })
    }

    const { error } = await supabase.from('document_definitions').delete().eq('id', id)

    if (error) {
      console.error('Error deleting document definition:', error)
      return NextResponse.json({ error: 'Failed to delete document definition' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/documents/definitions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
