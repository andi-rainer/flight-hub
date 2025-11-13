import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: operationTypeId } = await params

    // Fetch operation type splits with cost center details
    const { data: splits, error } = await supabase
      .from('operation_type_splits')
      .select(`
        id,
        target_type,
        cost_center_id,
        percentage,
        sort_order,
        cost_centers (
          name
        )
      `)
      .eq('operation_type_id', operationTypeId)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching operation type splits:', error)
      return NextResponse.json({ error: 'Failed to fetch splits' }, { status: 500 })
    }

    // Format the response to include cost center name
    const formattedSplits = (splits || []).map(split => ({
      target_type: split.target_type,
      cost_center_id: split.cost_center_id,
      cost_center_name: split.cost_centers?.name,
      percentage: split.percentage,
      sort_order: split.sort_order
    }))

    return NextResponse.json({ splits: formattedSplits })
  } catch (error) {
    console.error('Error in operation type splits API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    // Check if user is board member
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check board membership
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile?.role?.includes('board')) {
      return NextResponse.json({ error: 'Only board members can configure splits' }, { status: 403 })
    }

    const { id: operationTypeId } = await params
    const body = await request.json()
    const { splits } = body

    // Validate splits
    if (!Array.isArray(splits)) {
      return NextResponse.json({ error: 'Invalid splits data' }, { status: 400 })
    }

    // Validate percentages sum to 100 if splits exist
    if (splits.length > 0) {
      const totalPercentage = splits.reduce((sum, split) => sum + (split.percentage || 0), 0)
      if (Math.abs(totalPercentage - 100) > 0.01) {
        return NextResponse.json({
          error: `Split percentages must sum to 100% (currently ${totalPercentage.toFixed(1)}%)`
        }, { status: 400 })
      }
    }

    // Delete existing splits
    const { error: deleteError } = await supabase
      .from('operation_type_splits')
      .delete()
      .eq('operation_type_id', operationTypeId)

    if (deleteError) {
      console.error('Error deleting existing splits:', deleteError)
      return NextResponse.json({ error: 'Failed to update splits' }, { status: 500 })
    }

    // Insert new splits if any
    if (splits.length > 0) {
      const splitsToInsert = splits.map((split, index) => ({
        operation_type_id: operationTypeId,
        target_type: split.target_type,
        cost_center_id: split.target_type === 'cost_center' ? split.cost_center_id : null,
        percentage: split.percentage,
        sort_order: index
      }))

      const { error: insertError } = await supabase
        .from('operation_type_splits')
        .insert(splitsToInsert)

      if (insertError) {
        console.error('Error inserting splits:', insertError)
        return NextResponse.json({ error: 'Failed to save splits' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in operation type splits PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
