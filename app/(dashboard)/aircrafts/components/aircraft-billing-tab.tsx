'use client'

import * as React from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import { Plus, Pencil, Trash2, Loader2, Settings2, Star, Split } from 'lucide-react'
import {
  createOperationType,
  updateOperationType,
  deleteOperationType,
  updateAircraftBillingConfig,
} from '@/lib/actions/operation-types'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { Plane, OperationType, CostCenter } from '@/lib/types'
import { Badge } from '@/components/ui/badge'

interface AircraftBillingTabProps {
  aircraft: Plane
  operationTypes: OperationType[]
  costCenters: CostCenter[]
}

interface OperationTypeSplit {
  id?: string
  target_type: 'cost_center' | 'pilot'
  cost_center_id: string | null
  cost_center_name?: string
  percentage: number
  sort_order: number
}

export function AircraftBillingTab({ aircraft, operationTypes, costCenters }: AircraftBillingTabProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingOperationType, setEditingOperationType] = useState<OperationType | null>(null)
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [splitsDialogOpen, setSplitsDialogOpen] = useState(false)
  const [selectedOperationType, setSelectedOperationType] = useState<OperationType | null>(null)
  const [splits, setSplits] = useState<OperationTypeSplit[]>([])
  const [loading, setLoading] = useState(false)
  const [splitError, setSplitError] = useState<string | null>(null)
  const [operationTypeSplits, setOperationTypeSplits] = useState<Record<string, OperationTypeSplit[]>>({})
  const router = useRouter()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rate: '',
    is_default: false,
    color: '#3b82f6',
    default_cost_center_id: undefined as string | undefined,
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
      default_cost_center_id: undefined,
    })
    setSplits([])
  }

  // Fetch splits for all operation types on mount
  React.useEffect(() => {
    const fetchAllSplits = async () => {
      const splitsMap: Record<string, OperationTypeSplit[]> = {}

      for (const opType of operationTypes) {
        try {
          const response = await fetch(`/api/operation-types/${opType.id}/splits`)
          if (response.ok) {
            const data = await response.json()
            splitsMap[opType.id] = data.splits || []
          }
        } catch (err) {
          console.error(`Error fetching splits for ${opType.id}:`, err)
        }
      }

      setOperationTypeSplits(splitsMap)
    }

    if (operationTypes.length > 0) {
      fetchAllSplits()
    }
  }, [operationTypes])

  const resetConfigData = () => {
    setConfigData({
      billing_unit: (aircraft.billing_unit as 'hour' | 'minute') || 'hour',
      default_rate: aircraft.default_rate?.toString() || '150.00',
    })
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate splits if any
    if (splits.length > 0) {
      const totalPercentage = splits.reduce((sum, split) => sum + split.percentage, 0)
      if (Math.abs(totalPercentage - 100) > 0.01) {
        toast.error(`Split percentages must sum to 100% (currently ${totalPercentage.toFixed(1)}%)`)
        return
      }

      for (const split of splits) {
        if (split.target_type === 'cost_center' && !split.cost_center_id) {
          toast.error('Please select a cost center for all cost center targets')
          return
        }
      }
    }

    setIsSubmitting(true)

    const result = await createOperationType({
      plane_id: aircraft.id,
      name: formData.name,
      description: formData.description || null,
      rate: parseFloat(formData.rate),
      is_default: formData.is_default,
      color: formData.color || null,
      default_cost_center_id: formData.default_cost_center_id || null,
    })

    if (result.success && result.data) {
      // Save splits if any
      if (splits.length > 0) {
        try {
          const response = await fetch(`/api/operation-types/${result.data.id}/splits`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ splits })
          })

          if (!response.ok) {
            toast.error('Operation type created but failed to save splits')
          }
        } catch (err) {
          console.error('Error saving splits:', err)
          toast.error('Operation type created but failed to save splits')
        }
      }

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

    // Validate splits if any
    if (splits.length > 0) {
      const totalPercentage = splits.reduce((sum, split) => sum + split.percentage, 0)
      if (Math.abs(totalPercentage - 100) > 0.01) {
        toast.error(`Split percentages must sum to 100% (currently ${totalPercentage.toFixed(1)}%)`)
        return
      }

      for (const split of splits) {
        if (split.target_type === 'cost_center' && !split.cost_center_id) {
          toast.error('Please select a cost center for all cost center targets')
          return
        }
      }
    }

    setIsSubmitting(true)

    const result = await updateOperationType(editingOperationType.id, {
      name: formData.name,
      description: formData.description || null,
      rate: parseFloat(formData.rate),
      is_default: formData.is_default,
      color: formData.color || null,
      default_cost_center_id: formData.default_cost_center_id || null,
    })

    if (result.success) {
      // Save splits
      try {
        const response = await fetch(`/api/operation-types/${editingOperationType.id}/splits`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ splits })
        })

        if (!response.ok) {
          toast.error('Operation type updated but failed to save splits')
        }
      } catch (err) {
        console.error('Error saving splits:', err)
        toast.error('Operation type updated but failed to save splits')
      }

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
      is_default: opType.is_default ?? false,
      color: opType.color || '#3b82f6',
      default_cost_center_id: opType.default_cost_center_id || undefined,
    })
    // Load splits for this operation type
    setSplits(operationTypeSplits[opType.id] || [])
  }

  const closeEditDialog = () => {
    setEditingOperationType(null)
    resetForm()
  }

  const openConfigDialog = () => {
    resetConfigData()
    setIsConfigOpen(true)
  }

  const handleConfigureSplits = async (opType: OperationType) => {
    setSelectedOperationType(opType)
    setSplitError(null)
    setLoading(true)

    try {
      const response = await fetch(`/api/operation-types/${opType.id}/splits`)
      if (response.ok) {
        const data = await response.json()
        setSplits(data.splits || [])
      } else {
        setSplits([])
      }
    } catch (err) {
      console.error('Error fetching splits:', err)
      setSplits([])
    } finally {
      setLoading(false)
      setSplitsDialogOpen(true)
    }
  }

  const addSplit = () => {
    const newSplit: OperationTypeSplit = {
      target_type: 'pilot',
      cost_center_id: null,
      percentage: 50,
      sort_order: splits.length
    }
    setSplits([...splits, newSplit])
  }

  const removeSplit = (index: number) => {
    setSplits(splits.filter((_, i) => i !== index))
  }

  const updateSplit = (index: number, updates: Partial<OperationTypeSplit>) => {
    setSplits(splits.map((split, i) => {
      if (i !== index) return split
      const updated = { ...split, ...updates }
      if (updates.target_type === 'pilot') {
        updated.cost_center_id = null
      }
      return updated
    }))
  }

  const handleSaveSplits = async () => {
    const totalPercentage = splits.reduce((sum, split) => sum + split.percentage, 0)

    if (splits.length > 0 && Math.abs(totalPercentage - 100) > 0.01) {
      setSplitError(`Split percentages must sum to 100% (currently ${totalPercentage.toFixed(1)}%)`)
      return
    }

    for (const split of splits) {
      if (split.target_type === 'cost_center' && !split.cost_center_id) {
        setSplitError('Please select a cost center for all cost center targets')
        return
      }
    }

    setSplitError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/operation-types/${selectedOperationType!.id}/splits`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ splits })
      })

      if (!response.ok) {
        const data = await response.json()
        setSplitError(data.error || 'Failed to save splits')
        setIsSubmitting(false)
        return
      }

      toast.success('Cost splitting configuration saved')
      setSplitsDialogOpen(false)
      router.refresh()
    } catch (err) {
      console.error('Error saving splits:', err)
      setSplitError('Failed to save splits')
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalPercentage = splits.reduce((sum, split) => sum + split.percentage, 0)

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
              <DialogContent className="max-h-[90vh] flex flex-col p-0">
                <form onSubmit={handleCreate} className="flex flex-col h-full max-h-[90vh]">
                  <DialogHeader className="px-6 pt-6 pb-4">
                    <DialogTitle>Create Operation Type</DialogTitle>
                    <DialogDescription>
                      Add a new operation type for {aircraft.tail_number}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 px-6 overflow-y-auto flex-1">
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
                    <div className="space-y-2">
                      <Label htmlFor="cost-center">Default Cost Center (Optional)</Label>
                      <Select
                        value={formData.default_cost_center_id || '__none__'}
                        onValueChange={(value) =>
                          setFormData({ ...formData, default_cost_center_id: value === '__none__' ? undefined : value })
                        }
                      >
                        <SelectTrigger id="cost-center">
                          <SelectValue placeholder="Charge to pilot (no cost center)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Charge to pilot (no cost center)</SelectItem>
                          {costCenters.map((cc) => (
                            <SelectItem key={cc.id} value={cc.id}>
                              {cc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground">
                        If set, flights with this operation type will be charged to the cost center instead of the pilot
                      </p>
                    </div>

                    {/* Cost Splitting Configuration */}
                    <div className="space-y-3 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <Label className="text-base">Cost Splitting (Optional)</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addSplit}
                          disabled={splits.length >= 5}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Split Target
                        </Button>
                      </div>

                      {splits.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No cost splitting configured. Add split targets to automatically split costs between pilot and cost centers.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {splits.map((split, index) => (
                            <div key={index} className="flex items-start gap-2 p-3 border rounded-lg">
                              <div className="flex-1 space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <Label className="text-xs">Target</Label>
                                    <Select
                                      value={split.target_type}
                                      onValueChange={(value) => updateSplit(index, { target_type: value as 'cost_center' | 'pilot' })}
                                    >
                                      <SelectTrigger className="h-8">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="pilot">Pilot</SelectItem>
                                        <SelectItem value="cost_center">Cost Center</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="space-y-1">
                                    <Label className="text-xs">Percentage</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.1"
                                      value={split.percentage}
                                      onChange={(e) => updateSplit(index, { percentage: parseFloat(e.target.value) || 0 })}
                                      className="h-8"
                                    />
                                  </div>
                                </div>

                                {split.target_type === 'cost_center' && (
                                  <div className="space-y-1">
                                    <Label className="text-xs">Cost Center</Label>
                                    <Select
                                      value={split.cost_center_id || ''}
                                      onValueChange={(value) => updateSplit(index, { cost_center_id: value })}
                                    >
                                      <SelectTrigger className="h-8">
                                        <SelectValue placeholder="Select..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {costCenters.map((cc) => (
                                          <SelectItem key={cc.id} value={cc.id}>
                                            {cc.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                              </div>

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeSplit(index)}
                                className="mt-5"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}

                          <div className="flex justify-end text-sm pt-2">
                            <span className="text-muted-foreground">Total:</span>{' '}
                            <span className={`ml-2 font-medium ${totalPercentage === 100 ? 'text-green-600' : 'text-red-600'}`}>
                              {totalPercentage.toFixed(1)}% {totalPercentage === 100 && '✓'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <DialogFooter className="px-6 py-4 border-t mt-0">
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
                  <TableHead>Cost Center</TableHead>
                  <TableHead>Cost Splitting</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operationTypes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No operation types defined for this aircraft
                    </TableCell>
                  </TableRow>
                ) : (
                  operationTypes.map((opType) => {
                    const hasSplits = operationTypeSplits[opType.id]?.length > 0
                    const splitsSummary = hasSplits
                      ? operationTypeSplits[opType.id].map(split =>
                          split.target_type === 'pilot'
                            ? `Pilot ${split.percentage}%`
                            : `${costCenters.find(cc => cc.id === split.cost_center_id)?.name || 'Unknown'} ${split.percentage}%`
                        ).join(', ')
                      : null

                    return (
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
                          {opType.default_cost_center_id ? (
                            <span className="text-sm">
                              {costCenters.find(cc => cc.id === opType.default_cost_center_id)?.name || 'Unknown'}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">Pilot</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {hasSplits ? (
                            <Badge variant="outline" className="gap-1" title={splitsSummary || ''}>
                              <Split className="h-3 w-3" />
                              {operationTypeSplits[opType.id].length} targets
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">None</span>
                          )}
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleConfigureSplits(opType)}
                            title="Configure cost splitting"
                          >
                            <Split className="h-4 w-4" />
                          </Button>
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
                            <DialogContent className="max-h-[90vh] flex flex-col p-0">
                              <form onSubmit={handleUpdate} className="flex flex-col h-full max-h-[90vh]">
                                <DialogHeader className="px-6 pt-6 pb-4">
                                  <DialogTitle>Edit Operation Type</DialogTitle>
                                  <DialogDescription>
                                    Update operation type details
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 px-6 overflow-y-auto flex-1">
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
                                  <div className="space-y-2">
                                    <Label htmlFor="edit-cost-center">Default Cost Center (Optional)</Label>
                                    <Select
                                      value={formData.default_cost_center_id || '__none__'}
                                      onValueChange={(value) =>
                                        setFormData({ ...formData, default_cost_center_id: value === '__none__' ? undefined : value })
                                      }
                                    >
                                      <SelectTrigger id="edit-cost-center">
                                        <SelectValue placeholder="Charge to pilot (no cost center)" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="__none__">Charge to pilot (no cost center)</SelectItem>
                                        {costCenters.map((cc) => (
                                          <SelectItem key={cc.id} value={cc.id}>
                                            {cc.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <p className="text-sm text-muted-foreground">
                                      If set, flights with this operation type will be charged to the cost center instead of the pilot
                                    </p>
                                  </div>

                                  {/* Cost Splitting Configuration */}
                                  <div className="space-y-3 pt-4 border-t">
                                    <div className="flex items-center justify-between">
                                      <Label className="text-base">Cost Splitting (Optional)</Label>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={addSplit}
                                        disabled={splits.length >= 5}
                                      >
                                        <Plus className="h-4 w-4 mr-1" />
                                        Add Split Target
                                      </Button>
                                    </div>

                                    {splits.length === 0 ? (
                                      <p className="text-sm text-muted-foreground">
                                        No cost splitting configured. Add split targets to automatically split costs between pilot and cost centers.
                                      </p>
                                    ) : (
                                      <div className="space-y-2">
                                        {splits.map((split, index) => (
                                          <div key={index} className="flex items-start gap-2 p-3 border rounded-lg">
                                            <div className="flex-1 space-y-3">
                                              <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                  <Label className="text-xs">Target</Label>
                                                  <Select
                                                    value={split.target_type}
                                                    onValueChange={(value) => updateSplit(index, { target_type: value as 'cost_center' | 'pilot' })}
                                                  >
                                                    <SelectTrigger className="h-8">
                                                      <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="pilot">Pilot</SelectItem>
                                                      <SelectItem value="cost_center">Cost Center</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                </div>

                                                <div className="space-y-1">
                                                  <Label className="text-xs">Percentage</Label>
                                                  <Input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="0.1"
                                                    value={split.percentage}
                                                    onChange={(e) => updateSplit(index, { percentage: parseFloat(e.target.value) || 0 })}
                                                    className="h-8"
                                                  />
                                                </div>
                                              </div>

                                              {split.target_type === 'cost_center' && (
                                                <div className="space-y-1">
                                                  <Label className="text-xs">Cost Center</Label>
                                                  <Select
                                                    value={split.cost_center_id || ''}
                                                    onValueChange={(value) => updateSplit(index, { cost_center_id: value })}
                                                  >
                                                    <SelectTrigger className="h-8">
                                                      <SelectValue placeholder="Select..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      {costCenters.map((cc) => (
                                                        <SelectItem key={cc.id} value={cc.id}>
                                                          {cc.name}
                                                        </SelectItem>
                                                      ))}
                                                    </SelectContent>
                                                  </Select>
                                                </div>
                                              )}
                                            </div>

                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => removeSplit(index)}
                                              className="mt-5"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        ))}

                                        <div className="flex justify-end text-sm pt-2">
                                          <span className="text-muted-foreground">Total:</span>{' '}
                                          <span className={`ml-2 font-medium ${totalPercentage === 100 ? 'text-green-600' : 'text-red-600'}`}>
                                            {totalPercentage.toFixed(1)}% {totalPercentage === 100 && '✓'}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <DialogFooter className="px-6 py-4 border-t mt-0">
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
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Configure Splits Dialog */}
      <Dialog open={splitsDialogOpen} onOpenChange={setSplitsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure Cost Splitting for {selectedOperationType?.name}</DialogTitle>
            <DialogDescription>
              Define how flight costs should be split by default. Percentages must sum to 100%.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {splits.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No splits configured. Click "Add Split Target" to start configuring cost splitting.
                    Leave empty to use the default cost center or charge directly to the pilot.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  {splits.map((split, index) => (
                    <div key={index} className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">Target {index + 1}</span>
                        {splits.length > 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeSplit(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Target Type</Label>
                          <Select
                            value={split.target_type}
                            onValueChange={(value) => updateSplit(index, { target_type: value as 'cost_center' | 'pilot' })}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pilot">Pilot</SelectItem>
                              <SelectItem value="cost_center">Cost Center</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-xs">Percentage</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={split.percentage}
                            onChange={(e) => updateSplit(index, { percentage: parseFloat(e.target.value) || 0 })}
                            className="h-9"
                          />
                        </div>
                      </div>

                      {split.target_type === 'cost_center' && (
                        <div>
                          <Label className="text-xs">Cost Center</Label>
                          <Select
                            value={split.cost_center_id || ''}
                            onValueChange={(value) => updateSplit(index, { cost_center_id: value })}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Select cost center..." />
                            </SelectTrigger>
                            <SelectContent>
                              {costCenters.map((cc) => (
                                <SelectItem key={cc.id} value={cc.id}>
                                  {cc.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {split.target_type === 'pilot' && (
                        <div className="text-xs text-muted-foreground">
                          This portion will be charged to the flight's pilot
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSplit}
                  disabled={splits.length >= 5}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Split Target
                </Button>

                {splits.length > 0 && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Total:</span>{' '}
                    <span className={totalPercentage === 100 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      {totalPercentage.toFixed(1)}%
                    </span>
                    {totalPercentage === 100 && <span className="text-green-600 ml-1">✓</span>}
                  </div>
                )}
              </div>

              {splitError && (
                <Alert variant="destructive">
                  <AlertDescription>{splitError}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSplitsDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSaveSplits} disabled={isSubmitting || loading}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
