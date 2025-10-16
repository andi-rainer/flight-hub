'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  const router = useRouter()

  const handleApprove = async (documentId: string) => {
    const result = await approveUserDocument(documentId)
    if (result.success) {
      toast.success('Document approved')
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to approve document')
    }
  }

  const handleUnapprove = async (documentId: string) => {
    const result = await unapproveUserDocument(documentId)
    if (result.success) {
      toast.success('Document unapproved')
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
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to delete document')
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
                        {doc.expiry_date && (
                          <div className="flex items-center gap-1">
                            {(expiryStatus === 'expired' || expiryStatus === 'critical') && (
                              <AlertTriangle className="h-3 w-3 text-red-600" />
                            )}
                            {expiryStatus === 'warning' && (
                              <AlertTriangle className="h-3 w-3 text-orange-600" />
                            )}
                            <span>
                              Expires: {new Date(doc.expiry_date).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        <div>
                          Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
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
                      <Button variant="ghost" size="sm" asChild>
                        <a href={doc.file_url} download target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
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
                          onClick={() => handleApprove(doc.id)}
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
    </Dialog>
  )
}
