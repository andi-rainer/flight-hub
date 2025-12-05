'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Plus, Pencil, Trash2, Loader2, Shield, Users, AlertCircle } from 'lucide-react'
import { createFunction, updateFunction, deleteFunction, toggleFunctionActive } from '@/lib/actions/functions'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { FunctionWithStats } from '@/lib/types'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

interface FunctionsSectionProps {
  functions: FunctionWithStats[]
  categories: Array<{ id: string; name_en: string; code: string }>
}

export function FunctionsSection({ functions, categories }: FunctionsSectionProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingFunction, setEditingFunction] = useState<FunctionWithStats | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const [formData, setFormData] = useState({
    name: '',
    name_de: '',
    description: '',
    description_de: '',
    category_id: '',
  })

  const systemFunctions = functions.filter(f => f.is_system)
  const customFunctions = functions.filter(f => !f.is_system)

  const resetForm = () => {
    setFormData({
      name: '',
      name_de: '',
      description: '',
      description_de: '',
      category_id: '',
    })
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const result = await createFunction({
      name: formData.name,
      name_de: formData.name_de || formData.name,
      description: formData.description || null,
      description_de: formData.description_de || formData.description || null,
      category_id: formData.category_id || null,
    })

    if (result.success) {
      toast.success('Function created successfully')
      setIsCreateOpen(false)
      resetForm()
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to create function')
    }

    setIsSubmitting(false)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingFunction || !editingFunction.id) return

    setIsSubmitting(true)

    const result = await updateFunction(editingFunction.id, {
      name: formData.name,
      name_de: formData.name_de,
      description: formData.description || null,
      description_de: formData.description_de || null,
      category_id: formData.category_id || null,
    })

    if (result.success) {
      toast.success('Function updated successfully')
      setEditingFunction(null)
      resetForm()
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to update function')
    }

    setIsSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    const result = await deleteFunction(id)

    if (result.success) {
      toast.success('Function deleted successfully')
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to delete function')
    }
  }

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    const result = await toggleFunctionActive(id, !currentActive)

    if (result.success) {
      toast.success(`Function ${!currentActive ? 'activated' : 'deactivated'}`)
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to toggle function status')
    }
  }

  const openEditDialog = (func: FunctionWithStats) => {
    setEditingFunction(func)
    setFormData({
      name: func.name || '',
      name_de: func.name_de || func.name || '',
      description: func.description || '',
      description_de: func.description_de || '',
      category_id: func.category_id || '',
    })
  }

  const closeEditDialog = () => {
    setEditingFunction(null)
    resetForm()
  }

  const getCategoryBadgeColor = (categoryCode: string) => {
    switch (categoryCode) {
      case 'aviation': return 'bg-blue-500'
      case 'skydiving': return 'bg-green-500'
      case 'operations': return 'bg-orange-500'
      case 'administration': return 'bg-purple-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>System Functions</strong> are built into the application and cannot be deleted.
          You can rename them or toggle them active/inactive, but their function codes are protected.
        </AlertDescription>
      </Alert>

      {/* System Functions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-500" />
                System Functions
              </CardTitle>
              <CardDescription>
                Built-in functions required by the application
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {systemFunctions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No system functions found
                    </TableCell>
                  </TableRow>
                ) : (
                  systemFunctions.map((func) => (
                    <TableRow key={func.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{func.name}</div>
                          {func.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-xs">
                              {func.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {func.code}
                        </code>
                      </TableCell>
                      <TableCell>
                        {func.category_id && (
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-white',
                              getCategoryBadgeColor(categories.find(c => c.id === func.category_id)?.code || '')
                            )}
                          >
                            {func.category_name_en || categories.find(c => c.id === func.category_id)?.name_en}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{func.user_count || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={func.active ?? false}
                            onCheckedChange={() => func.id && handleToggleActive(func.id, func.active ?? false)}
                          />
                          <span className="text-sm text-muted-foreground">
                            {func.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog
                          open={editingFunction?.id === func.id}
                          onOpenChange={(open) => !open && closeEditDialog()}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(func)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <form onSubmit={handleUpdate}>
                              <DialogHeader>
                                <DialogTitle>Edit System Function</DialogTitle>
                                <DialogDescription>
                                  Update function name and description (code cannot be changed)
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <Alert>
                                  <Shield className="h-4 w-4" />
                                  <AlertDescription className="text-xs">
                                    System function code: <code className="bg-muted px-1 py-0.5 rounded">{func.code}</code> (protected)
                                  </AlertDescription>
                                </Alert>
                                <div className="space-y-2">
                                  <Label htmlFor="edit-name">Name (English)</Label>
                                  <Input
                                    id="edit-name"
                                    value={formData.name}
                                    onChange={(e) =>
                                      setFormData({ ...formData, name: e.target.value })
                                    }
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="edit-name-de">Name (German)</Label>
                                  <Input
                                    id="edit-name-de"
                                    value={formData.name_de}
                                    onChange={(e) =>
                                      setFormData({ ...formData, name_de: e.target.value })
                                    }
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="edit-description">Description (English)</Label>
                                  <Textarea
                                    id="edit-description"
                                    value={formData.description}
                                    onChange={(e) =>
                                      setFormData({ ...formData, description: e.target.value })
                                    }
                                    rows={2}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="edit-description-de">Description (German)</Label>
                                  <Textarea
                                    id="edit-description-de"
                                    value={formData.description_de}
                                    onChange={(e) =>
                                      setFormData({ ...formData, description_de: e.target.value })
                                    }
                                    rows={2}
                                  />
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
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Custom Functions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Custom Functions</CardTitle>
              <CardDescription>
                Club-specific functions that you can create, edit, and delete
              </CardDescription>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Custom Function
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleCreate}>
                  <DialogHeader>
                    <DialogTitle>Create Custom Function</DialogTitle>
                    <DialogDescription>
                      Add a new function specific to your club
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name (English) *</Label>
                      <Input
                        id="name"
                        placeholder="e.g., Student Pilot, Ground Crew"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name-de">Name (German)</Label>
                      <Input
                        id="name-de"
                        placeholder="e.g., Flugschüler, Bodenpersonal"
                        value={formData.name_de}
                        onChange={(e) => setFormData({ ...formData, name_de: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name_en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description (English)</Label>
                      <Textarea
                        id="description"
                        placeholder="Brief description..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description-de">Description (German)</Label>
                      <Textarea
                        id="description-de"
                        placeholder="Kurze Beschreibung..."
                        value={formData.description_de}
                        onChange={(e) => setFormData({ ...formData, description_de: e.target.value })}
                        rows={2}
                      />
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
                      Create Function
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customFunctions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No custom functions yet. Click &quot;Add Custom Function&quot; to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  customFunctions.map((func) => (
                    <TableRow key={func.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{func.name}</div>
                          {func.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-md">
                              {func.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {func.category_id && (
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-white',
                              getCategoryBadgeColor(categories.find(c => c.id === func.category_id)?.code || '')
                            )}
                          >
                            {func.category_name_en || categories.find(c => c.id === func.category_id)?.name_en}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{func.user_count || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Dialog
                            open={editingFunction?.id === func.id}
                            onOpenChange={(open) => !open && closeEditDialog()}
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(func)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <form onSubmit={handleUpdate}>
                                <DialogHeader>
                                  <DialogTitle>Edit Custom Function</DialogTitle>
                                  <DialogDescription>
                                    Update custom function details
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="edit-name">Name (English)</Label>
                                    <Input
                                      id="edit-name"
                                      value={formData.name}
                                      onChange={(e) =>
                                        setFormData({ ...formData, name: e.target.value })
                                      }
                                      required
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="edit-name-de">Name (German)</Label>
                                    <Input
                                      id="edit-name-de"
                                      value={formData.name_de}
                                      onChange={(e) =>
                                        setFormData({ ...formData, name_de: e.target.value })
                                      }
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="edit-category">Category</Label>
                                    <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select category (optional)" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {categories.map((cat) => (
                                          <SelectItem key={cat.id} value={cat.id}>
                                            {cat.name_en}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="edit-description">Description (English)</Label>
                                    <Textarea
                                      id="edit-description"
                                      value={formData.description}
                                      onChange={(e) =>
                                        setFormData({ ...formData, description: e.target.value })
                                      }
                                      rows={2}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="edit-description-de">Description (German)</Label>
                                    <Textarea
                                      id="edit-description-de"
                                      value={formData.description_de}
                                      onChange={(e) =>
                                        setFormData({ ...formData, description_de: e.target.value })
                                      }
                                      rows={2}
                                    />
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
                                <AlertDialogTitle>Delete Custom Function</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete &quot;{func.name}&quot;?
                                  {func.user_count && func.user_count > 0 ? (
                                    <span className="block mt-2 text-destructive font-medium">
                                      Warning: This function is assigned to {func.user_count} user(s).
                                      Deleting will remove all assignments.
                                    </span>
                                  ) : (
                                    <span className="block mt-2">
                                      This action cannot be undone.
                                    </span>
                                  )}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => func.id && handleDelete(func.id)}
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
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
