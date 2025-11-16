import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/endorsements
 * List all active endorsements (or all if includeInactive=true)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const includeInactive = searchParams.get('includeInactive') === 'true'

    let query = supabase
      .from('endorsements')
      .select('*')
      .order('code', { ascending: true })

    if (!includeInactive) {
      query = query.eq('active', true)
    }

    const { data: endorsements, error } = await query

    if (error) {
      console.error('Error fetching endorsements:', error)
      return NextResponse.json({ error: 'Failed to fetch endorsements' }, { status: 500 })
    }

    return NextResponse.json({ endorsements })
  } catch (error) {
    console.error('Error in GET /api/endorsements:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/endorsements
 * Create a new custom endorsement (board members only)
 */
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
    if (!isBoardMember) {
      return NextResponse.json({ error: 'Forbidden - board members only' }, { status: 403 })
    }

    const body = await request.json()
    const { code, name, name_de, description, supports_ir } = body

    if (!code || !name) {
      return NextResponse.json({ error: 'Code and name are required' }, { status: 400 })
    }

    // Insert new endorsement (custom, not predefined)
    const { data: endorsement, error } = await supabase
      .from('endorsements')
      .insert({
        code: code.toUpperCase(),
        name,
        name_de: name_de || null,
        description: description || null,
        supports_ir: supports_ir || false,
        is_predefined: false,
        active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating endorsement:', error)
      if (error.code === '23505') { // Unique violation
        return NextResponse.json({ error: 'An endorsement with this code already exists' }, { status: 400 })
      }
      return NextResponse.json({ error: 'Failed to create endorsement' }, { status: 500 })
    }

    return NextResponse.json({ endorsement }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/endorsements:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
