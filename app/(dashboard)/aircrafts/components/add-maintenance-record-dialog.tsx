'use client'

import { useState } from 'react'
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
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { createMaintenanceRecord } from '../maintenance-actions'

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
    }
    onOpenChange(newOpen)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!performedAt || !performedAtHours || !maintenanceType) {
      toast.error('Please fill in all required fields')
      return
    }

    setLoading(true)

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
    })

    setLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Maintenance record created successfully')
      router.refresh()
      onOpenChange(false)
    }
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
              This will update the aircraft's maintenance schedule
            </p>
          </div>

          {/* Cost */}
          <div className="space-y-2">
            <Label htmlFor="cost">
              Cost (CHF)
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
