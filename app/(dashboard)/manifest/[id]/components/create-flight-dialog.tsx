'use client'

import { useState, ReactNode } from 'react'
import { Plus } from 'lucide-react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { PersonSelector } from '@/components/person-selector'
import { toast } from 'sonner'
import { createFlight } from '@/lib/actions/manifest'
import { useRouter } from 'next/navigation'

interface CreateFlightDialogProps {
  operationDayId: string
  operationDate: string
  existingFlights: any[]
  manifestSettings: any
  trigger?: ReactNode
}

export function CreateFlightDialog({
  operationDayId,
  operationDate,
  existingFlights,
  manifestSettings,
  trigger,
}: CreateFlightDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Calculate suggested flight number and time
  const nextFlightNumber = existingFlights.length + 1
  const lastFlight = existingFlights[existingFlights.length - 1]

  const suggestNextTime = () => {
    if (lastFlight?.scheduled_time) {
      // Add default interval to last flight time
      const lastTime = lastFlight.scheduled_time
      const [hours, minutes] = lastTime.split(':').map(Number)
      const totalMinutes = hours * 60 + minutes + (manifestSettings.default_flight_interval_minutes || 30)
      const newHours = Math.floor(totalMinutes / 60)
      const newMinutes = totalMinutes % 60
      return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`
    }
    return manifestSettings.default_operation_start_time?.substring(0, 5) || '09:00'
  }

  const [formData, setFormData] = useState({
    flight_number: nextFlightNumber,
    scheduled_time: suggestNextTime(),
    altitude_feet: manifestSettings.default_jump_altitude_feet || 13000,
    pilot_id: null as string | null,
    notes: '',
  })

  const [createSeries, setCreateSeries] = useState(false)
  const [seriesCount, setSeriesCount] = useState(3)
  const [customInterval, setCustomInterval] = useState(manifestSettings.default_flight_interval_minutes || 30)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (createSeries) {
        // Create multiple flights in a series
        let currentFlightNumber = formData.flight_number
        let currentTime = formData.scheduled_time
        let successCount = 0

        for (let i = 0; i < seriesCount; i++) {
          const result = await createFlight({
            operation_day_id: operationDayId,
            flight_number: currentFlightNumber,
            scheduled_time: currentTime,
            altitude_feet: formData.altitude_feet || undefined,
            pilot_id: formData.pilot_id || undefined,
            notes: formData.notes || undefined,
          })

          if (result.success) {
            successCount++
            // Calculate next flight time using custom interval
            const [hours, minutes] = currentTime.split(':').map(Number)
            const totalMinutes = hours * 60 + minutes + customInterval
            const newHours = Math.floor(totalMinutes / 60)
            const newMinutes = totalMinutes % 60
            currentTime = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`
            currentFlightNumber++
          } else {
            toast.error(`Failed to create flight ${currentFlightNumber}: ${result.error}`)
            break
          }
        }

        if (successCount > 0) {
          toast.success(`Created ${successCount} flight${successCount > 1 ? 's' : ''} successfully`)
          setOpen(false)
          setFormData({
            flight_number: nextFlightNumber + successCount,
            scheduled_time: suggestNextTime(),
            altitude_feet: manifestSettings.default_jump_altitude_feet || 13000,
            pilot_id: null,
            notes: '',
          })
          router.refresh()
        }
      } else {
        // Create single flight
        const result = await createFlight({
          operation_day_id: operationDayId,
          flight_number: formData.flight_number,
          scheduled_time: formData.scheduled_time,
          altitude_feet: formData.altitude_feet || undefined,
          pilot_id: formData.pilot_id || undefined,
          notes: formData.notes || undefined,
        })

        if (result.success) {
          toast.success('Flight created successfully')
          setOpen(false)
          // Reset form for next flight
          setFormData({
            flight_number: nextFlightNumber + 1,
            scheduled_time: suggestNextTime(),
            altitude_feet: manifestSettings.default_jump_altitude_feet || 13000,
            pilot_id: null,
            notes: '',
          })
          router.refresh()
        } else {
          toast.error(result.error || 'Failed to create flight')
        }
      }
    } catch (error) {
      console.error('Error creating flight:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Flight
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Flight</DialogTitle>
            <DialogDescription>
              Add a new flight (load) to this operation day. You can assign jumpers after creating
              the flight.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Create Series Option */}
            <div className="flex items-center space-x-2 p-3 border rounded-md bg-muted/50">
              <Checkbox
                id="createSeries"
                checked={createSeries}
                onCheckedChange={(checked) => setCreateSeries(checked as boolean)}
              />
              <div className="flex-1">
                <label
                  htmlFor="createSeries"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  Create series of flights
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  Automatically create multiple flights with increasing times
                </p>
              </div>
            </div>

            {createSeries && (
              <div className="grid gap-4 p-3 border rounded-md bg-accent/50">
                <div className="grid gap-2">
                  <Label htmlFor="seriesCount">Number of Flights</Label>
                  <Input
                    id="seriesCount"
                    type="number"
                    min="2"
                    max="20"
                    value={seriesCount}
                    onChange={(e) => setSeriesCount(parseInt(e.target.value) || 2)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="customInterval">Flight Interval (minutes)</Label>
                  <Input
                    id="customInterval"
                    type="number"
                    min="10"
                    max="240"
                    step="5"
                    value={customInterval}
                    onChange={(e) => setCustomInterval(parseInt(e.target.value) || 30)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Default from settings: {manifestSettings.default_flight_interval_minutes || 30} minutes
                  </p>
                </div>
                <p className="text-xs text-muted-foreground font-medium">
                  Will create {seriesCount} flights spaced {customInterval} minutes apart
                </p>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="flight_number">
                {createSeries ? 'Starting Flight Number' : 'Flight Number'}
              </Label>
              <Input
                id="flight_number"
                type="number"
                min="1"
                value={formData.flight_number}
                onChange={(e) =>
                  setFormData({ ...formData, flight_number: parseInt(e.target.value) || 1 })
                }
                required
              />
              {createSeries && (
                <p className="text-xs text-muted-foreground">
                  Series will create Loads #{formData.flight_number} through #{formData.flight_number + seriesCount - 1}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="scheduled_time">
                {createSeries ? 'First Flight Time' : 'Scheduled Time'}
              </Label>
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
                label="Pilot (Optional)"
                placeholder="Select skydive pilot..."
              />
              <p className="text-xs text-muted-foreground">
                Pilot can be assigned now or later
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
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
              {isSubmitting
                ? 'Creating...'
                : createSeries
                ? `Create ${seriesCount} Flights`
                : 'Create Flight'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
