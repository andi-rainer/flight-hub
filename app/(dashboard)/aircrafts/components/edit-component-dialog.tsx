'use client'

import { useState, useTransition, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle } from 'lucide-react'
import { updateComponent } from '@/lib/actions/aircraft-components'
import { toast } from 'sonner'
import type { ComponentWithStatus } from './component-status-card'

interface EditComponentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  component: ComponentWithStatus
}

export function EditComponentDialog({
  open,
  onOpenChange,
  onSuccess,
  component,
}: EditComponentDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Form fields
  const [position, setPosition] = useState(component.position || '')
  const [serialNumber, setSerialNumber] = useState(component.serial_number || '')
  const [manufacturer, setManufacturer] = useState(component.manufacturer || '')
  const [model, setModel] = useState(component.model || '')
  const [partNumber, setPartNumber] = useState('')
  const [tboHours, setTboHours] = useState(component.tbo_hours?.toString() || '')
  const [currentHours, setCurrentHours] = useState(component.component_current_hours?.toString() || '0')
  const [notes, setNotes] = useState('')

  // Reset form when component or dialog state changes
  useEffect(() => {
    if (open && component) {
      setPosition(component.position || '')
      setSerialNumber(component.serial_number || '')
      setManufacturer(component.manufacturer || '')
      setModel(component.model || '')
      setTboHours(component.tbo_hours?.toString() || '')
      setCurrentHours(component.component_current_hours?.toString() || '0')
      setError(null)
    }
  }, [open, component])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (tboHours && (parseFloat(tboHours) <= 0)) {
      setError('TBO hours must be greater than 0')
      return
    }

    if (currentHours && parseFloat(currentHours) < 0) {
      setError('Current hours cannot be negative')
      return
    }

    // Calculate component_hours_offset needed to achieve desired current hours
    // Formula: component_current_hours = (aircraft_current_hours - hours_at_installation) + component_hours_offset
    // Therefore: component_hours_offset = desired_current_hours - (aircraft_current_hours - hours_at_installation)
    let componentHoursOffset: number | undefined = undefined
    if (currentHours && component.aircraft_current_hours !== null && component.hours_at_installation !== null) {
      const desiredHours = parseFloat(currentHours)
      const calculatedHours = component.aircraft_current_hours - component.hours_at_installation
      componentHoursOffset = desiredHours - calculatedHours
    }

    startTransition(async () => {
      const result = await updateComponent(component.id, {
        position: position || null,
        serialNumber: serialNumber || null,
        manufacturer: manufacturer || null,
        model: model || null,
        tboHours: tboHours ? parseFloat(tboHours) : undefined,
        componentHoursOffset: componentHoursOffset,
        notes: notes || null,
      })

      if (result.success) {
        toast.success('Component updated successfully')
        onOpenChange(false)
        onSuccess?.()
      } else {
        setError(result.error || 'Failed to update component')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Component</DialogTitle>
          <DialogDescription>
            Update details for this {component.component_type}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Position */}
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="e.g., Left, Right, 1, 2"
              />
            </div>

            {/* Serial Number */}
            <div className="space-y-2">
              <Label htmlFor="serialNumber">Serial Number</Label>
              <Input
                id="serialNumber"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="Component S/N"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Manufacturer */}
            <div className="space-y-2">
              <Label htmlFor="manufacturer">Manufacturer</Label>
              <Input
                id="manufacturer"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="e.g., Lycoming"
              />
            </div>

            {/* Model */}
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g., O-360"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* TBO Hours */}
            <div className="space-y-2">
              <Label htmlFor="tboHours">TBO Hours</Label>
              <Input
                id="tboHours"
                type="number"
                step="0.1"
                min="0"
                value={tboHours}
                onChange={(e) => setTboHours(e.target.value)}
                placeholder="e.g., 2000"
              />
              <p className="text-xs text-muted-foreground">
                Time Between Overhaul in hours.
              </p>
            </div>

            {/* Current Hours */}
            <div className="space-y-2">
              <Label htmlFor="currentHours">Component Current Hours</Label>
              <Input
                id="currentHours"
                type="number"
                step="0.1"
                min="0"
                value={currentHours}
                onChange={(e) => setCurrentHours(e.target.value)}
                placeholder="e.g., 1500"
              />
              <p className="text-xs text-muted-foreground">
                Adjust component hours if needed.
              </p>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Update Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for update..."
              rows={3}
            />
          </div>

          {/* Current Status Display */}
          <div className="rounded-lg border p-4 bg-muted/50 space-y-2">
            <p className="text-sm font-medium">Current Status</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Current Hours:</span>
                <span className="ml-2 font-medium">{component.component_current_hours?.toFixed(1)}h</span>
              </div>
              <div>
                <span className="text-muted-foreground">Hours Remaining:</span>
                <span className="ml-2 font-medium">{component.hours_remaining?.toFixed(1)}h</span>
              </div>
              <div>
                <span className="text-muted-foreground">Percentage Used:</span>
                <span className="ml-2 font-medium">{component.percentage_used?.toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <span className="ml-2 font-medium capitalize">{component.tbo_status}</span>
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Component
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
