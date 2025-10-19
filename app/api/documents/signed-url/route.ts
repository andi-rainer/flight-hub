import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { filePath, documentId } = await request.json()

    if (!filePath) {
      return NextResponse.json({ error: 'Missing file path' }, { status: 400 })
    }

    // Check if user is board member or the document owner
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const isBoardMember = profile?.role?.includes('board') ?? false

    // If not board member, verify they own this document
    if (!isBoardMember && documentId) {
      const { data: document } = await supabase
        .from('documents')
        .select('user_id')
        .eq('id', documentId)
        .single()

      if (!document || document.user_id !== user.id) {
        return NextResponse.json({ error: 'Unauthorized to access this document' }, { status: 403 })
      }
    }

    // Extract the actual file path from the stored URL
    // Format can be: "documents/userId/filename.ext" or just "userId/filename.ext"
    let actualPath = filePath

    // Remove "documents/" prefix if present
    if (actualPath.startsWith('documents/')) {
      actualPath = actualPath.substring('documents/'.length)
    }

    console.log('Generating signed URL for path:', actualPath)

    // Generate signed URL (valid for 1 hour)
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(actualPath, 3600)

    if (error) {
      console.error('Error creating signed URL:', error)
      console.error('Failed path:', actualPath)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data?.signedUrl) {
      console.error('No signed URL returned')
      return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 })
    }

    return NextResponse.json({ signedUrl: data.signedUrl })
  } catch (error) {
    console.error('Error in POST /api/documents/signed-url:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
