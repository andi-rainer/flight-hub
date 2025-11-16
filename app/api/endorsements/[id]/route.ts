import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * PUT /api/endorsements/[id]
 * Update an endorsement (board members only, cannot update predefined endorsements)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    if (!isBoardMember) {
      return NextResponse.json({ error: 'Forbidden - board members only' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { code, name, name_de, description, active, supports_ir } = body

    // Check if endorsement exists and is not predefined
    const { data: existing, error: fetchError } = await supabase
      .from('endorsements')
      .select('is_predefined')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Endorsement not found' }, { status: 404 })
    }

    if (existing.is_predefined) {
      // Can only update active status for predefined endorsements
      if (typeof active !== 'boolean') {
        return NextResponse.json(
          { error: 'Cannot modify predefined endorsements (only active status can be toggled)' },
          { status: 403 }
        )
      }

      const { data: endorsement, error } = await supabase
        .from('endorsements')
        .update({ active })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating endorsement:', error)
        return NextResponse.json({ error: 'Failed to update endorsement' }, { status: 500 })
      }

      return NextResponse.json({ endorsement })
    }

    // Update custom endorsement
    const updateData: any = {}
    if (code) updateData.code = code.toUpperCase()
    if (name) updateData.name = name
    if (name_de !== undefined) updateData.name_de = name_de || null
    if (description !== undefined) updateData.description = description || null
    if (typeof active === 'boolean') updateData.active = active
    if (typeof supports_ir === 'boolean') updateData.supports_ir = supports_ir

    const { data: endorsement, error } = await supabase
      .from('endorsements')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating endorsement:', error)
      if (error.code === '23505') { // Unique violation
        return NextResponse.json({ error: 'An endorsement with this code already exists' }, { status: 400 })
      }
      return NextResponse.json({ error: 'Failed to update endorsement' }, { status: 500 })
    }

    return NextResponse.json({ endorsement })
  } catch (error) {
    console.error('Error in PUT /api/endorsements/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/endorsements/[id]
 * Soft delete an endorsement (set active=false)
 * Board members only, cannot delete predefined endorsements
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    if (!isBoardMember) {
      return NextResponse.json({ error: 'Forbidden - board members only' }, { status: 403 })
    }

    const { id } = await params

    // Check if endorsement exists and is not predefined
    const { data: existing, error: fetchError } = await supabase
      .from('endorsements')
      .select('is_predefined')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Endorsement not found' }, { status: 404 })
    }

    if (existing.is_predefined) {
      return NextResponse.json(
        { error: 'Cannot delete predefined endorsements (use active toggle instead)' },
        { status: 403 }
      )
    }

    // Soft delete by setting active=false
    const { error } = await supabase
      .from('endorsements')
      .update({ active: false })
      .eq('id', id)

    if (error) {
      console.error('Error deleting endorsement:', error)
      return NextResponse.json({ error: 'Failed to delete endorsement' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/endorsements/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
