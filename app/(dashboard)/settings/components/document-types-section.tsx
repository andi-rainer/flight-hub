'use client'

import { useState, useEffect } from 'react'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Shield, Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { DocumentDefinition, FunctionMaster } from '@/lib/database.types'

interface DocumentCategory {
  id: string
  name: string
  requires_endorsements: boolean
}

export function DocumentTypesSection() {
  const [documentTypes, setDocumentTypes] = useState<DocumentDefinition[]>([])
  const [functions, setFunctions] = useState<FunctionMaster[]>([])
  const [categories, setCategories] = useState<DocumentCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingDocType, setEditingDocType] = useState<DocumentDefinition | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: null as string | null,
    mandatory: false,
    expires: false,
    required_for_functions: [] as string[],
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)

    try {
      // Fetch document types, functions, and categories
      const [typesResponse, functionsResponse, categoriesResponse] = await Promise.all([
        fetch('/api/documents/types'),
        fetch('/api/functions'),
        fetch('/api/documents/categories'),
      ])

      if (typesResponse.ok) {
        const typesData = await typesResponse.json()
        setDocumentTypes(typesData.documentTypes || [])
      }

      if (functionsResponse.ok) {
        const functionsData = await functionsResponse.json()
        setFunctions(functionsData.functions || [])
      }

      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json()
        setCategories(categoriesData.categories || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load document types')
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category_id: null,
      mandatory: false,
      expires: false,
      required_for_functions: [],
    })
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/documents/types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success('Document type created successfully')
        setIsCreateOpen(false)
        resetForm()
        loadData()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to create document type')
      }
    } catch (error) {
      console.error('Error creating document type:', error)
      toast.error('Failed to create document type')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingDocType) return

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/documents/types?id=${editingDocType.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success('Document type updated successfully')
        setEditingDocType(null)
        resetForm()
        loadData()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update document type')
      }
    } catch (error) {
      console.error('Error updating document type:', error)
      toast.error('Failed to update document type')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/documents/types?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Document type deleted successfully')
        loadData()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete document type')
      }
    } catch (error) {
      console.error('Error deleting document type:', error)
      toast.error('Failed to delete document type')
    }
  }

  const openEditDialog = async (docType: DocumentDefinition) => {
    setEditingDocType(docType)
    setFormData({
      name: docType.name,
      description: docType.description || '',
      category_id: (docType as any).category_id || null,
      mandatory: docType.mandatory ?? false,
      expires: docType.expires ?? false,
      required_for_functions: docType.required_for_functions || [],
    })
  }

  const closeEditDialog = () => {
    setEditingDocType(null)
    resetForm()
  }

  const toggleFunctionRequirement = (functionId: string) => {
    setFormData((prev) => ({
      ...prev,
      required_for_functions: prev.required_for_functions.includes(functionId)
        ? prev.required_for_functions.filter((id) => id !== functionId)
        : [...prev.required_for_functions, functionId],
    }))
  }

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
    <>
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Board Member Access</AlertTitle>
        <AlertDescription>
          Configure which documents are required for each member function. Set expiry rules and mandatory
          requirements.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Document Type Definitions</CardTitle>
              <CardDescription>
                Define document types and their requirements for member functions
              </CardDescription>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Document Type
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleCreate}>
                  <DialogHeader>
                    <DialogTitle>Create Document Type</DialogTitle>
                    <DialogDescription>
                      Define a new document type that members can upload
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Document Name *</Label>
                      <Input
                        id="name"
                        placeholder="e.g., Pilot License, Medical Certificate"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="doc-category">Document Category *</Label>
                      <Select
                        value={formData.category_id || 'none'}
                        onValueChange={(value) =>
                          setFormData({ ...formData, category_id: value === 'none' ? null : value })
                        }
                      >
                        <SelectTrigger id="doc-category">
                          <SelectValue placeholder="Select category (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                              {cat.requires_endorsements && ' (Supports Privileges)'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Links this document type to a category. Subcategory will be selected by the user during upload.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Brief description of this document type..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="mandatory"
                        checked={formData.mandatory}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, mandatory: checked as boolean })
                        }
                      />
                      <Label htmlFor="mandatory" className="font-normal cursor-pointer">
                        Mandatory (must be uploaded)
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="expires"
                        checked={formData.expires}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, expires: checked as boolean })
                        }
                      />
                      <Label htmlFor="expires" className="font-normal cursor-pointer">
                        This document has an expiry date
                      </Label>
                    </div>
                    {formData.expires && (
                      <p className="text-xs text-muted-foreground">
                        Users will need to provide an expiry date when uploading this document type
                      </p>
                    )}

                    <div className="space-y-2">
                      <Label>Required for Functions</Label>
                      <div className="space-y-2 border rounded-md p-3 max-h-40 overflow-y-auto">
                        {functions.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No functions defined</p>
                        ) : (
                          functions.map((func) => (
                            <div key={func.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`func-${func.id}`}
                                checked={formData.required_for_functions.includes(func.id)}
                                onCheckedChange={() => toggleFunctionRequirement(func.id)}
                              />
                              <Label
                                htmlFor={`func-${func.id}`}
                                className="font-normal cursor-pointer"
                              >
                                {func.name}
                              </Label>
                            </div>
                          ))
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Members with these functions will be required to upload this document
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateOpen(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Create
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {documentTypes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No document types defined yet</p>
              <p className="text-sm mt-1">Click &quot;Add Document Type&quot; to create one</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Mandatory</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Required For</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documentTypes.map((docType) => (
                    <TableRow key={docType.id}>
                      <TableCell className="font-medium">{docType.name}</TableCell>
                      <TableCell>{(docType as any).category || '—'}</TableCell>
                      <TableCell>
                        {docType.mandatory ? (
                          <Badge variant="default">Yes</Badge>
                        ) : (
                          <Badge variant="outline">No</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {docType.expires ? (
                          <Badge variant="secondary">Yes</Badge>
                        ) : (
                          <Badge variant="outline">No</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {docType.required_for_functions && docType.required_for_functions.length > 0
                          ? `${docType.required_for_functions.length} function(s)`
                          : 'All'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Dialog
                            open={editingDocType?.id === docType.id}
                            onOpenChange={(open) => !open && closeEditDialog()}
                          >
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => openEditDialog(docType)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-h-[90vh] overflow-y-auto">
                              <form onSubmit={handleUpdate}>
                                <DialogHeader>
                                  <DialogTitle>Edit Document Type</DialogTitle>
                                  <DialogDescription>
                                    Update document type details and requirements
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  {/* Same form fields as create dialog */}
                                  <div className="space-y-2">
                                    <Label htmlFor="edit-name">Document Name *</Label>
                                    <Input
                                      id="edit-name"
                                      value={formData.name}
                                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                      required
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor="edit-doc-category">Document Category *</Label>
                                    <Select
                                      value={formData.category_id || 'none'}
                                      onValueChange={(value) =>
                                        setFormData({ ...formData, category_id: value === 'none' ? null : value })
                                      }
                                    >
                                      <SelectTrigger id="edit-doc-category">
                                        <SelectValue placeholder="Select category (optional)" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        {categories.map((cat) => (
                                          <SelectItem key={cat.id} value={cat.id}>
                                            {cat.name}
                                            {cat.requires_endorsements && ' (Supports Privileges)'}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                      Links this document type to a category. Subcategory will be selected by the user during upload.
                                    </p>
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor="edit-description">Description</Label>
                                    <Textarea
                                      id="edit-description"
                                      value={formData.description}
                                      onChange={(e) =>
                                        setFormData({ ...formData, description: e.target.value })
                                      }
                                      rows={3}
                                    />
                                  </div>

                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="edit-mandatory"
                                      checked={formData.mandatory}
                                      onCheckedChange={(checked) =>
                                        setFormData({ ...formData, mandatory: checked as boolean })
                                      }
                                    />
                                    <Label htmlFor="edit-mandatory" className="font-normal cursor-pointer">
                                      Mandatory (must be uploaded)
                                    </Label>
                                  </div>

                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="edit-expires"
                                      checked={formData.expires}
                                      onCheckedChange={(checked) =>
                                        setFormData({ ...formData, expires: checked as boolean })
                                      }
                                    />
                                    <Label htmlFor="edit-expires" className="font-normal cursor-pointer">
                                      This document has an expiry date
                                    </Label>
                                  </div>
                                  {formData.expires && (
                                    <p className="text-xs text-muted-foreground">
                                      Users will need to provide an expiry date when uploading this document type
                                    </p>
                                  )}

                                  <div className="space-y-2">
                                    <Label>Required for Functions</Label>
                                    <div className="space-y-2 border rounded-md p-3 max-h-40 overflow-y-auto">
                                      {functions.map((func) => (
                                        <div key={func.id} className="flex items-center space-x-2">
                                          <Checkbox
                                            id={`edit-func-${func.id}`}
                                            checked={formData.required_for_functions.includes(func.id)}
                                            onCheckedChange={() => toggleFunctionRequirement(func.id)}
                                          />
                                          <Label
                                            htmlFor={`edit-func-${func.id}`}
                                            className="font-normal cursor-pointer"
                                          >
                                            {func.name}
                                          </Label>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={closeEditDialog}
                                    disabled={isSubmitting}
                                  >
                                    Cancel
                                  </Button>
                                  <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Save Changes
                                  </Button>
                                </DialogFooter>
                              </form>
                            </DialogContent>
                          </Dialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Document Type</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete &quot;{docType.name}&quot;? This action
                                  cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(docType.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
