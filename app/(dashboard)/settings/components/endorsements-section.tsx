'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import type { Endorsement } from '@/lib/database.types'

export function EndorsementsSection() {
  const [endorsements, setEndorsements] = useState<Endorsement[]>([])
  const [loading, setLoading] = useState(true)
  const [showInactive, setShowInactive] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedEndorsement, setSelectedEndorsement] = useState<Endorsement | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    name_de: '',
    description: '',
    supports_ir: false,
  })

  useEffect(() => {
    loadEndorsements()
  }, [showInactive])

  const loadEndorsements = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/endorsements?includeInactive=${showInactive}`)
      const data = await response.json()

      if (response.ok) {
        setEndorsements(data.endorsements || [])
      } else {
        toast.error('Failed to load endorsements')
      }
    } catch (error) {
      console.error('Error loading endorsements:', error)
      toast.error('Failed to load endorsements')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      name_de: '',
      description: '',
      supports_ir: false,
    })
  }

  const openEditDialog = (endorsement: Endorsement) => {
    setSelectedEndorsement(endorsement)
    setFormData({
      code: endorsement.code,
      name: endorsement.name,
      name_de: endorsement.name_de || '',
      description: endorsement.description || '',
      supports_ir: endorsement.supports_ir,
    })
    setEditDialogOpen(true)
  }

  const handleCreate = async () => {
    if (!formData.code || !formData.name) {
      toast.error('Code and name are required')
      return
    }

    try {
      const response = await fetch('/api/endorsements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Endorsement created successfully')
        setCreateDialogOpen(false)
        resetForm()
        loadEndorsements()
      } else {
        toast.error(data.error || 'Failed to create endorsement')
      }
    } catch (error) {
      console.error('Error creating endorsement:', error)
      toast.error('Failed to create endorsement')
    }
  }

  const handleUpdate = async () => {
    if (!selectedEndorsement) return

    if (!formData.code || !formData.name) {
      toast.error('Code and name are required')
      return
    }

    try {
      const response = await fetch(`/api/endorsements/${selectedEndorsement.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Endorsement updated successfully')
        setEditDialogOpen(false)
        setSelectedEndorsement(null)
        resetForm()
        loadEndorsements()
      } else {
        toast.error(data.error || 'Failed to update endorsement')
      }
    } catch (error) {
      console.error('Error updating endorsement:', error)
      toast.error('Failed to update endorsement')
    }
  }

  const handleToggleActive = async (endorsement: Endorsement) => {
    try {
      const response = await fetch(`/api/endorsements/${endorsement.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !endorsement.active }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(
          endorsement.active ? 'Endorsement deactivated' : 'Endorsement activated'
        )
        loadEndorsements()
      } else {
        toast.error(data.error || 'Failed to toggle endorsement status')
      }
    } catch (error) {
      console.error('Error toggling endorsement:', error)
      toast.error('Failed to toggle endorsement status')
    }
  }

  const handleDelete = async (endorsement: Endorsement) => {
    try {
      const response = await fetch(`/api/endorsements/${endorsement.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Endorsement deleted successfully')
        loadEndorsements()
      } else {
        toast.error(data.error || 'Failed to delete endorsement')
      }
    } catch (error) {
      console.error('Error deleting endorsement:', error)
      toast.error('Failed to delete endorsement')
    }
  }

  // Separate endorsements into predefined and custom
  const predefinedEndorsements = endorsements.filter((e) => e.is_predefined)
  const customEndorsements = endorsements.filter((e) => !e.is_predefined)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Endorsements & Ratings</CardTitle>
            <CardDescription>
              Centrally manage endorsements and ratings that can be linked to documents
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInactive(!showInactive)}
            >
              {showInactive ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
              {showInactive ? 'Hide Inactive' : 'Show Inactive'}
            </Button>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Custom Endorsement
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Custom Endorsement</DialogTitle>
                  <DialogDescription>
                    Add a custom endorsement/rating for your club
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="create-code">Code *</Label>
                    <Input
                      id="create-code"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value.toUpperCase() })
                      }
                      placeholder="e.g., CUSTOM"
                      maxLength={20}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-name">Name *</Label>
                    <Input
                      id="create-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Custom Rating"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-name-de">German Name</Label>
                    <Input
                      id="create-name-de"
                      value={formData.name_de}
                      onChange={(e) => setFormData({ ...formData, name_de: e.target.value })}
                      placeholder="e.g., Benutzerdefinierte Berechtigung"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-description">Description</Label>
                    <Textarea
                      id="create-description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Optional description"
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="create-supports-ir"
                      checked={formData.supports_ir}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, supports_ir: !!checked })
                      }
                    />
                    <Label htmlFor="create-supports-ir" className="text-sm font-normal cursor-pointer">
                      Can have IR (Instrument Rating) privileges
                    </Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate}>Create</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-6">
            {/* Predefined Endorsements */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">
                System Endorsements ({predefinedEndorsements.length})
              </h3>
              <div className="space-y-2">
                {predefinedEndorsements.map((endorsement) => (
                  <div
                    key={endorsement.id}
                    className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{endorsement.code}</Badge>
                        <span className="font-medium">{endorsement.name}</span>
                        {!endorsement.active && (
                          <Badge variant="outline" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                        {endorsement.supports_ir && (
                          <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                            IR Capable
                          </Badge>
                        )}
                      </div>
                      {endorsement.name_de && (
                        <div className="text-sm text-muted-foreground">
                          {endorsement.name_de}
                        </div>
                      )}
                      {endorsement.description && (
                        <div className="text-xs text-muted-foreground">
                          {endorsement.description}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(endorsement)}
                      >
                        {endorsement.active ? (
                          <>
                            <EyeOff className="h-4 w-4 mr-1" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-1" />
                            Activate
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Endorsements */}
            {customEndorsements.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  Custom Endorsements ({customEndorsements.length})
                </h3>
                <div className="space-y-2">
                  {customEndorsements.map((endorsement) => (
                    <div
                      key={endorsement.id}
                      className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge>{endorsement.code}</Badge>
                          <span className="font-medium">{endorsement.name}</span>
                          {!endorsement.active && (
                            <Badge variant="outline" className="text-xs">
                              Inactive
                            </Badge>
                          )}
                          {endorsement.supports_ir && (
                            <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                              IR Capable
                            </Badge>
                          )}
                        </div>
                        {endorsement.name_de && (
                          <div className="text-sm text-muted-foreground">
                            {endorsement.name_de}
                          </div>
                        )}
                        {endorsement.description && (
                          <div className="text-xs text-muted-foreground">
                            {endorsement.description}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(endorsement)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Endorsement?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will deactivate the endorsement "{endorsement.code}".
                                It will no longer appear in selection lists but will be
                                preserved for historical data.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(endorsement)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {endorsements.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No endorsements found
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Endorsement</DialogTitle>
            <DialogDescription>
              Modify the custom endorsement details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-code">Code *</Label>
              <Input
                id="edit-code"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value.toUpperCase() })
                }
                placeholder="e.g., CUSTOM"
                maxLength={20}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Custom Rating"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name-de">German Name</Label>
              <Input
                id="edit-name-de"
                value={formData.name_de}
                onChange={(e) => setFormData({ ...formData, name_de: e.target.value })}
                placeholder="e.g., Benutzerdefinierte Berechtigung"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Optional description"
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-supports-ir"
                checked={formData.supports_ir}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, supports_ir: !!checked })
                }
              />
              <Label htmlFor="edit-supports-ir" className="text-sm font-normal cursor-pointer">
                Can have IR (Instrument Rating) privileges
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false)
                setSelectedEndorsement(null)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdate}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
