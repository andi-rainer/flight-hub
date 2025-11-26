import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getContextFunctionCodes, type PersonSelectorContext } from '@/lib/constants/system-functions'

export const dynamic = 'force-dynamic'

interface SearchParams {
  q?: string // Search query
  context?: PersonSelectorContext // Context for filtering
  functionCodes?: string[] // Specific function codes to filter by
  dateFilter?: 'today' | 'week' | 'month' // Date filter for sign-ups
  membershipCategory?: 'regular' | 'short_term' // Membership category filter
  limit?: number // Result limit
  includeInactive?: boolean // Include inactive users
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse search params
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const context = searchParams.get('context') as PersonSelectorContext | null
    const dateFilter = searchParams.get('dateFilter') as 'today' | 'week' | 'month' | null
    const membershipCategory = searchParams.get('membershipCategory') as 'regular' | 'short_term' | null
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    // Get function codes from context or use provided ones
    let functionCodes: string[] = []
    if (context) {
      functionCodes = getContextFunctionCodes(context)
    }
    const customFunctionCodes = searchParams.get('functionCodes')
    if (customFunctionCodes) {
      functionCodes = customFunctionCodes.split(',')
    }

    // Special handling for tandem_passenger context
    if (context === 'tandem_passenger') {
      // First, get short-term memberships that are active
      let membershipQuery = supabase
        .from('user_memberships')
        .select(`
          user_id,
          start_date,
          status,
          membership_types!inner(member_category)
        `)
        .eq('status', 'active')
        .eq('membership_types.member_category', 'short-term')

      // Date filter for today's sign-ups
      if (dateFilter === 'today') {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        membershipQuery = membershipQuery.gte('start_date', today.toISOString())
      }

      const { data: memberships, error: membershipError } = await membershipQuery

      if (membershipError) {
        console.error('Membership search error:', membershipError)
        return NextResponse.json({ error: 'Search failed' }, { status: 500 })
      }

      // Get user IDs with short-term memberships
      const userIds = memberships?.map(m => m.user_id) || []

      if (userIds.length === 0) {
        return NextResponse.json({
          results: [],
          recent: [],
          total: 0,
        })
      }

      // Now query users with those IDs
      // Note: users don't have 'active' column, use 'left_at IS NULL' instead
      let passengerQuery = supabase
        .from('users')
        .select('id, name, surname, email, tandem_jump_completed')
        .is('left_at', null) // Active users have left_at = NULL
        .eq('tandem_jump_completed', false)
        .in('id', userIds)
        .limit(limit)

      // Text search
      if (query && query.length > 0) {
        passengerQuery = passengerQuery.or(
          `name.ilike.%${query}%,surname.ilike.%${query}%,email.ilike.%${query}%`
        )
      }

      const { data: passengers, error: passengerError } = await passengerQuery
        .order('surname')
        .order('name')

      if (passengerError) {
        console.error('Passenger search error:', passengerError)
        return NextResponse.json({ error: 'Search failed' }, { status: 500 })
      }

      // Transform results to match expected format
      const results = passengers?.map(p => {
        const membership = memberships?.find(m => m.user_id === p.id)
        return {
          id: p.id,
          name: p.name,
          surname: p.surname,
          email: p.email,
          functions_display: null,
          function_codes: [],
          membership_category: 'short_term',
          membership_start_date: membership?.start_date,
        }
      }) || []

      return NextResponse.json({
        results,
        recent: [],
        total: results.length,
      })
    }

    // Special handling for all_users context
    if (context === 'all_users') {
      let allUsersQuery = supabase
        .from('users')
        .select('id, name, surname, email')
        .is('left_at', null) // Active users have left_at = NULL
        .limit(limit)

      // Text search
      if (query && query.length > 0) {
        allUsersQuery = allUsersQuery.or(
          `name.ilike.%${query}%,surname.ilike.%${query}%,email.ilike.%${query}%`
        )
      }

      const { data: allUsers, error: allUsersError } = await allUsersQuery
        .order('surname')
        .order('name')

      if (allUsersError) {
        console.error('All users search error:', allUsersError)
        return NextResponse.json({ error: 'Search failed' }, { status: 500 })
      }

      const results = allUsers?.map(u => ({
        id: u.id,
        name: u.name,
        surname: u.surname,
        email: u.email,
        functions_display: null,
        function_codes: [],
        membership_category: null,
        membership_start_date: null,
      })) || []

      return NextResponse.json({
        results,
        recent: [],
        total: results.length,
      })
    }

    // Build query on materialized view for standard contexts
    let dbQuery = supabase
      .from('users_with_functions_search')
      .select('id, name, surname, email, functions_display, function_codes, membership_category, membership_start_date')
      .limit(limit)

    // Filter by active membership status
    if (!includeInactive) {
      dbQuery = dbQuery.in('membership_status', ['active', 'pending'])
    }

    // Filter by function codes (if specified)
    // Use overlaps to match users with ANY of the specified functions
    if (functionCodes.length > 0) {
      dbQuery = dbQuery.overlaps('function_codes', functionCodes)
    }

    // Filter by membership category
    if (membershipCategory) {
      dbQuery = dbQuery.eq('membership_category', membershipCategory)
    }

    // Date-based filtering for short-term members
    if (dateFilter) {
      const now = new Date()
      let dateFrom: Date

      switch (dateFilter) {
        case 'today':
          dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'week':
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        default:
          dateFrom = new Date(0)
      }

      dbQuery = dbQuery.gte('membership_start_date', dateFrom.toISOString())
    }

    // Text search
    if (query && query.length > 0) {
      dbQuery = dbQuery.or(
        `name.ilike.%${query}%,surname.ilike.%${query}%,email.ilike.%${query}%`
      )
    }

    // Execute search query
    const { data: results, error: searchError } = await dbQuery.order('surname').order('name')

    if (searchError) {
      console.error('Search error:', searchError)
      return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }

    // Get recent selections for this context if provided
    let recentSelections: any[] = []
    if (context) {
      const { data: recent } = await supabase.rpc('get_recent_selections', {
        p_user_id: authUser.id,
        p_context: context,
        p_limit: 5,
      })
      recentSelections = recent || []
    }

    return NextResponse.json({
      results: results || [],
      recent: recentSelections,
      total: results?.length || 0,
    })
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
