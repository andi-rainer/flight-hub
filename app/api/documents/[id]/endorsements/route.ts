import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/documents/[id]/endorsements
 * Get all endorsements/ratings for a specific document with IR tracking
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: documentId } = await params

    // Fetch user document endorsements with endorsement details
    const { data: privileges, error } = await supabase
      .from('user_document_endorsements')
      .select(`
        *,
        endorsement:endorsements(*)
      `)
      .eq('document_id', documentId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching document endorsements:', error)
      return NextResponse.json({ error: 'Failed to fetch endorsements' }, { status: 500 })
    }

    return NextResponse.json({ privileges })
  } catch (error) {
    console.error('Error in GET /api/documents/[id]/endorsements:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/documents/[id]/endorsements
 * Add endorsement/rating to a document with optional IR tracking
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: documentId } = await params
    const body = await request.json()
    const { endorsementId, expiryDate, hasIR, irExpiryDate, notes } = body

    if (!endorsementId) {
      return NextResponse.json({ error: 'Endorsement ID is required' }, { status: 400 })
    }

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
      return NextResponse.json({ error: 'Forbidden - you can only add endorsements to your own documents' }, { status: 403 })
    }

    // Create user document endorsement
    const { data: privilege, error } = await supabase
      .from('user_document_endorsements')
      .insert({
        document_id: documentId,
        endorsement_id: endorsementId,
        expiry_date: expiryDate || null,
        has_ir: hasIR || false,
        ir_expiry_date: hasIR ? (irExpiryDate || expiryDate || null) : null,
      })
      .select(`
        *,
        endorsement:endorsements(*)
      `)
      .single()

    if (error) {
      console.error('Error creating document endorsement:', error)
      if (error.code === '23505') { // Unique violation
        return NextResponse.json({ error: 'This endorsement is already added to this document' }, { status: 400 })
      }
      return NextResponse.json({ error: 'Failed to add endorsement' }, { status: 500 })
    }

    return NextResponse.json({ privilege }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/documents/[id]/endorsements:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/documents/[id]/endorsements
 * Update all endorsements for a document (board only)
 * Replaces all existing endorsements with the new set
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
      return NextResponse.json({ error: 'Only board members can update endorsements' }, { status: 403 })
    }

    const { id: documentId } = await params
    const body = await request.json()
    const { endorsements } = body // Array of EndorsementSelection

    // Delete existing endorsements
    await supabase
      .from('user_document_endorsements')
      .delete()
      .eq('document_id', documentId)

    // Insert new endorsements
    if (endorsements && endorsements.length > 0) {
      const endorsementRecords = endorsements.map((endorsement: any) => ({
        document_id: documentId,
        endorsement_id: endorsement.endorsementId,
        expiry_date: endorsement.expiryDate || null,
        has_ir: endorsement.hasIR || false,
        ir_expiry_date: endorsement.irExpiryDate || null,
      }))

      const { error: insertError } = await supabase
        .from('user_document_endorsements')
        .insert(endorsementRecords)

      if (insertError) {
        console.error('Error inserting endorsements:', insertError)
        return NextResponse.json({ error: 'Failed to update endorsements' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in PUT /api/documents/[id]/endorsements:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
