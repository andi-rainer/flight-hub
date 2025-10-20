'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { FileText, Download, Check, X, Trash2, AlertTriangle } from 'lucide-react'
import { approveUserDocument, unapproveUserDocument, deleteUserDocument } from '@/lib/actions/members'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { Document, User } from '@/lib/database.types'

interface MemberDocumentsDialogProps {
  member: User
  documents: Document[]
}

function getDocumentExpiryStatus(expiryDate: string | null) {
  if (!expiryDate) return 'none'

  const now = new Date()
  const expiry = new Date(expiryDate)
  const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (daysUntilExpiry < 0) return 'expired'
  if (daysUntilExpiry < 5) return 'critical'
  if (daysUntilExpiry < 45) return 'warning'
  return 'ok'
}

export function MemberDocumentsDialog({ member, documents }: MemberDocumentsDialogProps) {
  const [open, setOpen] = useState(false)
  const [approvingDoc, setApprovingDoc] = useState<Document | null>(null)
  const [expiryDate, setExpiryDate] = useState('')
  const router = useRouter()

  const handleApproveClick = (doc: Document) => {
    setApprovingDoc(doc)
    setExpiryDate(doc.expiry_date || '')
  }

  const handleApproveConfirm = async () => {
    if (!approvingDoc) return

    // Update expiry date if changed
    if (expiryDate !== approvingDoc.expiry_date) {
      try {
        const response = await fetch('/api/documents/update-expiry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentId: approvingDoc.id,
            expiryDate: expiryDate || null,
          }),
        })

        if (!response.ok) {
          toast.error('Failed to update expiry date')
          return
        }
      } catch (error) {
        toast.error('Failed to update expiry date')
        console.error(error)
        return
      }
    }

    // Approve the document
    const result = await approveUserDocument(approvingDoc.id)
    if (result.success) {
      toast.success('Document approved')
      setApprovingDoc(null)
      setExpiryDate('')
      // Trigger refresh for badges
      window.dispatchEvent(new Event('document-updated'))
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to approve document')
    }
  }

  const handleUnapprove = async (documentId: string) => {
    const result = await unapproveUserDocument(documentId)
    if (result.success) {
      toast.success('Document unapproved')
      // Trigger refresh for badges
      window.dispatchEvent(new Event('document-updated'))
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to unapprove document')
    }
  }

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    const result = await deleteUserDocument(documentId)
    if (result.success) {
      toast.success('Document deleted')
      // Trigger refresh for badges
      window.dispatchEvent(new Event('document-updated'))
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to delete document')
    }
  }

  const handleViewDocument = async (doc: Document) => {
    try {
      const response = await fetch('/api/documents/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: doc.file_url,
          documentId: doc.id,
        }),
      })

      if (response.ok) {
        const { signedUrl } = await response.json()
        window.open(signedUrl, '_blank')
      } else {
        toast.error('Failed to generate document URL')
      }
    } catch (error) {
      console.error('Error viewing document:', error)
      toast.error('Failed to open document')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>
      case 'critical':
        return <Badge className="bg-red-500 hover:bg-red-600">Critical</Badge>
      case 'warning':
        return <Badge className="bg-orange-500 hover:bg-orange-600">Expiring Soon</Badge>
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <FileText className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Documents for {member.name} {member.surname}</DialogTitle>
          <DialogDescription>
            View and manage member documents, licenses, and certifications
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No documents uploaded yet
            </p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => {
                const expiryStatus = getDocumentExpiryStatus(doc.expiry_date)
                return (
                  <div
                    key={doc.id}
                    className="flex items-start justify-between p-4 border rounded-lg gap-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{doc.name}</h4>
                        {doc.category && (
                          <Badge variant="outline" className="text-xs">
                            {doc.category}
                          </Badge>
                        )}
                        {getStatusBadge(expiryStatus)}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>
                          Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          {doc.expiry_date ? (
                            <>
                              {(expiryStatus === 'expired' || expiryStatus === 'critical') && (
                                <AlertTriangle className="h-3 w-3 text-red-600" />
                              )}
                              {expiryStatus === 'warning' && (
                                <AlertTriangle className="h-3 w-3 text-orange-600" />
                              )}
                              <span>
                                Expires: {new Date(doc.expiry_date).toLocaleDateString()}
                              </span>
                            </>
                          ) : (
                            <span>Expiry: No expiry date</span>
                          )}
                        </div>
                        <div>
                          Status:{' '}
                          <Badge variant={doc.approved ? 'default' : 'secondary'} className="text-xs">
                            {doc.approved ? 'Approved' : 'Pending'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDocument(doc)}
                        title="View Document"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {doc.approved ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnapprove(doc.id)}
                          title="Unapprove"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleApproveClick(doc)}
                          title="Approve"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(doc.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>

      {/* Approval Dialog with Expiry Date */}
      <Dialog open={!!approvingDoc} onOpenChange={(open) => !open && setApprovingDoc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Document</DialogTitle>
            <DialogDescription>
              Review and approve {approvingDoc?.name}. You can set or update the expiry date before approving.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="approve-expiry">Expiry Date (Optional)</Label>
              <Input
                id="approve-expiry"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty if the document does not expire
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setApprovingDoc(null)}
            >
              Cancel
            </Button>
            <Button onClick={handleApproveConfirm}>
              <Check className="h-4 w-4 mr-2" />
              Approve Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
