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
import { toast } from 'sonner'
import { Loader2, Gauge } from 'lucide-react'
import { createMaintenanceRecord } from '../maintenance-actions'

interface UpdateMeterReadingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  aircraftId: string
  currentHours: number
  latestTachHours?: number | null
  latestHobbsHours?: number | null
}

export function UpdateMeterReadingsDialog({
  open,
  onOpenChange,
  aircraftId,
  currentHours,
  latestTachHours,
  latestHobbsHours,
}: UpdateMeterReadingsDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [readingDate, setReadingDate] = useState('')
  const [tachHours, setTachHours] = useState('')
  const [hobbsHours, setHobbsHours] = useState('')

  // Reset form when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setReadingDate(new Date().toISOString().split('T')[0])
      setTachHours(latestTachHours?.toString() || '')
      setHobbsHours(latestHobbsHours?.toString() || '')
    }
    onOpenChange(newOpen)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!readingDate) {
      toast.error('Please select a date')
      return
    }

    if (!tachHours && !hobbsHours) {
      toast.error('Please enter at least one meter reading (TACH or HOBBS)')
      return
    }

    // Validate that at least one value has changed
    const tachChanged = tachHours && parseFloat(tachHours) !== latestTachHours
    const hobbsChanged = hobbsHours && parseFloat(hobbsHours) !== latestHobbsHours

    if (!tachChanged && !hobbsChanged) {
      toast.error('Please change at least one meter reading')
      return
    }

    setLoading(true)

    // Create a minimal maintenance record with just meter readings
    const result = await createMaintenanceRecord({
      plane_id: aircraftId,
      performed_at: new Date(readingDate).toISOString(),
      performed_at_hours: currentHours,
      maintenance_type: 'Meter Reading',
      description: 'Manual meter reading update',
      tach_hours: tachHours ? parseFloat(tachHours) : null,
      hobbs_hours: hobbsHours ? parseFloat(hobbsHours) : null,
    })

    setLoading(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success('Meter readings updated successfully')
    router.refresh()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Update Meter Readings
          </DialogTitle>
          <DialogDescription>
            Update TACH and/or HOBBS meter readings without creating a full maintenance record
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Reading Date */}
          <div className="space-y-2">
            <Label htmlFor="reading-date">
              Reading Date *
            </Label>
            <Input
              id="reading-date"
              type="date"
              value={readingDate}
              onChange={(e) => setReadingDate(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {/* Current Values Display */}
          {(latestTachHours || latestHobbsHours) && (
            <div className="rounded-lg border p-3 bg-muted/50 space-y-1 text-sm">
              <p className="font-medium mb-1">Current Readings:</p>
              {latestHobbsHours && (
                <p className="text-muted-foreground">
                  HOBBS: {latestHobbsHours.toFixed(1)}h
                </p>
              )}
              {latestTachHours && (
                <p className="text-muted-foreground">
                  TACH: {latestTachHours.toFixed(1)}h
                </p>
              )}
            </div>
          )}

          {/* HOBBS Hours */}
          <div className="space-y-2">
            <Label htmlFor="hobbs-hours">
              HOBBS Hours
            </Label>
            <Input
              id="hobbs-hours"
              type="number"
              step="0.1"
              min="0"
              value={hobbsHours}
              onChange={(e) => setHobbsHours(e.target.value)}
              disabled={loading}
              placeholder="Enter new HOBBS reading"
            />
          </div>

          {/* TACH Hours */}
          <div className="space-y-2">
            <Label htmlFor="tach-hours">
              TACH Hours
            </Label>
            <Input
              id="tach-hours"
              type="number"
              step="0.1"
              min="0"
              value={tachHours}
              onChange={(e) => setTachHours(e.target.value)}
              disabled={loading}
              placeholder="Enter new TACH reading"
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
                  Updating...
                </>
              ) : (
                'Update Readings'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
