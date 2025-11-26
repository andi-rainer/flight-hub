import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils/format'
import { FileText } from 'lucide-react'
import DocumentFilters from './components/document-filters'
import DocumentRow from './components/document-row'
import UploadDocumentDialog from './components/upload-document-dialog'

// Configure route to accept larger request bodies for file uploads
export const maxDuration = 60
export const dynamic = 'force-dynamic'

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: { search?: string; category?: string }
}) {
  const supabase = await createClient()

  // Get current user and check if board member
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user?.id || '')
    .single()

  const isBoardMember = userData?.role?.includes('board') || false

  // Fetch club documents (not associated with aircraft or users)
  const query = supabase
    .from('documents')
    .select(`
      *,
      uploader:users!uploaded_by(name, surname)
    `)
    .is('plane_id', null)
    .is('user_id', null)
    .order('uploaded_at', { ascending: false })

  const { data: documents, error } = await query

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Error loading documents: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const allDocuments = documents || []

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground mt-1">
            Club documents and resources
          </p>
        </div>
        {isBoardMember && <UploadDocumentDialog />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Club Documents</CardTitle>
          <CardDescription>
            General documents, regulations, procedures, and forms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentFilters />

          {allDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No documents found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {isBoardMember
                  ? 'Upload your first document to get started'
                  : 'No documents have been uploaded yet'}
              </p>
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Uploaded By</TableHead>
                      <TableHead>Upload Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allDocuments.map((doc) => (
                      <DocumentRow
                        key={doc.id}
                        document={doc}
                        isBoardMember={isBoardMember}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="md:hidden space-y-4">
                {allDocuments.map((doc) => {
                  const uploader = doc.uploader as any
                  const uploaderName = uploader
                    ? `${uploader.name || ''} ${uploader.surname || ''}`.trim() || uploader.email
                    : 'Unknown'

                  return (
                    <Card key={doc.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <CardTitle className="text-base">{doc.name}</CardTitle>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant={getCategoryVariant(doc.category)}>
                                {doc.category}
                              </Badge>
                              {doc.tags && doc.tags.length > 0 && (
                                <div className="flex gap-1 flex-wrap">
                                  {doc.tags.map((tag, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium">Uploaded by:</span> {uploaderName}
                          </div>
                          <div>
                            <span className="font-medium">Date:</span> {formatDate(doc.uploaded_at)}
                          </div>
                        </div>
                        <div className="mt-4">
                          <DocumentRow
                            document={doc}
                            isBoardMember={isBoardMember}
                            mobileView
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function getCategoryVariant(category: string | null): 'default' | 'secondary' | 'outline' {
  switch (category) {
    case 'Regulations':
      return 'default'
    case 'Procedures':
      return 'secondary'
    case 'Forms':
      return 'outline'
    default:
      return 'secondary'
  }
}
