import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json()
    const { selectedUserId, context } = body

    if (!selectedUserId || !context) {
      return NextResponse.json(
        { error: 'Missing required fields: selectedUserId, context' },
        { status: 400 }
      )
    }

    // Call database function to track selection
    const { error: trackError } = await supabase.rpc('track_user_selection', {
      p_user_id: authUser.id,
      p_selected_user_id: selectedUserId,
      p_context: context,
    })

    if (trackError) {
      console.error('Error tracking selection:', trackError)
      return NextResponse.json({ error: 'Failed to track selection' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Track selection API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
