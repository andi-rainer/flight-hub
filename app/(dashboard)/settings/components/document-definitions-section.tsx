'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
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
import { Shield, Plus, Pencil, Trash2, Loader2, FileText, Tag } from 'lucide-react'
import { toast } from 'sonner'
import type { FunctionMaster } from '@/lib/database.types'

interface Endorsement {
  id: string
  code: string
  name: string
  name_de: string
  description: string | null
  active: boolean
  supports_ir: boolean
}

interface DefinitionEndorsement {
  endorsement_id: string
  endorsements: Endorsement
}

interface DocumentSubcategory {
  id: string
  name: string
  code: string | null
  description: string | null
  sort_order: number
  active: boolean
  document_definition_id: string
}

interface DocumentDefinition {
  id: string
  name: string
  description: string | null
  icon: string | null
  sort_order: number
  active: boolean
  mandatory: boolean
  expires: boolean
  has_subcategories: boolean
  has_endorsements: boolean
  required_for_functions: string[]
  document_subcategories?: DocumentSubcategory[]
  definition_endorsements?: DefinitionEndorsement[]
}

export function DocumentDefinitionsSection() {
  const [definitions, setDefinitions] = useState<DocumentDefinition[]>([])
  const [functions, setFunctions] = useState<FunctionMaster[]>([])
  const [availableEndorsements, setAvailableEndorsements] = useState<Endorsement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingDefinition, setEditingDefinition] = useState<DocumentDefinition | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Subcategory dialogs
  const [isCreateSubcategoryOpen, setIsCreateSubcategoryOpen] = useState(false)
  const [selectedDefinitionForSubcategory, setSelectedDefinitionForSubcategory] = useState<string | null>(null)
  const [editingSubcategory, setEditingSubcategory] = useState<DocumentSubcategory | null>(null)

  // Endorsement linking dialog
  const [isLinkEndorsementOpen, setIsLinkEndorsementOpen] = useState(false)
  const [selectedDefinitionForEndorsement, setSelectedDefinitionForEndorsement] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '',
    sort_order: 0,
    active: true,
    mandatory: false,
    expires: false,
    has_subcategories: false,
    has_endorsements: false,
    required_for_functions: [] as string[],
  })

  // Subcategory form state
  const [subcategoryForm, setSubcategoryForm] = useState({
    name: '',
    code: '',
    description: '',
    sort_order: 0,
    active: true,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)

    try {
      const [definitionsResponse, functionsResponse, endorsementsResponse] = await Promise.all([
        fetch('/api/documents/definitions'),
        fetch('/api/functions'),
        fetch('/api/endorsements?includeInactive=false'),
      ])

      if (definitionsResponse.ok) {
        const data = await definitionsResponse.json()
        setDefinitions(data.definitions || [])
      }

      if (functionsResponse.ok) {
        const data = await functionsResponse.json()
        setFunctions(data.functions || [])
      }

      if (endorsementsResponse.ok) {
        const data = await endorsementsResponse.json()
        setAvailableEndorsements(data.endorsements || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load document definitions')
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      icon: '',
      sort_order: 0,
      active: true,
      mandatory: false,
      expires: false,
      has_subcategories: false,
      has_endorsements: false,
      required_for_functions: [],
    })
  }

  const resetSubcategoryForm = () => {
    setSubcategoryForm({
      name: '',
      code: '',
      description: '',
      sort_order: 0,
      active: true,
    })
  }

  const openEditDialog = (definition: DocumentDefinition) => {
    setEditingDefinition(definition)
    setFormData({
      name: definition.name,
      description: definition.description || '',
      icon: definition.icon || '',
      sort_order: definition.sort_order,
      active: definition.active,
      mandatory: definition.mandatory,
      expires: definition.expires,
      has_subcategories: definition.has_subcategories,
      has_endorsements: definition.has_endorsements,
      required_for_functions: definition.required_for_functions || [],
    })
  }

  const closeEditDialog = () => {
    setEditingDefinition(null)
    resetForm()
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/documents/definitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success('Document definition created successfully')
        setIsCreateOpen(false)
        resetForm()
        loadData()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to create document definition')
      }
    } catch (error) {
      console.error('Error creating document definition:', error)
      toast.error('Failed to create document definition')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingDefinition) return

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/documents/definitions?id=${editingDefinition.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success('Document definition updated successfully')
        closeEditDialog()
        loadData()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update document definition')
      }
    } catch (error) {
      console.error('Error updating document definition:', error)
      toast.error('Failed to update document definition')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/documents/definitions?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Document definition deleted successfully')
        loadData()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete document definition')
      }
    } catch (error) {
      console.error('Error deleting document definition:', error)
      toast.error('Failed to delete document definition')
    }
  }

  const toggleFunctionRequirement = (functionCode: string) => {
    setFormData((prev) => ({
      ...prev,
      required_for_functions: prev.required_for_functions.includes(functionCode)
        ? prev.required_for_functions.filter((code) => code !== functionCode)
        : [...prev.required_for_functions, functionCode],
    }))
  }

  // Subcategory management
  const handleCreateSubcategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDefinitionForSubcategory) return

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/documents/definitions/subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...subcategoryForm,
          document_definition_id: selectedDefinitionForSubcategory,
        }),
      })

      if (response.ok) {
        toast.success('Subcategory created successfully')
        setIsCreateSubcategoryOpen(false)
        setSelectedDefinitionForSubcategory(null)
        resetSubcategoryForm()
        loadData()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to create subcategory')
      }
    } catch (error) {
      console.error('Error creating subcategory:', error)
      toast.error('Failed to create subcategory')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteSubcategory = async (id: string) => {
    try {
      const response = await fetch(`/api/documents/definitions/subcategories?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Subcategory deleted successfully')
        loadData()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete subcategory')
      }
    } catch (error) {
      console.error('Error deleting subcategory:', error)
      toast.error('Failed to delete subcategory')
    }
  }

  // Endorsement management
  const handleLinkEndorsement = async (definitionId: string, endorsementId: string) => {
    try {
      const response = await fetch('/api/documents/definitions/endorsements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_definition_id: definitionId,
          endorsement_id: endorsementId,
        }),
      })

      if (response.ok) {
        toast.success('Endorsement linked successfully')
        loadData()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to link endorsement')
      }
    } catch (error) {
      console.error('Error linking endorsement:', error)
      toast.error('Failed to link endorsement')
    }
  }

  const handleUnlinkEndorsement = async (definitionId: string, endorsementId: string) => {
    try {
      const response = await fetch(
        `/api/documents/definitions/endorsements?document_definition_id=${definitionId}&endorsement_id=${endorsementId}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        toast.success('Endorsement unlinked successfully')
        loadData()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to unlink endorsement')
      }
    } catch (error) {
      console.error('Error unlinking endorsement:', error)
      toast.error('Failed to unlink endorsement')
    }
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
        <AlertTitle>Unified Document Management</AlertTitle>
        <AlertDescription>
          Configure document requirements for member functions. Define which documents can have subcategories
          (e.g., PPL, CPL) and endorsements/ratings (e.g., SEP, MEP, IR).
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Document Definitions</CardTitle>
              <CardDescription>
                Manage document types, subcategories, and endorsement requirements
              </CardDescription>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Document
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
                <form onSubmit={handleCreate}>
                  <DialogHeader>
                    <DialogTitle>Create Document Definition</DialogTitle>
                    <DialogDescription>
                      Define a new document type with its requirements and configuration
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
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Brief description of this document..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="icon">Icon</Label>
                        <Input
                          id="icon"
                          placeholder="e.g., FileText"
                          value={formData.icon}
                          onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="sort_order">Sort Order</Label>
                        <Input
                          id="sort_order"
                          type="number"
                          value={formData.sort_order}
                          onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <Label>Configuration</Label>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="mandatory"
                          checked={formData.mandatory}
                          onCheckedChange={(checked) => setFormData({ ...formData, mandatory: checked as boolean })}
                        />
                        <Label htmlFor="mandatory" className="font-normal cursor-pointer">
                          Mandatory (must be uploaded)
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="expires"
                          checked={formData.expires}
                          onCheckedChange={(checked) => setFormData({ ...formData, expires: checked as boolean })}
                        />
                        <Label htmlFor="expires" className="font-normal cursor-pointer">
                          This document has an expiry date
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="has_subcategories"
                          checked={formData.has_subcategories}
                          onCheckedChange={(checked) => setFormData({ ...formData, has_subcategories: checked as boolean })}
                        />
                        <Label htmlFor="has_subcategories" className="font-normal cursor-pointer">
                          Has subcategories (e.g., PPL, CPL, ATPL)
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="has_endorsements"
                          checked={formData.has_endorsements}
                          onCheckedChange={(checked) => setFormData({ ...formData, has_endorsements: checked as boolean })}
                        />
                        <Label htmlFor="has_endorsements" className="font-normal cursor-pointer">
                          Can have endorsements/ratings (e.g., SEP, MEP, IR)
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="active"
                          checked={formData.active}
                          onCheckedChange={(checked) => setFormData({ ...formData, active: checked as boolean })}
                        />
                        <Label htmlFor="active" className="font-normal cursor-pointer">
                          Active
                        </Label>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <Label>Required for Functions</Label>
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
                        {functions.map((func) => (
                          <div key={func.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`func-${func.id}`}
                              checked={formData.required_for_functions.includes(func.code)}
                              onCheckedChange={() => toggleFunctionRequirement(func.code)}
                            />
                            <Label htmlFor={`func-${func.id}`} className="font-normal cursor-pointer text-sm">
                              {func.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Select which member functions require this document
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
          {definitions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No document definitions yet</p>
              <p className="text-sm mt-1">Click &quot;Add Document&quot; to create one</p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {definitions.map((definition) => (
                <AccordionItem key={definition.id} value={definition.id}>
                  <AccordionTrigger>
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{definition.name}</span>
                        <div className="flex gap-1">
                          {definition.mandatory && <Badge variant="default">Mandatory</Badge>}
                          {definition.expires && <Badge variant="secondary">Expires</Badge>}
                          {definition.has_subcategories && <Badge variant="outline">Has Subcategories</Badge>}
                          {definition.has_endorsements && <Badge variant="outline">Has Endorsements</Badge>}
                          {!definition.active && <Badge variant="destructive">Inactive</Badge>}
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-6 pt-4">
                      {/* Definition Details */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">Details</h4>
                          <div className="flex gap-2">
                            <Dialog
                              open={editingDefinition?.id === definition.id}
                              onOpenChange={(open) => !open && closeEditDialog()}
                            >
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => openEditDialog(definition)}>
                                  <Pencil className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
                                <form onSubmit={handleUpdate}>
                                  <DialogHeader>
                                    <DialogTitle>Edit Document Definition</DialogTitle>
                                    <DialogDescription>Update document configuration</DialogDescription>
                                  </DialogHeader>
                                  {/* Same form fields as create - reuse */}
                                  <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                      <Label>Document Name *</Label>
                                      <Input
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Description</Label>
                                      <Textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={3}
                                      />
                                    </div>
                                    <div className="space-y-3 pt-2">
                                      <Label>Configuration</Label>
                                      <div className="flex items-center space-x-2">
                                        <Checkbox
                                          checked={formData.mandatory}
                                          onCheckedChange={(checked) => setFormData({ ...formData, mandatory: checked as boolean })}
                                        />
                                        <Label className="font-normal cursor-pointer">Mandatory</Label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <Checkbox
                                          checked={formData.expires}
                                          onCheckedChange={(checked) => setFormData({ ...formData, expires: checked as boolean })}
                                        />
                                        <Label className="font-normal cursor-pointer">Has expiry date</Label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <Checkbox
                                          checked={formData.has_subcategories}
                                          onCheckedChange={(checked) => setFormData({ ...formData, has_subcategories: checked as boolean })}
                                        />
                                        <Label className="font-normal cursor-pointer">Has subcategories</Label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <Checkbox
                                          checked={formData.has_endorsements}
                                          onCheckedChange={(checked) => setFormData({ ...formData, has_endorsements: checked as boolean })}
                                        />
                                        <Label className="font-normal cursor-pointer">Can have endorsements</Label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <Checkbox
                                          checked={formData.active}
                                          onCheckedChange={(checked) => setFormData({ ...formData, active: checked as boolean })}
                                        />
                                        <Label className="font-normal cursor-pointer">Active</Label>
                                      </div>
                                    </div>
                                    <div className="space-y-3 pt-2">
                                      <Label>Required for Functions</Label>
                                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
                                        {functions.map((func) => (
                                          <div key={func.id} className="flex items-center space-x-2">
                                            <Checkbox
                                              checked={formData.required_for_functions.includes(func.code)}
                                              onCheckedChange={() => toggleFunctionRequirement(func.code)}
                                            />
                                            <Label className="font-normal cursor-pointer text-sm">{func.name}</Label>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button type="button" variant="outline" onClick={closeEditDialog} disabled={isSubmitting}>
                                      Cancel
                                    </Button>
                                    <Button type="submit" disabled={isSubmitting}>
                                      {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                      Update
                                    </Button>
                                  </DialogFooter>
                                </form>
                              </DialogContent>
                            </Dialog>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Document Definition</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete &quot;{definition.name}&quot;? This will also delete all
                                    associated subcategories and endorsement links.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(definition.id)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                        {definition.description && (
                          <p className="text-sm text-muted-foreground">{definition.description}</p>
                        )}
                        {definition.required_for_functions && definition.required_for_functions.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            <span className="text-xs text-muted-foreground">Required for:</span>
                            {definition.required_for_functions.map((funcCode) => {
                              const func = functions.find((f) => f.code === funcCode)
                              return func ? (
                                <Badge key={funcCode} variant="secondary" className="text-xs">
                                  {func.name}
                                </Badge>
                              ) : null
                            })}
                          </div>
                        )}
                      </div>

                      {/* Subcategories Section */}
                      {definition.has_subcategories && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium">Subcategories</h4>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedDefinitionForSubcategory(definition.id)
                                setIsCreateSubcategoryOpen(true)
                                resetSubcategoryForm()
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Subcategory
                            </Button>
                          </div>
                          {definition.document_subcategories && definition.document_subcategories.length > 0 ? (
                            <div className="space-y-1">
                              {definition.document_subcategories.map((sub) => (
                                <div key={sub.id} className="flex items-center justify-between p-2 border rounded-md">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">{sub.name}</span>
                                    {sub.code && <Badge variant="outline">{sub.code}</Badge>}
                                    {!sub.active && <Badge variant="destructive">Inactive</Badge>}
                                  </div>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Subcategory</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete &quot;{sub.name}&quot;?
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteSubcategory(sub.id)}>
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No subcategories defined</p>
                          )}
                        </div>
                      )}

                      {/* Endorsements Section */}
                      {definition.has_endorsements && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium">Applicable Endorsements/Ratings</h4>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedDefinitionForEndorsement(definition.id)
                                setIsLinkEndorsementOpen(true)
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Link Endorsement
                            </Button>
                          </div>
                          {definition.definition_endorsements && definition.definition_endorsements.length > 0 ? (
                            <div className="space-y-1">
                              {definition.definition_endorsements.map((de) => (
                                <div key={de.endorsement_id} className="flex items-center justify-between p-2 border rounded-md">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">{de.endorsements.name}</span>
                                    <Badge variant="outline">{de.endorsements.code}</Badge>
                                    {de.endorsements.supports_ir && <Badge variant="secondary">IR</Badge>}
                                  </div>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Unlink Endorsement</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to unlink {de.endorsements.name}?
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleUnlinkEndorsement(definition.id, de.endorsement_id)}
                                        >
                                          Unlink
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No endorsements linked</p>
                          )}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Subcategory Create Dialog */}
      <Dialog open={isCreateSubcategoryOpen} onOpenChange={setIsCreateSubcategoryOpen}>
        <DialogContent>
          <form onSubmit={handleCreateSubcategory}>
            <DialogHeader>
              <DialogTitle>Create Subcategory</DialogTitle>
              <DialogDescription>Add a subcategory (e.g., PPL, CPL, Class 1, Class 2)</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="sub-name">Subcategory Name *</Label>
                <Input
                  id="sub-name"
                  placeholder="e.g., PPL, Class 1"
                  value={subcategoryForm.name}
                  onChange={(e) => setSubcategoryForm({ ...subcategoryForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sub-code">Code</Label>
                <Input
                  id="sub-code"
                  placeholder="e.g., PPL, CL1"
                  value={subcategoryForm.code}
                  onChange={(e) => setSubcategoryForm({ ...subcategoryForm, code: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sub-description">Description</Label>
                <Textarea
                  id="sub-description"
                  placeholder="Optional description..."
                  value={subcategoryForm.description}
                  onChange={(e) => setSubcategoryForm({ ...subcategoryForm, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sub-sort">Sort Order</Label>
                <Input
                  id="sub-sort"
                  type="number"
                  value={subcategoryForm.sort_order}
                  onChange={(e) =>
                    setSubcategoryForm({ ...subcategoryForm, sort_order: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateSubcategoryOpen(false)
                  setSelectedDefinitionForSubcategory(null)
                }}
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

      {/* Link Endorsement Dialog */}
      <Dialog open={isLinkEndorsementOpen} onOpenChange={setIsLinkEndorsementOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Link Endorsements</DialogTitle>
            <DialogDescription>
              Select endorsements that can apply to this document type
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {availableEndorsements.length > 0 ? (
              <>
                <div className="max-h-[400px] overflow-y-auto border rounded-md p-2 space-y-1">
                  {availableEndorsements
                    .filter((endorsement) => {
                      const definition = definitions.find((d) => d.id === selectedDefinitionForEndorsement)
                      if (!definition?.definition_endorsements) return true
                      return !definition.definition_endorsements.some(
                        (de) => de.endorsement_id === endorsement.id
                      )
                    })
                    .map((endorsement) => (
                      <button
                        key={endorsement.id}
                        type="button"
                        className="w-full flex items-center justify-between p-3 rounded-md hover:bg-accent transition-colors text-left"
                        onClick={() => {
                          if (selectedDefinitionForEndorsement) {
                            handleLinkEndorsement(selectedDefinitionForEndorsement, endorsement.id)
                            setIsLinkEndorsementOpen(false)
                            setSelectedDefinitionForEndorsement(null)
                          }
                        }}
                      >
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{endorsement.name}</span>
                            <Badge variant="outline" className="text-xs">{endorsement.code}</Badge>
                            {endorsement.supports_ir && (
                              <Badge variant="secondary" className="text-xs">IR Capable</Badge>
                            )}
                          </div>
                          {endorsement.name_de && (
                            <div className="text-xs text-muted-foreground">
                              {endorsement.name_de}
                            </div>
                          )}
                          {endorsement.description && (
                            <div className="text-xs text-muted-foreground">
                              {endorsement.description}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  {availableEndorsements.filter((endorsement) => {
                    const definition = definitions.find((d) => d.id === selectedDefinitionForEndorsement)
                    if (!definition?.definition_endorsements) return true
                    return !definition.definition_endorsements.some((de) => de.endorsement_id === endorsement.id)
                  }).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      All available endorsements are already linked
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Click an endorsement to link it to this document type
                </p>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Tag className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No endorsements available</p>
                <p className="text-xs mt-1">Create endorsements in the Endorsements tab first</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsLinkEndorsementOpen(false)
                setSelectedDefinitionForEndorsement(null)
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
