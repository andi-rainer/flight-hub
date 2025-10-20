'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ExternalLink, AlertCircle, FileText, Loader2, Plus, Calendar, AlertTriangle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import type { Document, DocumentType } from '@/lib/database.types'

interface PilotDocumentsSectionProps {
  userId: string
  isBoardMember?: boolean
}

export function PilotDocumentsSection({ userId, isBoardMember = false }: PilotDocumentsSectionProps) {
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([])
  const [userFunctions, setUserFunctions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [editingExpiryDoc, setEditingExpiryDoc] = useState<Document | null>(null)
  const [newExpiryDate, setNewExpiryDate] = useState('')
  const [renewingDoc, setRenewingDoc] = useState<Document | null>(null)

  // Upload form state
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [expiryDate, setExpiryDate] = useState('')

  useEffect(() => {
    loadData()
  }, [userId])

  const loadData = async () => {
    setIsLoading(true)

    try {
      // Fetch user documents
      const docsResponse = await fetch(`/api/documents/user?userId=${userId}`)
      if (docsResponse.ok) {
        const docsData = await docsResponse.json()
        setDocuments(docsData.documents || [])
      }

      // Fetch document types and user functions
      const [typesResponse, userResponse] = await Promise.all([
        fetch('/api/documents/types'),
        fetch(`/api/users/${userId}`)
      ])

      let allDocumentTypes: DocumentType[] = []
      let fetchedUserFunctions: string[] = []

      if (typesResponse.ok) {
        const typesData = await typesResponse.json()
        allDocumentTypes = typesData.documentTypes || []
      }

      if (userResponse.ok) {
        const userData = await userResponse.json()
        fetchedUserFunctions = userData.user?.functions || []
        setUserFunctions(fetchedUserFunctions)
      }

      // Filter document types to show only relevant ones for the user
      // Show only if: required for at least one of the user's functions
      const relevantDocumentTypes = allDocumentTypes.filter(docType => {
        // Skip if no function requirements (these are optional, non-role-specific documents)
        if (!docType.required_for_functions || docType.required_for_functions.length === 0) {
          return false
        }

        // Show only if required for at least one of the user's assigned functions
        return docType.required_for_functions.some(reqFunc =>
          fetchedUserFunctions.includes(reqFunc)
        )
      })

      setDocumentTypes(relevantDocumentTypes)
    } catch (error) {
      console.error('Error loading documents:', error)
      toast.error('Failed to load documents')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedDocumentType || !selectedFile) {
      toast.error('Please select a document type and file')
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('documentTypeId', selectedDocumentType)
      formData.append('userId', userId)
      if (expiryDate) {
        formData.append('expiryDate', expiryDate)
      }

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        toast.success('Document uploaded successfully')
        setIsUploadOpen(false)
        setSelectedDocumentType('')
        setSelectedFile(null)
        setExpiryDate('')
        loadData()
        // Trigger refresh for badges
        window.dispatchEvent(new Event('document-updated'))
        router.refresh()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to upload document')
      }
    } catch (error) {
      console.error('Error uploading document:', error)
      toast.error('Failed to upload document')
    } finally {
      setIsUploading(false)
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

  const handleUpdateExpiry = async () => {
    if (!editingExpiryDoc || !newExpiryDate) return

    try {
      const response = await fetch('/api/documents/update-expiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: editingExpiryDoc.id,
          expiryDate: newExpiryDate,
        }),
      })

      if (response.ok) {
        toast.success('Expiry date updated successfully')
        setEditingExpiryDoc(null)
        setNewExpiryDate('')
        loadData()
      } else {
        toast.error('Failed to update expiry date')
      }
    } catch (error) {
      console.error('Error updating expiry:', error)
      toast.error('Failed to update expiry date')
    }
  }

  const handleRenew = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!renewingDoc || !selectedFile) {
      toast.error('Please select a file to upload')
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('documentId', renewingDoc.id)
      formData.append('userId', userId)
      if (expiryDate) {
        formData.append('expiryDate', expiryDate)
      }

      const response = await fetch('/api/documents/renew', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        toast.success('Document renewed successfully')
        setRenewingDoc(null)
        setSelectedFile(null)
        setExpiryDate('')
        loadData()
        // Trigger refresh for badges
        window.dispatchEvent(new Event('document-updated'))
        router.refresh()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to renew document')
      }
    } catch (error) {
      console.error('Error renewing document:', error)
      toast.error('Failed to renew document')
    } finally {
      setIsUploading(false)
    }
  }

  const getDocumentStatus = (doc: Document) => {
    if (!doc.approved) {
      return <Badge variant="outline">Pending Approval</Badge>
    }
    if (!doc.expiry_date) {
      return <Badge>Valid</Badge>
    }

    const expiry = new Date(doc.expiry_date)
    const now = new Date()
    const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilExpiry < 0) {
      return <Badge variant="destructive">Expired</Badge>
    }
    if (daysUntilExpiry < 45) {
      return <Badge className="bg-orange-500 hover:bg-orange-600">Expiring Soon</Badge>
    }
    return <Badge variant="default">Valid</Badge>
  }

  // Find missing required documents (already filtered by user's functions in loadData)
  const uploadedTypeIds = documents.map(doc => doc.document_type_id).filter(Boolean)
  const missingMandatory = documentTypes.filter(type => !uploadedTypeIds.includes(type.id))

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>My Documents</CardTitle>
            <CardDescription>
              Upload and manage your pilot documents (licenses, medical, etc.)
            </CardDescription>
          </div>
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleUpload}>
                <DialogHeader>
                  <DialogTitle>Upload Document</DialogTitle>
                  <DialogDescription>
                    Select a document type and upload your file. Board members will review and approve it.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="document-type">Document Type *</Label>
                    <Select value={selectedDocumentType} onValueChange={setSelectedDocumentType}>
                      <SelectTrigger id="document-type">
                        <SelectValue placeholder="Select document type" />
                      </SelectTrigger>
                      <SelectContent>
                        {documentTypes
                          .filter(type => !uploadedTypeIds.includes(type.id))
                          .map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.name}
                              {type.mandatory && ' (Required)'}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="file">File *</Label>
                    <Input
                      id="file"
                      type="file"
                      accept="application/pdf,image/*"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      required
                    />
                    {selectedFile && (
                      <p className="text-sm text-muted-foreground">Selected: {selectedFile.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expiry">Expiry Date (if applicable)</Label>
                    <Input
                      id="expiry"
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsUploadOpen(false)}
                    disabled={isUploading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isUploading}>
                    {isUploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Upload
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Missing Mandatory Documents Alert */}
        {missingMandatory.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Missing Required Documents</AlertTitle>
            <AlertDescription>
              You need to upload the following mandatory documents:
              <ul className="list-disc list-inside mt-2">
                {missingMandatory.map((type) => (
                  <li key={type.id}>{type.name}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {documents.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Documents Uploaded</AlertTitle>
            <AlertDescription>
              You haven&apos;t uploaded any documents yet. Upload your pilot license, medical certificate,
              and other required documents to stay compliant.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {doc.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(doc.uploaded_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell className="text-sm">
                      {doc.expiry_date ? format(new Date(doc.expiry_date), 'MMM dd, yyyy') : '—'}
                    </TableCell>
                    <TableCell>{getDocumentStatus(doc)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDocument(doc)}
                          title="View Document"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setRenewingDoc(doc)
                            setSelectedFile(null)
                            setExpiryDate(doc.expiry_date || '')
                          }}
                          title="Renew Document"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        {isBoardMember && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingExpiryDoc(doc)
                              setNewExpiryDate(doc.expiry_date || '')
                            }}
                            title="Edit Expiry Date"
                          >
                            <Calendar className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Edit Expiry Date Dialog */}
      <Dialog open={!!editingExpiryDoc} onOpenChange={(open) => !open && setEditingExpiryDoc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Expiry Date</DialogTitle>
            <DialogDescription>
              Update the expiry date for {editingExpiryDoc?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-expiry">New Expiry Date</Label>
              <Input
                id="new-expiry"
                type="date"
                value={newExpiryDate}
                onChange={(e) => setNewExpiryDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingExpiryDoc(null)}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateExpiry}>
              Update Expiry Date
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Renew Document Dialog */}
      <Dialog open={!!renewingDoc} onOpenChange={(open) => !open && setRenewingDoc(null)}>
        <DialogContent>
          <form onSubmit={handleRenew}>
            <DialogHeader>
              <DialogTitle>Renew Document</DialogTitle>
              <DialogDescription>
                Upload a new version of {renewingDoc?.name}. The old document will be replaced.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="renew-file">New File *</Label>
                <Input
                  id="renew-file"
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  required
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">Selected: {selectedFile.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="renew-expiry">Expiry Date (if applicable)</Label>
                <Input
                  id="renew-expiry"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenewingDoc(null)}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUploading}>
                {isUploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Renew Document
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
