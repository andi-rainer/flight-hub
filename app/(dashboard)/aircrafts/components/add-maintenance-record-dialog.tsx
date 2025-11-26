'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Loader2, Wrench } from 'lucide-react'
import { createMaintenanceRecord } from '../maintenance-actions'
import { getActiveAircraftComponents, overhaulComponent, updateComponent } from '@/lib/actions/aircraft-components'
import type { ComponentWithStatus } from '@/lib/database.types'

interface AddMaintenanceRecordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  aircraftId: string
  currentHours: number
  defaultInterval: number
}

export function AddMaintenanceRecordDialog({
  open,
  onOpenChange,
  aircraftId,
  currentHours,
  defaultInterval,
}: AddMaintenanceRecordDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [performedAt, setPerformedAt] = useState('')
  const [performedAtHours, setPerformedAtHours] = useState('')
  const [maintenanceType, setMaintenanceType] = useState('')
  const [description, setDescription] = useState('')
  const [nextDueHours, setNextDueHours] = useState('')
  const [cost, setCost] = useState('')
  const [vendor, setVendor] = useState('')
  const [notes, setNotes] = useState('')
  const [tachHours, setTachHours] = useState('')
  const [hobbsHours, setHobbsHours] = useState('')

  // Component-related state
  const [components, setComponents] = useState<ComponentWithStatus[]>([])
  const [selectedComponentId, setSelectedComponentId] = useState<string>('none')
  const [componentAction, setComponentAction] = useState<'none' | 'overhaul' | 'tbo_update'>('none')
  const [newTboHours, setNewTboHours] = useState('')

  // Load components when dialog opens
  useEffect(() => {
    if (open) {
      loadComponents()
    }
  }, [open, aircraftId])

  async function loadComponents() {
    const result = await getActiveAircraftComponents(aircraftId)
    if (result.success && result.data) {
      setComponents(result.data)
    }
  }

  // Reset form when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Set defaults
      setPerformedAt(new Date().toISOString().split('T')[0])
      setPerformedAtHours(currentHours.toFixed(1))
      setMaintenanceType('')
      setDescription('')
      // Calculate next due based on current hours + interval
      setNextDueHours((currentHours + defaultInterval).toFixed(1))
      setCost('')
      setVendor('')
      setNotes('')
      setTachHours('')
      setHobbsHours('')
      // Reset component fields
      setSelectedComponentId('none')
      setComponentAction('none')
      setNewTboHours('')
    }
    onOpenChange(newOpen)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!performedAt || !performedAtHours || !maintenanceType) {
      toast.error('Please fill in all required fields')
      return
    }

    // Validate component action if selected
    if (componentAction !== 'none' && selectedComponentId === 'none') {
      toast.error('Please select a component when choosing an action')
      return
    }

    if (selectedComponentId !== 'none' && componentAction !== 'none') {
      if (componentAction === 'tbo_update' && (!newTboHours || parseFloat(newTboHours) <= 0)) {
        toast.error('Please enter a valid TBO hours value')
        return
      }
    }

    setLoading(true)

    // Create maintenance record
    const result = await createMaintenanceRecord({
      plane_id: aircraftId,
      performed_at: new Date(performedAt).toISOString(),
      performed_at_hours: parseFloat(performedAtHours),
      maintenance_type: maintenanceType,
      description: description || null,
      next_due_hours: nextDueHours ? parseFloat(nextDueHours) : null,
      cost: cost ? parseFloat(cost) : null,
      vendor: vendor || null,
      notes: notes || null,
      tach_hours: tachHours ? parseFloat(tachHours) : null,
      hobbs_hours: hobbsHours ? parseFloat(hobbsHours) : null,
    })

    if (result.error) {
      setLoading(false)
      toast.error(result.error)
      return
    }

    // Handle component action if selected
    if (selectedComponentId !== 'none' && componentAction !== 'none') {
      let componentResult

      if (componentAction === 'overhaul') {
        componentResult = await overhaulComponent(selectedComponentId, {
          overhaulDate: new Date(performedAt).toISOString(),
          aircraftHoursAtOverhaul: parseFloat(performedAtHours),
          notes: `Overhauled during ${maintenanceType}`,
        })
      } else if (componentAction === 'tbo_update') {
        componentResult = await updateComponent(selectedComponentId, {
          tboHours: parseFloat(newTboHours),
          notes: `TBO updated during ${maintenanceType}`,
        })
      }

      if (componentResult && !componentResult.success) {
        toast.error(`Component action failed: ${componentResult.error}`)
        // Don't stop - MX record was created successfully
      }
    }

    setLoading(false)
    toast.success('Maintenance record created successfully')
    router.refresh()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Maintenance</DialogTitle>
          <DialogDescription>
            Add a new maintenance record for this aircraft
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Performed At Date */}
          <div className="space-y-2">
            <Label htmlFor="performed-at">
              Performed Date *
            </Label>
            <Input
              id="performed-at"
              type="date"
              value={performedAt}
              onChange={(e) => setPerformedAt(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {/* Performed At Hours */}
          <div className="space-y-2">
            <Label htmlFor="performed-at-hours">
              Aircraft Hours at Maintenance *
            </Label>
            <Input
              id="performed-at-hours"
              type="number"
              step="0.1"
              value={performedAtHours}
              onChange={(e) => setPerformedAtHours(e.target.value)}
              required
              disabled={loading}
              placeholder="0.0"
            />
            <p className="text-xs text-muted-foreground">
              Current aircraft hours: {currentHours.toFixed(1)}
            </p>
          </div>

          {/* Maintenance Type */}
          <div className="space-y-2">
            <Label htmlFor="maintenance-type">
              Maintenance Type *
            </Label>
            <Input
              id="maintenance-type"
              type="text"
              value={maintenanceType}
              onChange={(e) => setMaintenanceType(e.target.value)}
              required
              disabled={loading}
              placeholder="e.g., 50h Check, 100h Inspection, Annual"
            />
            <p className="text-xs text-muted-foreground">
              Examples: 50h Check, 100h Check, Annual Inspection, AD Compliance
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              placeholder="Brief description of work performed"
              rows={3}
            />
          </div>

          {/* Next Due Hours */}
          <div className="space-y-2">
            <Label htmlFor="next-due-hours">
              Next Maintenance Due (Aircraft Hours)
            </Label>
            <Input
              id="next-due-hours"
              type="number"
              step="0.1"
              value={nextDueHours}
              onChange={(e) => setNextDueHours(e.target.value)}
              disabled={loading}
              placeholder="0.0"
            />
            <p className="text-xs text-muted-foreground">
              This will update the aircraft&apos;s maintenance schedule
            </p>
          </div>

          {/* Cost */}
          <div className="space-y-2">
            <Label htmlFor="cost">
              Cost (€)
            </Label>
            <Input
              id="cost"
              type="number"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              disabled={loading}
              placeholder="0.00"
            />
          </div>

          {/* Vendor */}
          <div className="space-y-2">
            <Label htmlFor="vendor">
              Vendor/Workshop
            </Label>
            <Input
              id="vendor"
              type="text"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              disabled={loading}
              placeholder="Workshop or maintenance provider"
            />
          </div>

          {/* TACH and HOBBS Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tach-hours">
                TACH Hours (optional)
              </Label>
              <Input
                id="tach-hours"
                type="number"
                step="0.1"
                value={tachHours}
                onChange={(e) => setTachHours(e.target.value)}
                disabled={loading}
                placeholder="0.0"
              />
              <p className="text-xs text-muted-foreground">
                TACH meter reading at time of maintenance
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hobbs-hours">
                HOBBS Hours (optional)
              </Label>
              <Input
                id="hobbs-hours"
                type="number"
                step="0.1"
                value={hobbsHours}
                onChange={(e) => setHobbsHours(e.target.value)}
                disabled={loading}
                placeholder="0.0"
              />
              <p className="text-xs text-muted-foreground">
                HOBBS meter reading at time of maintenance
              </p>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              Internal Notes
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
              placeholder="Additional notes for board members"
              rows={2}
            />
          </div>

          {/* Component Actions Section */}
          {components.length > 0 && (
            <>
              <Separator className="my-4" />

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold">Component Actions (Optional)</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Link this maintenance to a component action (overhaul, TBO update, etc.)
                </p>

                {/* Component Selector */}
                <div className="space-y-2">
                  <Label htmlFor="component">Select Component</Label>
                  <Select value={selectedComponentId} onValueChange={setSelectedComponentId}>
                    <SelectTrigger id="component" disabled={loading}>
                      <SelectValue placeholder="No component selected" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {components.map((comp) => (
                        <SelectItem key={comp.id} value={comp.id ?? ''}>
                          {comp.component_type} {comp.position && `(${comp.position})`}
                          {comp.manufacturer && ` - ${comp.manufacturer}`}
                          {comp.model && ` ${comp.model}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Action Selector */}
                {selectedComponentId !== 'none' && (
                  <div className="space-y-2">
                    <Label htmlFor="component-action">Action</Label>
                    <Select value={componentAction} onValueChange={(val) => setComponentAction(val as 'none' | 'overhaul' | 'tbo_update')}>
                      <SelectTrigger id="component-action" disabled={loading}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No action</SelectItem>
                        <SelectItem value="overhaul">Component Overhaul (reset hours)</SelectItem>
                        <SelectItem value="tbo_update">Update TBO Hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* TBO Update Field */}
                {selectedComponentId !== 'none' && componentAction === 'tbo_update' && (
                  <div className="space-y-2">
                    <Label htmlFor="new-tbo">New TBO Hours</Label>
                    <Input
                      id="new-tbo"
                      type="number"
                      step="0.1"
                      value={newTboHours}
                      onChange={(e) => setNewTboHours(e.target.value)}
                      disabled={loading}
                      placeholder="e.g., 2400"
                    />
                    <p className="text-xs text-muted-foreground">
                      Update the Time Between Overhaul for this component
                    </p>
                  </div>
                )}

                {/* Overhaul Info */}
                {selectedComponentId !== 'none' && componentAction === 'overhaul' && (
                  <div className="rounded-lg border p-3 bg-blue-50 dark:bg-blue-950">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      <strong>Note:</strong> This will create a new component record with hours reset to zero,
                      and mark the current component as overhauled.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Record'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
