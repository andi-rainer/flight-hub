import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const supabase = await createClient()

  // Verify user is authenticated and is board member
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile?.role?.includes('board')) {
    return NextResponse.json(
      { error: 'Not authorized - board members only' },
      { status: 403 }
    )
  }

  // Get user balance
  const { data: userBalance, error } = await supabase
    .from('user_balances')
    .select('balance')
    .eq('user_id', params.userId)
    .single()

  if (error) {
    console.error('Error fetching user balance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user balance', balance: 0 },
      { status: 200 }
    )
  }

  return NextResponse.json({ balance: userBalance?.balance || 0 })
}
