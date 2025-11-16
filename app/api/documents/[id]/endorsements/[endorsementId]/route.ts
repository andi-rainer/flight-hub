import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * PUT /api/documents/[id]/endorsements/[endorsementId]
 * Update endorsement privilege on a document (including IR status and expiry dates)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; endorsementId: string }> }
) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: documentId, endorsementId } = await params
    const body = await request.json()
    const { expiryDate, hasIR, irExpiryDate, notes } = body

    // Verify user owns the document or is board member
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('user_id, uploaded_by')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const isBoardMember = profile?.role?.includes('board') ?? false
    const isOwner = document.user_id === user.id || document.uploaded_by === user.id

    if (!isBoardMember && !isOwner) {
      return NextResponse.json(
        { error: 'Forbidden - you can only update endorsements on your own documents' },
        { status: 403 }
      )
    }

    // Build update data
    const updateData: any = {}
    if (expiryDate !== undefined) updateData.expiry_date = expiryDate || null
    if (typeof hasIR === 'boolean') {
      updateData.has_ir = hasIR
      // If IR is being disabled, clear IR expiry date
      if (!hasIR) {
        updateData.ir_expiry_date = null
      }
    }
    if (irExpiryDate !== undefined) updateData.ir_expiry_date = irExpiryDate || null
    if (notes !== undefined) updateData.notes = notes || null

    // Update user document endorsement
    const { data: endorsement, error } = await supabase
      .from('user_document_endorsements')
      .update(updateData)
      .eq('document_id', documentId)
      .eq('endorsement_id', endorsementId)
      .select(`
        *,
        endorsement:endorsements(*)
      `)
      .single()

    if (error) {
      console.error('Error updating document endorsement:', error)
      return NextResponse.json({ error: 'Failed to update endorsement' }, { status: 500 })
    }

    if (!endorsement) {
      return NextResponse.json({ error: 'Endorsement not found' }, { status: 404 })
    }

    return NextResponse.json({ endorsement })
  } catch (error) {
    console.error('Error in PUT /api/documents/[id]/endorsements/[endorsementId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/documents/[id]/endorsements/[endorsementId]
 * Remove endorsement from document
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; endorsementId: string }> }
) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: documentId, endorsementId } = await params

    // Verify user owns the document or is board member
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('user_id, uploaded_by')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const isBoardMember = profile?.role?.includes('board') ?? false
    const isOwner = document.user_id === user.id || document.uploaded_by === user.id

    if (!isBoardMember && !isOwner) {
      return NextResponse.json(
        { error: 'Forbidden - you can only remove endorsements from your own documents' },
        { status: 403 }
      )
    }

    // Delete user document endorsement
    const { error } = await supabase
      .from('user_document_endorsements')
      .delete()
      .eq('document_id', documentId)
      .eq('endorsement_id', endorsementId)

    if (error) {
      console.error('Error deleting document endorsement:', error)
      return NextResponse.json({ error: 'Failed to remove endorsement' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/documents/[id]/endorsements/[endorsementId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
