import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Link endorsement to document definition
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

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
      return NextResponse.json({ error: 'Only board members can link endorsements' }, { status: 403 })
    }

    const body = await request.json()
    const { document_definition_id, endorsement_id } = body

    if (!document_definition_id || !endorsement_id) {
      return NextResponse.json({ error: 'Document Definition ID and Endorsement ID are required' }, { status: 400 })
    }

    const { data: link, error } = await supabase
      .from('definition_endorsements')
      .insert({
        document_definition_id,
        endorsement_id,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error linking endorsement:', error)
      return NextResponse.json({ error: 'Failed to link endorsement' }, { status: 500 })
    }

    return NextResponse.json({ link })
  } catch (error) {
    console.error('Error in POST /api/documents/definitions/endorsements:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Unlink endorsement from document definition
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

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
      return NextResponse.json({ error: 'Only board members can unlink endorsements' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const document_definition_id = searchParams.get('document_definition_id')
    const endorsement_id = searchParams.get('endorsement_id')

    if (!document_definition_id || !endorsement_id) {
      return NextResponse.json({ error: 'Document Definition ID and Endorsement ID are required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('definition_endorsements')
      .delete()
      .eq('document_definition_id', document_definition_id)
      .eq('endorsement_id', endorsement_id)

    if (error) {
      console.error('Error unlinking endorsement:', error)
      return NextResponse.json({ error: 'Failed to unlink endorsement' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/documents/definitions/endorsements:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
