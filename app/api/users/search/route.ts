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

    // Build query on materialized view
    let dbQuery = supabase
      .from('users_with_functions_search')
      .select('id, name, surname, email, functions_display, function_codes, membership_category, membership_start_date')
      .limit(limit)

    // Filter by active membership status
    if (!includeInactive) {
      dbQuery = dbQuery.in('membership_status', ['active', 'pending'])
    }

    // Filter by function codes (if specified)
    if (functionCodes.length > 0) {
      dbQuery = dbQuery.contains('function_codes', functionCodes)
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
    let recentSelections = []
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
