'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { EndorsementSelector, type EndorsementSelection } from '@/components/endorsement-selector'

interface MemberDocumentsDialogProps {
  member: User
  documents: Document[]
}

interface DocumentEndorsement {
  id: string
  endorsement_id: string
  expiry_date: string | null
  has_ir: boolean
  ir_expiry_date: string | null
  endorsement: {
    code: string
    name: string
    supports_ir: boolean
  }
}

function getExpiryStatus(expiryDate: string | null) {
  if (!expiryDate) return 'none'

  const now = new Date()
  const expiry = new Date(expiryDate)
  const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (daysUntilExpiry < 0) return 'expired'
  if (daysUntilExpiry < 5) return 'critical'
  if (daysUntilExpiry < 45) return 'warning'
  return 'ok'
}

function getDocumentExpiryStatus(expiryDate: string | null) {
  return getExpiryStatus(expiryDate)
}

export function MemberDocumentsDialog({ member, documents }: MemberDocumentsDialogProps) {
  const [open, setOpen] = useState(false)
  const [approvingDoc, setApprovingDoc] = useState<Document | null>(null)
  const [expiryDate, setExpiryDate] = useState('')
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null)
  const [availableSubcategories, setAvailableSubcategories] = useState<any[]>([])
  const [availableEndorsementIds, setAvailableEndorsementIds] = useState<string[]>([])
  const [endorsementSelections, setEndorsementSelections] = useState<EndorsementSelection[]>([])
  const [documentEndorsements, setDocumentEndorsements] = useState<Record<string, DocumentEndorsement[]>>({})
  const router = useRouter()

  // Load endorsements for all documents when dialog opens
  useEffect(() => {
    if (open && documents.length > 0) {
      loadAllDocumentEndorsements()
    }
  }, [open, documents])

  // Load subcategories when approving document opens
  useEffect(() => {
    if (approvingDoc) {
      loadDocumentTypeAndSubcategories(approvingDoc)
    }
  }, [approvingDoc])

  const loadAllDocumentEndorsements = async () => {
    const endorsementsMap: Record<string, DocumentEndorsement[]> = {}

    await Promise.all(
      documents.map(async (doc) => {
        try {
          const response = await fetch(`/api/documents/${doc.id}/endorsements`)
          if (response.ok) {
            const data = await response.json()
            endorsementsMap[doc.id] = data.privileges || []
          }
        } catch (error) {
          console.error(`Error loading endorsements for document ${doc.id}:`, error)
        }
      })
    )

    setDocumentEndorsements(endorsementsMap)
  }

  const loadDocumentTypeAndSubcategories = async (doc: Document) => {
    if (!doc.document_definition_id) {
      setAvailableSubcategories([])
      setAvailableEndorsementIds([])
      return
    }

    try {
      // Get document definition with subcategories and endorsements
      const defResponse = await fetch(`/api/documents/definitions`)
      if (defResponse.ok) {
        const data = await defResponse.json()
        const docDef = data.definitions?.find((dd: any) => dd.id === doc.document_definition_id)

        if (docDef) {
          // Load subcategories if applicable
          if (docDef.has_subcategories && docDef.document_subcategories) {
            setAvailableSubcategories(docDef.document_subcategories)
          } else {
            setAvailableSubcategories([])
          }

          // Load available endorsements if applicable
          if (docDef.has_endorsements && docDef.definition_endorsements) {
            const endorsementIds = docDef.definition_endorsements
              .map((de: any) => de.endorsement_id || de.endorsements?.id)
              .filter(Boolean)
            setAvailableEndorsementIds(endorsementIds)
          } else {
            setAvailableEndorsementIds([])
          }
        } else {
          setAvailableSubcategories([])
          setAvailableEndorsementIds([])
        }
      }

      // Load existing endorsements for this document
      if (doc.id) {
        const endorsementsResponse = await fetch(`/api/documents/${doc.id}/endorsements`)
        if (endorsementsResponse.ok) {
          const endorsementsData = await endorsementsResponse.json()
          const selections: EndorsementSelection[] = (endorsementsData.privileges || []).map((priv: any) => ({
            endorsementId: priv.endorsement_id,
            expiryDate: priv.expiry_date,
            hasIR: priv.has_ir,
            irExpiryDate: priv.ir_expiry_date,
          }))
          setEndorsementSelections(selections)
        }
      }
    } catch (error) {
      console.error('Error loading document data:', error)
      setAvailableSubcategories([])
      setAvailableEndorsementIds([])
      setEndorsementSelections([])
    }
  }

  const handleApproveClick = (doc: Document) => {
    setApprovingDoc(doc)
    setExpiryDate(doc.expiry_date || '')
    setSubcategoryId(doc.subcategory_id || null)
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

    // Update endorsements if applicable
    if (availableEndorsementIds.length > 0) {
      try {
        const response = await fetch(`/api/documents/${approvingDoc.id}/endorsements`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endorsements: endorsementSelections,
          }),
        })

        if (!response.ok) {
          toast.error('Failed to update endorsements')
          return
        }
      } catch (error) {
        toast.error('Failed to update endorsements')
        console.error(error)
        return
      }
    }

    // Approve the document (and update subcategory if changed)
    const result = await approveUserDocument(approvingDoc.id, subcategoryId)
    if (result.success) {
      toast.success('Document approved')
      setApprovingDoc(null)
      setExpiryDate('')
      setSubcategoryId(null)
      setEndorsementSelections([])
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

  const getCombinedStatus = (doc: Document): string => {
    // Get document expiry status
    const docStatus = getDocumentExpiryStatus(doc.expiry_date)

    // Get endorsement expiry statuses
    const endorsements = documentEndorsements[doc.id] || []
    let worstEndorsementStatus = 'ok'

    for (const endorsement of endorsements) {
      // Check main endorsement expiry
      const mainStatus = getExpiryStatus(endorsement.expiry_date)

      // Check IR expiry if applicable
      const irStatus = endorsement.has_ir ? getExpiryStatus(endorsement.ir_expiry_date) : 'ok'

      // Get worst of the two
      const endorsementWorst = ['expired', 'critical', 'warning', 'ok', 'none'].indexOf(mainStatus) <
                               ['expired', 'critical', 'warning', 'ok', 'none'].indexOf(irStatus)
                               ? mainStatus : irStatus

      // Update overall worst
      if (['expired', 'critical', 'warning', 'ok', 'none'].indexOf(endorsementWorst) <
          ['expired', 'critical', 'warning', 'ok', 'none'].indexOf(worstEndorsementStatus)) {
        worstEndorsementStatus = endorsementWorst
      }
    }

    // Return worst of document and endorsements
    return ['expired', 'critical', 'warning', 'ok', 'none'].indexOf(docStatus) <
           ['expired', 'critical', 'warning', 'ok', 'none'].indexOf(worstEndorsementStatus)
           ? docStatus : worstEndorsementStatus
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
                const combinedStatus = getCombinedStatus(doc)
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
                        {getStatusBadge(combinedStatus)}
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

                        {/* Display endorsements/ratings */}
                        {documentEndorsements[doc.id] && documentEndorsements[doc.id].length > 0 && (
                          <div className="mt-2 pt-2 border-t">
                            <div className="text-xs font-semibold mb-1">Ratings/Endorsements:</div>
                            <div className="space-y-1">
                              {documentEndorsements[doc.id].map((endorsement) => {
                                const mainStatus = getExpiryStatus(endorsement.expiry_date)
                                const irStatus = endorsement.has_ir ? getExpiryStatus(endorsement.ir_expiry_date) : null
                                const worstStatus = ['expired', 'critical', 'warning', 'ok', 'none'].indexOf(mainStatus) <
                                                   ['expired', 'critical', 'warning', 'ok', 'none'].indexOf(irStatus || 'ok')
                                                   ? mainStatus : (irStatus || mainStatus)

                                return (
                                  <div key={endorsement.id} className="flex items-start gap-2 text-xs">
                                    <Badge variant="outline" className="text-xs">
                                      {endorsement.endorsement.code}
                                    </Badge>
                                    <div className="flex-1">
                                      {endorsement.expiry_date ? (
                                        <div className={`flex items-center gap-1 ${
                                          worstStatus === 'expired' ? 'text-red-600' :
                                          worstStatus === 'critical' ? 'text-red-500' :
                                          worstStatus === 'warning' ? 'text-orange-500' : ''
                                        }`}>
                                          {(worstStatus === 'expired' || worstStatus === 'critical' || worstStatus === 'warning') && (
                                            <AlertTriangle className="h-3 w-3" />
                                          )}
                                          <span>
                                            Expires: {new Date(endorsement.expiry_date).toLocaleDateString()}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground">No expiry</span>
                                      )}
                                      {endorsement.has_ir && (
                                        <div className={`flex items-center gap-1 text-xs ${
                                          irStatus === 'expired' ? 'text-red-600' :
                                          irStatus === 'critical' ? 'text-red-500' :
                                          irStatus === 'warning' ? 'text-orange-500' : 'text-blue-600'
                                        }`}>
                                          <span className="font-semibold">IR:</span>
                                          {endorsement.ir_expiry_date ? (
                                            <>
                                              {(irStatus === 'expired' || irStatus === 'critical' || irStatus === 'warning') && (
                                                <AlertTriangle className="h-3 w-3" />
                                              )}
                                              <span>{new Date(endorsement.ir_expiry_date).toLocaleDateString()}</span>
                                            </>
                                          ) : (
                                            <span>No expiry</span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0 gap-0">
          <div className="flex flex-col max-h-[90vh]">
            <div className="px-6 pt-6">
              <DialogHeader>
                <DialogTitle>Approve Document</DialogTitle>
                <DialogDescription>
                  Review and approve {approvingDoc?.name}. You can set or update the expiry date before approving.
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="space-y-4 px-6 py-4 overflow-y-auto flex-1">
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

            {availableSubcategories.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="approve-subcategory">Subcategory (Optional)</Label>
                <Select
                  value={subcategoryId || 'none'}
                  onValueChange={(value) => setSubcategoryId(value === 'none' ? null : value)}
                >
                  <SelectTrigger id="approve-subcategory">
                    <SelectValue placeholder="Select subcategory" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No subcategory</SelectItem>
                    {availableSubcategories.map((sub: any) => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Change the subcategory if needed before approving
                </p>
              </div>
            )}

            {availableEndorsementIds.length > 0 && (
              <div className="space-y-2">
                <Label>Endorsements / Ratings</Label>
                <EndorsementSelector
                  value={endorsementSelections}
                  onChange={setEndorsementSelections}
                  availableEndorsementIds={availableEndorsementIds}
                />
                <p className="text-xs text-muted-foreground">
                  Add, remove, or update endorsements for this document. You can also adjust expiry dates and IR privileges.
                </p>
              </div>
            )}
            </div>
            <div className="px-6 pb-6 border-t">
              <DialogFooter className="mt-4">
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
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
