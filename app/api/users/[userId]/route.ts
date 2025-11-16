import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await createClient()
    const { userId } = await params

    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user data
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Fetch user function codes (not IDs) for permission checking
    const { data: userFunctions } = await supabase
      .from('user_functions')
      .select('functions_master(code)')
      .eq('user_id', userId)

    const functionCodes = userFunctions?.map(uf => (uf as any).functions_master?.code).filter(Boolean) || []

    // Return user with function codes
    return NextResponse.json({
      user: {
        ...user,
        functions: functionCodes,
      }
    })
  } catch (error) {
    console.error('Error in GET /api/users/[userId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
