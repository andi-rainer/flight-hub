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
    const categoryId = searchParams.get('categoryId')

    let query = supabase
      .from('document_subcategories')
      .select('*')
      .order('sort_order', { ascending: true })

    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    const { data: subcategories, error } = await query

    if (error) {
      console.error('Error fetching document subcategories:', error)
      return NextResponse.json({ error: 'Failed to fetch document subcategories' }, { status: 500 })
    }

    return NextResponse.json({ subcategories })
  } catch (error) {
    console.error('Error in GET /api/documents/subcategories:', error)
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
      return NextResponse.json({ error: 'Only board members can create document subcategories' }, { status: 403 })
    }

    const body = await request.json()

    if (!body.category_id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
    }

    const { data: subcategory, error } = await supabase
      .from('document_subcategories')
      .insert({
        category_id: body.category_id,
        name: body.name,
        code: body.code || null,
        description: body.description || null,
        sort_order: body.sort_order || 0,
        active: body.active !== undefined ? body.active : true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating document subcategory:', error)
      return NextResponse.json({ error: 'Failed to create document subcategory' }, { status: 500 })
    }

    return NextResponse.json({ subcategory })
  } catch (error) {
    console.error('Error in POST /api/documents/subcategories:', error)
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
      return NextResponse.json({ error: 'Only board members can update document subcategories' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Subcategory ID is required' }, { status: 400 })
    }

    const body = await request.json()

    const { data: subcategory, error } = await supabase
      .from('document_subcategories')
      .update({
        name: body.name,
        code: body.code || null,
        description: body.description || null,
        sort_order: body.sort_order || 0,
        active: body.active !== undefined ? body.active : true,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating document subcategory:', error)
      return NextResponse.json({ error: 'Failed to update document subcategory' }, { status: 500 })
    }

    return NextResponse.json({ subcategory })
  } catch (error) {
    console.error('Error in PUT /api/documents/subcategories:', error)
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
      return NextResponse.json({ error: 'Only board members can delete document subcategories' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Subcategory ID is required' }, { status: 400 })
    }

    const { error } = await supabase.from('document_subcategories').delete().eq('id', id)

    if (error) {
      console.error('Error deleting document subcategory:', error)
      return NextResponse.json({ error: 'Failed to delete document subcategory' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/documents/subcategories:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
