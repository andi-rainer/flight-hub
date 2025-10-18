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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Pencil, Trash2, Loader2, Settings2, Star } from 'lucide-react'
import {
  createOperationType,
  updateOperationType,
  deleteOperationType,
  updateAircraftBillingConfig,
} from '@/lib/actions/operation-types'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { Plane, OperationType } from '@/lib/database.types'
import { Badge } from '@/components/ui/badge'

interface AircraftBillingTabProps {
  aircraft: Plane
  operationTypes: OperationType[]
}

export function AircraftBillingTab({ aircraft, operationTypes }: AircraftBillingTabProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingOperationType, setEditingOperationType] = useState<OperationType | null>(null)
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rate: '',
    is_default: false,
    color: '#3b82f6',
  })

  const [configData, setConfigData] = useState({
    billing_unit: 'hour' as 'hour' | 'minute',
    default_rate: '150.00',
  })

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      rate: '',
      is_default: false,
      color: '#3b82f6',
    })
  }

  const resetConfigData = () => {
    setConfigData({
      billing_unit: aircraft.billing_unit || 'hour',
      default_rate: aircraft.default_rate?.toString() || '150.00',
    })
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()

    setIsSubmitting(true)

    const result = await createOperationType({
      plane_id: aircraft.id,
      name: formData.name,
      description: formData.description || null,
      rate: parseFloat(formData.rate),
      is_default: formData.is_default,
      color: formData.color || null,
    })

    if (result.success) {
      toast.success('Operation type created successfully')
      setIsCreateOpen(false)
      resetForm()
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to create operation type')
    }

    setIsSubmitting(false)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingOperationType) return

    setIsSubmitting(true)

    const result = await updateOperationType(editingOperationType.id, {
      name: formData.name,
      description: formData.description || null,
      rate: parseFloat(formData.rate),
      is_default: formData.is_default,
      color: formData.color || null,
    })

    if (result.success) {
      toast.success('Operation type updated successfully')
      setEditingOperationType(null)
      resetForm()
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to update operation type')
    }

    setIsSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    const result = await deleteOperationType(id)

    if (result.success) {
      toast.success('Operation type deleted successfully')
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to delete operation type')
    }
  }

  const handleConfigUpdate = async (e: React.FormEvent) => {
    e.preventDefault()

    setIsSubmitting(true)

    const result = await updateAircraftBillingConfig(aircraft.id, {
      billing_unit: configData.billing_unit,
      default_rate: parseFloat(configData.default_rate),
    })

    if (result.success) {
      toast.success('Billing configuration updated successfully')
      setIsConfigOpen(false)
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to update billing configuration')
    }

    setIsSubmitting(false)
  }

  const openEditDialog = (opType: OperationType) => {
    setEditingOperationType(opType)
    setFormData({
      name: opType.name,
      description: opType.description || '',
      rate: opType.rate.toString(),
      is_default: opType.is_default,
      color: opType.color || '#3b82f6',
    })
  }

  const closeEditDialog = () => {
    setEditingOperationType(null)
    resetForm()
  }

  const openConfigDialog = () => {
    resetConfigData()
    setIsConfigOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Billing Configuration Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Billing Configuration</CardTitle>
              <CardDescription>
                Configure billing settings for {aircraft.tail_number}
              </CardDescription>
            </div>
            <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={openConfigDialog}>
                  <Settings2 className="h-4 w-4 mr-2" />
                  Edit Settings
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleConfigUpdate}>
                  <DialogHeader>
                    <DialogTitle>Billing Configuration</DialogTitle>
                    <DialogDescription>
                      Configure billing settings for {aircraft.tail_number}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="billing-unit">Billing Unit</Label>
                      <Select
                        value={configData.billing_unit}
                        onValueChange={(value: 'hour' | 'minute') =>
                          setConfigData({ ...configData, billing_unit: value })
                        }
                      >
                        <SelectTrigger id="billing-unit">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hour">Per Hour</SelectItem>
                          <SelectItem value="minute">Per Minute</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="default-rate">Default Rate (EUR)</Label>
                      <Input
                        id="default-rate"
                        type="number"
                        step="0.01"
                        min="0"
                        value={configData.default_rate}
                        onChange={(e) =>
                          setConfigData({ ...configData, default_rate: e.target.value })
                        }
                        required
                      />
                      <p className="text-sm text-muted-foreground">
                        Default rate per {configData.billing_unit}
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsConfigOpen(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Save Configuration
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Billing Unit</p>
                <p className="text-lg font-semibold capitalize">{aircraft.billing_unit}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Default Rate</p>
                <p className="text-lg font-semibold">
                  EUR {aircraft.default_rate?.toFixed(2) || '150.00'} / {aircraft.billing_unit}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Operation Types Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Operation Types</CardTitle>
              <CardDescription>
                Define different operation types with custom rates for this aircraft
              </CardDescription>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => resetForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Operation Type
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleCreate}>
                  <DialogHeader>
                    <DialogTitle>Create Operation Type</DialogTitle>
                    <DialogDescription>
                      Add a new operation type for {aircraft.tail_number}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Operation Name</Label>
                      <Input
                        id="name"
                        placeholder="e.g., Normal, Skydive Ops, Aerobatic"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rate">Rate (EUR)</Label>
                      <Input
                        id="rate"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="150.00"
                        value={formData.rate}
                        onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                        required
                      />
                      <p className="text-sm text-muted-foreground">
                        Rate per {aircraft.billing_unit}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description (Optional)</Label>
                      <Textarea
                        id="description"
                        placeholder="Brief description of this operation type..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="color">Color (Optional)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="color"
                          type="color"
                          value={formData.color}
                          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                          className="w-20 h-10"
                        />
                        <Input
                          type="text"
                          value={formData.color}
                          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                          placeholder="#3b82f6"
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is-default"
                        checked={formData.is_default}
                        onChange={(e) =>
                          setFormData({ ...formData, is_default: e.target.checked })
                        }
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="is-default" className="font-normal">
                        Set as default operation type
                      </Label>
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
                      Create Operation Type
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
                  <TableHead>Description</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operationTypes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No operation types defined for this aircraft
                    </TableCell>
                  </TableRow>
                ) : (
                  operationTypes.map((opType) => (
                    <TableRow key={opType.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {opType.color && (
                            <div
                              className="h-4 w-4 rounded-full border"
                              style={{ backgroundColor: opType.color }}
                            />
                          )}
                          {opType.name}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {opType.description || '-'}
                      </TableCell>
                      <TableCell>
                        EUR {opType.rate.toFixed(2)}/{aircraft.billing_unit}
                      </TableCell>
                      <TableCell>
                        {opType.is_default && (
                          <Badge variant="secondary" className="gap-1">
                            <Star className="h-3 w-3 fill-current" />
                            Default
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Dialog
                            open={editingOperationType?.id === opType.id}
                            onOpenChange={(open) => !open && closeEditDialog()}
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(opType)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <form onSubmit={handleUpdate}>
                                <DialogHeader>
                                  <DialogTitle>Edit Operation Type</DialogTitle>
                                  <DialogDescription>
                                    Update operation type details
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="edit-name">Operation Name</Label>
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
                                    <Label htmlFor="edit-rate">Rate (EUR)</Label>
                                    <Input
                                      id="edit-rate"
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={formData.rate}
                                      onChange={(e) =>
                                        setFormData({ ...formData, rate: e.target.value })
                                      }
                                      required
                                    />
                                    <p className="text-sm text-muted-foreground">
                                      Rate per {aircraft.billing_unit}
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
                                  <div className="space-y-2">
                                    <Label htmlFor="edit-color">Color</Label>
                                    <div className="flex items-center gap-2">
                                      <Input
                                        id="edit-color"
                                        type="color"
                                        value={formData.color}
                                        onChange={(e) =>
                                          setFormData({ ...formData, color: e.target.value })
                                        }
                                        className="w-20 h-10"
                                      />
                                      <Input
                                        type="text"
                                        value={formData.color}
                                        onChange={(e) =>
                                          setFormData({ ...formData, color: e.target.value })
                                        }
                                        className="flex-1"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      id="edit-is-default"
                                      checked={formData.is_default}
                                      onChange={(e) =>
                                        setFormData({ ...formData, is_default: e.target.checked })
                                      }
                                      className="h-4 w-4 rounded border-gray-300"
                                    />
                                    <Label htmlFor="edit-is-default" className="font-normal">
                                      Set as default operation type
                                    </Label>
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
                                <AlertDialogTitle>Delete Operation Type</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete &quot;{opType.name}&quot;? This action
                                  cannot be undone. Operation types used in flight logs cannot be deleted.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(opType.id)}
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
