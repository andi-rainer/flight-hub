import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: categories, error } = await supabase
      .from('document_categories')
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
        category_endorsements (
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
      console.error('Error fetching document categories:', error)
      return NextResponse.json({ error: 'Failed to fetch document categories' }, { status: 500 })
    }

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Error in GET /api/documents/categories:', error)
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
      return NextResponse.json({ error: 'Only board members can create document categories' }, { status: 403 })
    }

    const body = await request.json()

    const { data: category, error } = await supabase
      .from('document_categories')
      .insert({
        name: body.name,
        description: body.description || null,
        icon: body.icon || null,
        sort_order: body.sort_order || 0,
        active: body.active !== undefined ? body.active : true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating document category:', error)
      return NextResponse.json({ error: 'Failed to create document category' }, { status: 500 })
    }

    return NextResponse.json({ category })
  } catch (error) {
    console.error('Error in POST /api/documents/categories:', error)
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
      return NextResponse.json({ error: 'Only board members can update document categories' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
    }

    const body = await request.json()

    const { data: category, error } = await supabase
      .from('document_categories')
      .update({
        name: body.name,
        description: body.description || null,
        icon: body.icon || null,
        sort_order: body.sort_order || 0,
        active: body.active !== undefined ? body.active : true,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating document category:', error)
      return NextResponse.json({ error: 'Failed to update document category' }, { status: 500 })
    }

    return NextResponse.json({ category })
  } catch (error) {
    console.error('Error in PUT /api/documents/categories:', error)
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
      return NextResponse.json({ error: 'Only board members can delete document categories' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
    }

    const { error } = await supabase.from('document_categories').delete().eq('id', id)

    if (error) {
      console.error('Error deleting document category:', error)
      return NextResponse.json({ error: 'Failed to delete document category' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/documents/categories:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
