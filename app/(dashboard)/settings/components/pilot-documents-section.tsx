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
import type { Document } from '@/lib/types'
import { EndorsementSelector, type EndorsementSelection } from '@/components/endorsement-selector'
import { DocumentPrivilegesDisplay } from './document-privileges-display'

interface DocumentDefinition {
  id: string
  name: string
  description: string | null
  mandatory: boolean
  expires: boolean
  has_subcategories: boolean
  has_endorsements: boolean
  required_for_functions: string[]
  document_subcategories?: any[]
  definition_endorsements?: any[]
}

interface PilotDocumentsSectionProps {
  userId: string
  isBoardMember?: boolean
}

export function PilotDocumentsSection({ userId, isBoardMember = false }: PilotDocumentsSectionProps) {
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [documentDefinitions, setDocumentDefinitions] = useState<DocumentDefinition[]>([])
  const [userFunctions, setUserFunctions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [editingExpiryDoc, setEditingExpiryDoc] = useState<Document | null>(null)
  const [newExpiryDate, setNewExpiryDate] = useState('')
  const [renewingDoc, setRenewingDoc] = useState<Document | null>(null)
  const [renewalEndorsements, setRenewalEndorsements] = useState<EndorsementSelection[]>([])
  const [renewalAvailableEndorsementIds, setRenewalAvailableEndorsementIds] = useState<string[]>([])

  // Upload form state
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [expiryDate, setExpiryDate] = useState('')
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null)
  const [availableSubcategories, setAvailableSubcategories] = useState<any[]>([])
  const [availableEndorsementIds, setAvailableEndorsementIds] = useState<string[]>([])
  const [endorsementSelections, setEndorsementSelections] = useState<EndorsementSelection[]>([])

  useEffect(() => {
    loadData()
  }, [userId])

  // Load subcategories and endorsements when document type changes
  useEffect(() => {
    if (selectedDocumentType) {
      const selectedDef = documentDefinitions.find(d => d.id === selectedDocumentType)

      // Load subcategories if applicable
      if (selectedDef?.has_subcategories && selectedDef.document_subcategories) {
        setAvailableSubcategories(selectedDef.document_subcategories)
      } else {
        setAvailableSubcategories([])
        setSelectedSubcategoryId(null)
      }

      // Load endorsements if applicable
      if (selectedDef?.has_endorsements && selectedDef.definition_endorsements) {
        const endorsementIds = selectedDef.definition_endorsements
          .map((de: any) => de.endorsement_id || de.endorsements?.id)
          .filter(Boolean)
        setAvailableEndorsementIds(endorsementIds)
      } else {
        setAvailableEndorsementIds([])
        setEndorsementSelections([])
      }
    } else {
      setAvailableSubcategories([])
      setSelectedSubcategoryId(null)
      setAvailableEndorsementIds([])
      setEndorsementSelections([])
    }
  }, [selectedDocumentType, documentDefinitions])

  // Load existing endorsements when opening renewal dialog
  useEffect(() => {
    if (renewingDoc) {
      loadDocumentEndorsements(renewingDoc.id)
      setExpiryDate(renewingDoc.expiry_date || '')

      // Load available endorsements for this document definition
      if (renewingDoc.document_definition_id) {
        const docDef = documentDefinitions.find(d => d.id === renewingDoc.document_definition_id)
        if (docDef?.has_endorsements && docDef.definition_endorsements) {
          const endorsementIds = docDef.definition_endorsements
            .map((de: any) => de.endorsement_id || de.endorsements?.id)
            .filter(Boolean)
          setRenewalAvailableEndorsementIds(endorsementIds)
        } else {
          setRenewalAvailableEndorsementIds([])
        }
      }
    } else {
      setRenewalEndorsements([])
      setRenewalAvailableEndorsementIds([])
    }
  }, [renewingDoc, documentDefinitions])

  const loadSubcategories = async (categoryId: string) => {
    try {
      const response = await fetch(`/api/documents/subcategories?categoryId=${categoryId}`)
      if (response.ok) {
        const data = await response.json()
        setAvailableSubcategories(data.subcategories || [])
      }
    } catch (error) {
      console.error('Error loading subcategories:', error)
    }
  }

  const loadDocumentEndorsements = async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/endorsements`)
      if (response.ok) {
        const data = await response.json()
        // Convert to EndorsementSelection format
        const selections: EndorsementSelection[] = (data.privileges || []).map((priv: any) => ({
          endorsementId: priv.endorsement_id,
          expiryDate: priv.expiry_date,
          hasIR: priv.has_ir,
          irExpiryDate: priv.ir_expiry_date,
        }))
        setRenewalEndorsements(selections)
      }
    } catch (error) {
      console.error('Error loading document endorsements:', error)
    }
  }

  const loadData = async () => {
    setIsLoading(true)

    try {
      // Fetch user documents
      const docsResponse = await fetch(`/api/documents/user?userId=${userId}`)
      if (docsResponse.ok) {
        const docsData = await docsResponse.json()
        setDocuments(docsData.documents || [])
      }

      // Fetch document definitions and user functions
      const [defsResponse, userResponse] = await Promise.all([
        fetch('/api/documents/definitions'),
        fetch(`/api/users/${userId}`)
      ])

      let allDocumentDefinitions: DocumentDefinition[] = []
      let fetchedUserFunctionIds: string[] = []

      if (defsResponse.ok) {
        const defsData = await defsResponse.json()
        allDocumentDefinitions = defsData.definitions || []
      }

      if (userResponse.ok) {
        const userData = await userResponse.json()
        fetchedUserFunctionIds = userData.user?.functions || []
        setUserFunctions(fetchedUserFunctionIds)
      }

      // Filter document definitions to show only relevant ones for the user
      // Show only if: required for at least one of the user's functions
      const relevantDocumentDefinitions = allDocumentDefinitions.filter(docDef => {
        // Skip if no function requirements (these are optional, non-role-specific documents)
        if (!docDef.required_for_functions || docDef.required_for_functions.length === 0) {
          return false
        }

        // Show only if required for at least one of the user's assigned functions
        // required_for_functions stores function codes (strings)
        return docDef.required_for_functions.some((reqFuncCode: string) =>
          fetchedUserFunctionIds.includes(reqFuncCode)
        )
      })

      setDocumentDefinitions(relevantDocumentDefinitions)
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
      if (selectedSubcategoryId) {
        formData.append('subcategoryId', selectedSubcategoryId)
      }
      // Send endorsement selections as JSON string
      if (endorsementSelections.length > 0) {
        formData.append('endorsements', JSON.stringify(endorsementSelections))
      }

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        toast.success('Document uploaded successfully')
        setIsUploadOpen(false)
        // Reset form
        setSelectedDocumentType('')
        setSelectedFile(null)
        setExpiryDate('')
        setSelectedSubcategoryId(null)
        setEndorsementSelections([])
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
      // Send endorsement selections as JSON string
      if (renewalEndorsements.length > 0) {
        formData.append('endorsements', JSON.stringify(renewalEndorsements))
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
  const uploadedDefinitionIds = documents.map(doc => doc.document_definition_id).filter(Boolean)
  const missingMandatory = documentDefinitions.filter(def => def.mandatory && !uploadedDefinitionIds.includes(def.id))

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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0 gap-0">
              <form onSubmit={handleUpload} className="flex flex-col max-h-[90vh]">
                <div className="px-6 pt-6">
                  <DialogHeader>
                    <DialogTitle>Upload Document</DialogTitle>
                    <DialogDescription>
                      Select a document type and upload your file. Board members will review and approve it.
                    </DialogDescription>
                  </DialogHeader>
                </div>
                <div className="space-y-4 px-6 py-4 overflow-y-auto flex-1">
                  <div className="space-y-2">
                    <Label htmlFor="document-type">Document Type *</Label>
                    <Select value={selectedDocumentType} onValueChange={setSelectedDocumentType}>
                      <SelectTrigger id="document-type">
                        <SelectValue placeholder="Select document type" />
                      </SelectTrigger>
                      <SelectContent>
                        {documentDefinitions
                          .filter(def => !uploadedDefinitionIds.includes(def.id))
                          .map((def) => (
                            <SelectItem key={def.id} value={def.id}>
                              {def.name}
                              {def.mandatory && ' (Required)'}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Subcategory Selector - show if subcategories are available */}
                  {availableSubcategories.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="subcategory">Subcategory *</Label>
                      <Select value={selectedSubcategoryId || 'none'} onValueChange={(value) => setSelectedSubcategoryId(value === 'none' ? null : value)}>
                        <SelectTrigger id="subcategory">
                          <SelectValue placeholder="Select subcategory" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None / Not Specified</SelectItem>
                          {availableSubcategories.map((sub) => (
                            <SelectItem key={sub.id} value={sub.id}>
                              {sub.name} {sub.code && `(${sub.code})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Specify the type/class of this document (e.g., PPL vs CPL, Class 1 vs Class 2)
                      </p>
                    </div>
                  )}

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
                    <p className="text-xs text-muted-foreground">
                      Main document expiry date (optional if only privileges have expiry)
                    </p>
                  </div>

                  {/* Endorsement Selector - allow selecting endorsements/ratings with IR tracking */}
                  {availableEndorsementIds.length > 0 && (
                    <div className="space-y-2">
                      <Label>Endorsements / Ratings</Label>
                      <EndorsementSelector
                        value={endorsementSelections}
                        onChange={setEndorsementSelections}
                        availableEndorsementIds={availableEndorsementIds}
                      />
                      <p className="text-xs text-muted-foreground">
                        Select the endorsements/ratings you have for this document. For ratings that support IR, you can enable it separately.
                      </p>
                    </div>
                  )}
                </div>
                <div className="px-6 pb-6 border-t">
                  <DialogFooter className="mt-4">
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
                </div>
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
                {missingMandatory.map((def) => (
                  <li key={def.id}>{def.name}</li>
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
                  <TableHead>Privileges</TableHead>
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
                    <TableCell>
                      <DocumentPrivilegesDisplay documentId={doc.id} compact />
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0 gap-0">
          <form onSubmit={handleRenew} className="flex flex-col max-h-[90vh]">
            <div className="px-6 pt-6">
              <DialogHeader>
                <DialogTitle>Renew Document</DialogTitle>
                <DialogDescription>
                  Upload a new version of {renewingDoc?.name}. The old document will be replaced.
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="space-y-4 px-6 py-4 overflow-y-auto flex-1">
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

              {/* Endorsement Selector - edit endorsements/ratings */}
              {renewalAvailableEndorsementIds.length > 0 && (
                <div className="space-y-2">
                  <Label>Endorsements / Ratings</Label>
                  <EndorsementSelector
                    value={renewalEndorsements}
                    onChange={setRenewalEndorsements}
                    availableEndorsementIds={renewalAvailableEndorsementIds}
                  />
                  <p className="text-xs text-muted-foreground">
                    Update endorsements or ratings. Changes will replace existing endorsements.
                  </p>
                </div>
              )}
            </div>
            <div className="px-6 pb-6 border-t">
              <DialogFooter className="mt-4">
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
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
