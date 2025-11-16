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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Shield, Plus, Pencil, Trash2, Loader2, Award, Heart, CheckCircle, Plane, CreditCard } from 'lucide-react'
import { toast } from 'sonner'

// Lucide icon mapping
const iconMap: Record<string, any> = {
  Award,
  Heart,
  CheckCircle,
  Plane,
  CreditCard,
}

interface Endorsement {
  id: string
  code: string
  name: string
  name_de: string
  description: string | null
  active: boolean
  supports_ir: boolean
}

interface CategoryEndorsement {
  endorsement_id: string
  endorsements: Endorsement
}

interface DocumentCategory {
  id: string
  name: string
  description: string | null
  icon: string | null
  sort_order: number
  active: boolean
  document_subcategories?: DocumentSubcategory[]
  category_endorsements?: CategoryEndorsement[]
}

interface DocumentSubcategory {
  id: string
  category_id: string
  name: string
  code: string | null
  description: string | null
  sort_order: number
  active: boolean
}

export function DocumentCategoriesSection() {
  const [categories, setCategories] = useState<DocumentCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<DocumentCategory | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Subcategory state
  const [isCreateSubcategoryOpen, setIsCreateSubcategoryOpen] = useState(false)
  const [selectedCategoryForSubcategory, setSelectedCategoryForSubcategory] = useState<string | null>(null)
  const [editingSubcategory, setEditingSubcategory] = useState<DocumentSubcategory | null>(null)

  // Endorsement linking state
  const [availableEndorsements, setAvailableEndorsements] = useState<Endorsement[]>([])
  const [isLinkEndorsementOpen, setIsLinkEndorsementOpen] = useState(false)
  const [selectedCategoryForEndorsement, setSelectedCategoryForEndorsement] = useState<string | null>(null)

  // Category form state
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    icon: 'Award',
    sort_order: 0,
    active: true,
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
    loadCategories()
    loadEndorsements()
  }, [])

  const loadCategories = async () => {
    setIsLoading(true)

    try {
      const response = await fetch('/api/documents/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      } else {
        toast.error('Failed to load document categories')
      }
    } catch (error) {
      console.error('Error loading categories:', error)
      toast.error('Failed to load document categories')
    } finally {
      setIsLoading(false)
    }
  }

  const loadEndorsements = async () => {
    try {
      const response = await fetch('/api/endorsements?includeInactive=false')
      if (response.ok) {
        const data = await response.json()
        setAvailableEndorsements(data.endorsements || [])
      }
    } catch (error) {
      console.error('Error loading endorsements:', error)
    }
  }

  const resetCategoryForm = () => {
    setCategoryForm({
      name: '',
      description: '',
      icon: 'Award',
      sort_order: 0,
      active: true,
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

  // Category CRUD operations
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/documents/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryForm),
      })

      if (response.ok) {
        toast.success('Category created successfully')
        setIsCreateCategoryOpen(false)
        resetCategoryForm()
        loadCategories()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to create category')
      }
    } catch (error) {
      console.error('Error creating category:', error)
      toast.error('Failed to create category')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCategory) return

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/documents/categories?id=${editingCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryForm),
      })

      if (response.ok) {
        toast.success('Category updated successfully')
        setEditingCategory(null)
        resetCategoryForm()
        loadCategories()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update category')
      }
    } catch (error) {
      console.error('Error updating category:', error)
      toast.error('Failed to update category')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteCategory = async (id: string) => {
    try {
      const response = await fetch(`/api/documents/categories?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Category deleted successfully')
        loadCategories()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete category')
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      toast.error('Failed to delete category')
    }
  }

  // Subcategory CRUD operations
  const handleCreateSubcategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCategoryForSubcategory) return

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/documents/subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...subcategoryForm,
          category_id: selectedCategoryForSubcategory,
        }),
      })

      if (response.ok) {
        toast.success('Subcategory created successfully')
        setIsCreateSubcategoryOpen(false)
        setSelectedCategoryForSubcategory(null)
        resetSubcategoryForm()
        loadCategories()
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
      const response = await fetch(`/api/documents/subcategories?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Subcategory deleted successfully')
        loadCategories()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete subcategory')
      }
    } catch (error) {
      console.error('Error deleting subcategory:', error)
      toast.error('Failed to delete subcategory')
    }
  }

  // Endorsement linking operations
  const handleLinkEndorsement = async (categoryId: string, endorsementId: string) => {
    try {
      const response = await fetch('/api/documents/categories/endorsements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: categoryId,
          endorsement_id: endorsementId,
        }),
      })

      if (response.ok) {
        toast.success('Endorsement linked successfully')
        loadCategories()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to link endorsement')
      }
    } catch (error) {
      console.error('Error linking endorsement:', error)
      toast.error('Failed to link endorsement')
    }
  }

  const handleUnlinkEndorsement = async (categoryId: string, endorsementId: string) => {
    try {
      const response = await fetch(
        `/api/documents/categories/endorsements?category_id=${categoryId}&endorsement_id=${endorsementId}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        toast.success('Endorsement unlinked successfully')
        loadCategories()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to unlink endorsement')
      }
    } catch (error) {
      console.error('Error unlinking endorsement:', error)
      toast.error('Failed to unlink endorsement')
    }
  }

  const openEditCategoryDialog = (category: DocumentCategory) => {
    setEditingCategory(category)
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      icon: category.icon || 'Award',
      sort_order: category.sort_order,
      active: category.active,
    })
  }

  const closeEditCategoryDialog = () => {
    setEditingCategory(null)
    resetCategoryForm()
  }

  const openCreateSubcategoryDialog = (categoryId: string) => {
    setSelectedCategoryForSubcategory(categoryId)
    resetSubcategoryForm()
    setIsCreateSubcategoryOpen(true)
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
          Manage document categories, subcategories, and endorsements. Define which documents can have privilege
          tracking with individual expiry dates.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Document Categories</CardTitle>
              <CardDescription>
                Hierarchical organization: Categories → Subcategories → Endorsements/Privileges
              </CardDescription>
            </div>
            <Dialog open={isCreateCategoryOpen} onOpenChange={setIsCreateCategoryOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetCategoryForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleCreateCategory}>
                  <DialogHeader>
                    <DialogTitle>Create Category</DialogTitle>
                    <DialogDescription>
                      Define a new top-level document category (e.g., License, Medical)
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="cat-name">Category Name *</Label>
                      <Input
                        id="cat-name"
                        placeholder="e.g., License, Medical"
                        value={categoryForm.name}
                        onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cat-description">Description</Label>
                      <Textarea
                        id="cat-description"
                        placeholder="Brief description..."
                        value={categoryForm.description}
                        onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cat-icon">Icon</Label>
                      <Select
                        value={categoryForm.icon}
                        onValueChange={(value) => setCategoryForm({ ...categoryForm, icon: value })}
                      >
                        <SelectTrigger id="cat-icon">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Award">Award (License)</SelectItem>
                          <SelectItem value="Heart">Heart (Medical)</SelectItem>
                          <SelectItem value="CheckCircle">Check Circle</SelectItem>
                          <SelectItem value="Plane">Plane</SelectItem>
                          <SelectItem value="CreditCard">Credit Card</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cat-sort">Sort Order</Label>
                      <Input
                        id="cat-sort"
                        type="number"
                        value={categoryForm.sort_order}
                        onChange={(e) =>
                          setCategoryForm({ ...categoryForm, sort_order: parseInt(e.target.value) || 0 })
                        }
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateCategoryOpen(false)}
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
          {categories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No categories defined yet</p>
              <p className="text-sm mt-1">Click &quot;Add Category&quot; to create one</p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {categories.map((category) => {
                const IconComponent = iconMap[category.icon || 'Award'] || Award
                return (
                  <AccordionItem key={category.id} value={category.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 flex-1">
                        <IconComponent className="h-5 w-5" />
                        <span className="font-medium">{category.name}</span>
                        <div className="flex items-center gap-2 ml-auto mr-4">
                          <Dialog
                            open={editingCategory?.id === category.id}
                            onOpenChange={(open) => !open && closeEditCategoryDialog()}
                          >
                            <DialogTrigger asChild>
                              <div
                                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-3 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openEditCategoryDialog(category)
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </div>
                            </DialogTrigger>
                            <DialogContent onClick={(e) => e.stopPropagation()}>
                              <form onSubmit={handleUpdateCategory}>
                                <DialogHeader>
                                  <DialogTitle>Edit Category</DialogTitle>
                                  <DialogDescription>Update category details</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="edit-cat-name">Category Name *</Label>
                                    <Input
                                      id="edit-cat-name"
                                      value={categoryForm.name}
                                      onChange={(e) =>
                                        setCategoryForm({ ...categoryForm, name: e.target.value })
                                      }
                                      required
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor="edit-cat-description">Description</Label>
                                    <Textarea
                                      id="edit-cat-description"
                                      value={categoryForm.description}
                                      onChange={(e) =>
                                        setCategoryForm({ ...categoryForm, description: e.target.value })
                                      }
                                      rows={3}
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor="edit-cat-icon">Icon</Label>
                                    <Select
                                      value={categoryForm.icon}
                                      onValueChange={(value) =>
                                        setCategoryForm({ ...categoryForm, icon: value })
                                      }
                                    >
                                      <SelectTrigger id="edit-cat-icon">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Award">Award (License)</SelectItem>
                                        <SelectItem value="Heart">Heart (Medical)</SelectItem>
                                        <SelectItem value="CheckCircle">Check Circle</SelectItem>
                                        <SelectItem value="Plane">Plane</SelectItem>
                                        <SelectItem value="CreditCard">Credit Card</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={closeEditCategoryDialog}
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
                              <div
                                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-3 cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </div>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Category</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete &quot;{category.name}&quot;? This will also
                                  delete all subcategories and endorsements.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteCategory(category.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pl-8 pr-4 pb-4 space-y-4">
                        {category.description && (
                          <p className="text-sm text-muted-foreground">{category.description}</p>
                        )}

                        {/* Subcategories Section */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium">Subcategories</h4>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openCreateSubcategoryDialog(category.id)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Subcategory
                            </Button>
                          </div>
                          {category.document_subcategories && category.document_subcategories.length > 0 ? (
                            <div className="space-y-1">
                              {category.document_subcategories.map((sub) => (
                                <div
                                  key={sub.id}
                                  className="flex items-center justify-between p-2 border rounded-md"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">{sub.name}</span>
                                    {sub.code && <Badge variant="outline">{sub.code}</Badge>}
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
                                          Delete &quot;{sub.name}&quot;?
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDeleteSubcategory(sub.id)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
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

                        {/* Linked Endorsements Section */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium">Applicable Endorsements/Ratings</h4>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedCategoryForEndorsement(category.id)
                                setIsLinkEndorsementOpen(true)
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Link Endorsement
                            </Button>
                          </div>
                          {category.category_endorsements && category.category_endorsements.length > 0 ? (
                            <div className="space-y-1">
                              {category.category_endorsements.map((ce) => (
                                <div key={ce.endorsement_id} className="flex items-center justify-between p-2 border rounded-md">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">{ce.endorsements.name}</span>
                                    <Badge variant="outline">{ce.endorsements.code}</Badge>
                                    {ce.endorsements.supports_ir && <Badge variant="secondary">IR</Badge>}
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
                                          Are you sure you want to unlink {ce.endorsements.name} from this category?
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleUnlinkEndorsement(category.id, ce.endorsement_id)}
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
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
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
                  placeholder="Brief description..."
                  value={subcategoryForm.description}
                  onChange={(e) => setSubcategoryForm({ ...subcategoryForm, description: e.target.value })}
                  rows={3}
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
                  setSelectedCategoryForSubcategory(null)
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Endorsement to Category</DialogTitle>
            <DialogDescription>
              Select an endorsement/rating to link to this category. Users will be able to select from these when uploading documents.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {availableEndorsements.length > 0 ? (
              <div className="space-y-2">
                {availableEndorsements
                  .filter((endorsement) => {
                    const category = categories.find((c) => c.id === selectedCategoryForEndorsement)
                    if (!category?.category_endorsements) return true
                    return !category.category_endorsements.some(
                      (ce) => ce.endorsement_id === endorsement.id
                    )
                  })
                  .map((endorsement) => (
                    <div
                      key={endorsement.id}
                      className="flex items-center justify-between p-3 border rounded-md hover:bg-accent cursor-pointer"
                      onClick={() => {
                        if (selectedCategoryForEndorsement) {
                          handleLinkEndorsement(selectedCategoryForEndorsement, endorsement.id)
                          setIsLinkEndorsementOpen(false)
                          setSelectedCategoryForEndorsement(null)
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{endorsement.name}</span>
                        <Badge variant="outline">{endorsement.code}</Badge>
                        {endorsement.supports_ir && <Badge variant="secondary">IR</Badge>}
                      </div>
                    </div>
                  ))}
                {availableEndorsements.filter((endorsement) => {
                  const category = categories.find((c) => c.id === selectedCategoryForEndorsement)
                  if (!category?.category_endorsements) return true
                  return !category.category_endorsements.some((ce) => ce.endorsement_id === endorsement.id)
                }).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    All available endorsements are already linked to this category.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No endorsements available. Create endorsements in the Endorsements tab first.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsLinkEndorsementOpen(false)
                setSelectedCategoryForEndorsement(null)
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
