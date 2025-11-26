import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication and board member status
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const isBoardMember = userProfile?.role?.includes('board') || false
    if (!isBoardMember) {
      return NextResponse.json({ error: 'Only board members can approve documents' }, { status: 403 })
    }

    const body = await request.json()
    const { documentId, approved, expiryDate } = body

    if (!documentId || approved === undefined) {
      return NextResponse.json({ error: 'Document ID and approval status are required' }, { status: 400 })
    }

    const updateData: {
      approved: boolean
      approved_by?: string
      approved_at?: string
      expiry_date?: string | null
    } = {
      approved,
    }

    if (approved) {
      updateData.approved_by = user.id
      updateData.approved_at = new Date().toISOString()
      if (expiryDate) {
        updateData.expiry_date = expiryDate
      }
    } else {
      // If rejecting, clear approval fields
      updateData.approved_by = undefined
      updateData.approved_at = undefined
    }

    const { data: document, error } = await supabase
      .from('documents')
      .update(updateData)
      .eq('id', documentId)
      .select()
      .single()

    if (error) {
      console.error('Error updating document:', error)
      return NextResponse.json({ error: 'Failed to update document' }, { status: 500 })
    }

    return NextResponse.json({ document })
  } catch (error) {
    console.error('Error in POST /api/documents/approve:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
