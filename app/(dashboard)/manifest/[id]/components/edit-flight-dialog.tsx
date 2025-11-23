'use client'

import { useState, ReactNode } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { PersonSelector } from '@/components/person-selector'
import { toast } from 'sonner'
import { updateFlight } from '@/lib/actions/manifest'
import { useRouter } from 'next/navigation'

interface EditFlightDialogProps {
  flight: any
  manifestSettings: any
  trigger?: ReactNode
}

export function EditFlightDialog({
  flight,
  manifestSettings,
  trigger,
}: EditFlightDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    flight_number: flight.flight_number,
    scheduled_time: flight.scheduled_time?.substring(0, 5) || '',
    altitude_feet: flight.altitude_feet || manifestSettings.default_jump_altitude_feet || 13000,
    pilot_id: flight.pilot_id || null,
    notes: flight.notes || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const result = await updateFlight(flight.id, {
        scheduled_time: formData.scheduled_time,
        altitude_feet: formData.altitude_feet || undefined,
        pilot_id: formData.pilot_id || null,
        notes: formData.notes || null,
      })

      if (result.success) {
        toast.success('Flight updated successfully')
        setOpen(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to update flight')
      }
    } catch (error) {
      console.error('Error updating flight:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Don't allow editing if flight is completed or cancelled
  const canEdit = flight.status !== 'completed' && flight.status !== 'cancelled'

  if (!canEdit) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Flight #{flight.flight_number}</DialogTitle>
            <DialogDescription>
              Update flight details. Note: Flight number cannot be changed.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="flight_number">Flight Number</Label>
              <Input
                id="flight_number"
                type="number"
                value={formData.flight_number}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Flight number cannot be changed after creation
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="scheduled_time">Scheduled Time</Label>
              <Input
                id="scheduled_time"
                type="time"
                value={formData.scheduled_time}
                onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="altitude_feet">Jump Altitude (feet)</Label>
              <Input
                id="altitude_feet"
                type="number"
                min={manifestSettings.min_jump_altitude_feet || 3000}
                max={manifestSettings.max_jump_altitude_feet || 15000}
                step="500"
                value={formData.altitude_feet}
                onChange={(e) =>
                  setFormData({ ...formData, altitude_feet: parseInt(e.target.value) || 0 })
                }
              />
              <p className="text-xs text-muted-foreground">
                Standard altitude: {manifestSettings.default_jump_altitude_feet || 13000} ft
              </p>
            </div>

            <div className="grid gap-2">
              <PersonSelector
                context="skydive_pilot"
                value={formData.pilot_id}
                onChange={(userId) => setFormData({ ...formData, pilot_id: userId })}
                label="Pilot"
                placeholder="Select skydive pilot..."
              />
              <p className="text-xs text-muted-foreground">
                Change or remove pilot assignment
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Special instructions or notes for this flight"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Flight'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
