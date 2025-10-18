import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: functions, error } = await supabase
      .from('functions_master')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching functions:', error)
      return NextResponse.json({ error: 'Failed to fetch functions' }, { status: 500 })
    }

    return NextResponse.json({ functions })
  } catch (error) {
    console.error('Error in GET /api/functions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
