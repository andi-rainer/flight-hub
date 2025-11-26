import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Get subcategories for a document definition
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const definitionId = searchParams.get('definitionId')

    if (!definitionId) {
      return NextResponse.json({ error: 'Definition ID is required' }, { status: 400 })
    }

    const { data: subcategories, error } = await supabase
      .from('document_subcategories')
      .select('*')
      .eq('document_definition_id', definitionId)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching subcategories:', error)
      return NextResponse.json({ error: 'Failed to fetch subcategories' }, { status: 500 })
    }

    return NextResponse.json({ subcategories })
  } catch (error) {
    console.error('Error in GET /api/documents/definitions/subcategories:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Create subcategory
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
      return NextResponse.json({ error: 'Only board members can create subcategories' }, { status: 403 })
    }

    const body = await request.json()

    const { data: subcategory, error } = await supabase
      .from('document_subcategories')
      .insert({
        category_id: body.category_id,
        document_definition_id: body.document_definition_id || null,
        name: body.name,
        code: body.code || null,
        description: body.description || null,
        sort_order: body.sort_order || 0,
        active: body.active !== undefined ? body.active : true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating subcategory:', error)
      return NextResponse.json({ error: 'Failed to create subcategory' }, { status: 500 })
    }

    return NextResponse.json({ subcategory })
  } catch (error) {
    console.error('Error in POST /api/documents/definitions/subcategories:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update subcategory
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
      return NextResponse.json({ error: 'Only board members can update subcategories' }, { status: 403 })
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
      console.error('Error updating subcategory:', error)
      return NextResponse.json({ error: 'Failed to update subcategory' }, { status: 500 })
    }

    return NextResponse.json({ subcategory })
  } catch (error) {
    console.error('Error in PUT /api/documents/definitions/subcategories:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Delete subcategory
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
      return NextResponse.json({ error: 'Only board members can delete subcategories' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Subcategory ID is required' }, { status: 400 })
    }

    const { error } = await supabase.from('document_subcategories').delete().eq('id', id)

    if (error) {
      console.error('Error deleting subcategory:', error)
      return NextResponse.json({ error: 'Failed to delete subcategory' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/documents/definitions/subcategories:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
