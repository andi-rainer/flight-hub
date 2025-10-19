import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
      return NextResponse.json({ error: 'Only board members can update expiry dates' }, { status: 403 })
    }

    const { documentId, expiryDate } = await request.json()

    if (!documentId) {
      return NextResponse.json({ error: 'Missing document ID' }, { status: 400 })
    }

    const { error } = await supabase
      .from('documents')
      .update({ expiry_date: expiryDate || null })
      .eq('id', documentId)

    if (error) {
      console.error('Error updating expiry date:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in POST /api/documents/update-expiry:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
