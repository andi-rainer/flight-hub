import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Get count of documents pending approval (for board members)
 */
export async function GET(request: NextRequest) {
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
      return NextResponse.json({ count: 0 })
    }

    // Get count of documents pending approval
    const { count, error } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('approved', false)
      .not('user_id', 'is', null) // Only user documents, not general documents

    if (error) {
      console.error('Error fetching pending approvals:', error)
      return NextResponse.json({ error: 'Failed to fetch pending approvals' }, { status: 500 })
    }

    return NextResponse.json({ count: count || 0 })
  } catch (error) {
    console.error('Error in GET /api/documents/pending-approvals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
