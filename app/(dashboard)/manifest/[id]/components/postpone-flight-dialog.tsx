'use client'

import { useState, ReactNode } from 'react'
import { Clock } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { postponeFlight, postponeFlightCascade } from '@/lib/actions/manifest'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface PostponeFlightDialogProps {
  flight: any
  allFlights: any[]
  manifestSettings: any
  trigger?: ReactNode
}

export function PostponeFlightDialog({
  flight,
  allFlights,
  manifestSettings,
  trigger,
}: PostponeFlightDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newTime, setNewTime] = useState(flight.scheduled_time || '')
  const [cascadeUpdate, setCascadeUpdate] = useState(false)
  const [customInterval, setCustomInterval] = useState<number | null>(null)

  // Find all flights after this one
  const currentFlightIndex = allFlights.findIndex((f) => f.id === flight.id)
  const followingFlights = currentFlightIndex >= 0 ? allFlights.slice(currentFlightIndex + 1) : []

  // Calculate time difference in minutes
  const calculateTimeDiff = () => {
    if (!newTime || !flight.scheduled_time) return 0

    const [oldH, oldM] = flight.scheduled_time.split(':').map(Number)
    const [newH, newM] = newTime.split(':').map(Number)

    const oldMinutes = oldH * 60 + oldM
    const newMinutes = newH * 60 + newM

    return newMinutes - oldMinutes
  }

  const timeDiff = calculateTimeDiff()
  const defaultInterval = manifestSettings.default_flight_interval_minutes || 120

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (cascadeUpdate && followingFlights.length > 0) {
        // Cascade update
        const result = await postponeFlightCascade({
          flight_id: flight.id,
          new_time: newTime,
          time_diff_minutes: timeDiff,
          custom_interval_minutes: customInterval,
          default_interval_minutes: defaultInterval,
        })

        if (result.success) {
          toast.success(
            `Flight postponed and ${result.data?.updated_count || 0} following flight(s) updated`
          )
          setOpen(false)
          router.refresh()
        } else {
          toast.error(result.error || 'Failed to postpone flights')
        }
      } else {
        // Single flight update
        const result = await postponeFlight(flight.id, newTime)

        if (result.success) {
          toast.success('Flight postponed')
          setOpen(false)
          router.refresh()
        } else {
          toast.error(result.error || 'Failed to postpone flight')
        }
      }
    } catch (error) {
      console.error('Error postponing flight:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      // Reset to current time when opening
      setNewTime(flight.scheduled_time || '')
      setCascadeUpdate(false)
      setCustomInterval(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Clock className="mr-2 h-4 w-4" />
            Postpone
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Postpone Flight</DialogTitle>
            <DialogDescription>
              Reschedule Load #{flight.flight_number} to a new time
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Current Time */}
            <div className="grid gap-2">
              <Label>Current Time</Label>
              <div className="p-2 bg-muted rounded-md text-sm">
                {flight.scheduled_time}
              </div>
            </div>

            {/* New Time */}
            <div className="grid gap-2">
              <Label htmlFor="newTime">New Time</Label>
              <Input
                id="newTime"
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                required
              />
              {timeDiff !== 0 && (
                <p className="text-xs text-muted-foreground">
                  {timeDiff > 0 ? 'Delaying' : 'Moving forward'} by{' '}
                  {Math.abs(timeDiff)} minute(s)
                </p>
              )}
            </div>

            {/* Cascade Option */}
            {followingFlights.length > 0 && (
              <>
                <div className="flex items-center space-x-2 pt-2 border-t">
                  <Checkbox
                    id="cascadeUpdate"
                    checked={cascadeUpdate}
                    onCheckedChange={(checked) => setCascadeUpdate(checked as boolean)}
                  />
                  <label
                    htmlFor="cascadeUpdate"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Update all following flights ({followingFlights.length})
                  </label>
                </div>

                {cascadeUpdate && (
                  <div className="pl-6 space-y-3">
                    <p className="text-sm text-muted-foreground">
                      All following flights will be delayed by {Math.abs(timeDiff)} minute(s).
                    </p>

                    <div className="grid gap-2">
                      <Label htmlFor="customInterval">
                        Flight Interval (optional override)
                      </Label>
                      <Input
                        id="customInterval"
                        type="number"
                        min="10"
                        max="240"
                        step="5"
                        placeholder={`Default: ${defaultInterval} minutes`}
                        value={customInterval || ''}
                        onChange={(e) =>
                          setCustomInterval(e.target.value ? parseInt(e.target.value) : null)
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Override the interval between this flight and the next one to make up time
                      </p>
                    </div>

                    {/* Preview */}
                    <div className="p-3 bg-muted rounded-md text-xs space-y-1">
                      <div className="font-semibold mb-2">Preview:</div>
                      <div>
                        <strong>This flight:</strong> {flight.scheduled_time} → {newTime}
                      </div>
                      {followingFlights.slice(0, 3).map((f, idx) => {
                        const [h, m] = (idx === 0 && customInterval !== null
                          ? newTime
                          : flight.scheduled_time
                        ).split(':').map(Number)
                        const baseMinutes = h * 60 + m
                        const interval = idx === 0 && customInterval !== null ? customInterval : defaultInterval
                        const nextMinutes = baseMinutes + timeDiff + (idx + 1) * interval - (customInterval !== null && idx === 0 ? defaultInterval : 0)
                        const nextH = Math.floor(nextMinutes / 60) % 24
                        const nextM = nextMinutes % 60
                        const nextTime = `${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`

                        return (
                          <div key={f.id}>
                            <strong>Flight #{f.flight_number}:</strong> {f.scheduled_time} → {nextTime}
                          </div>
                        )
                      })}
                      {followingFlights.length > 3 && (
                        <div className="text-muted-foreground">
                          ... and {followingFlights.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
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
            <Button type="submit" disabled={isSubmitting || !newTime}>
              {isSubmitting ? 'Postponing...' : 'Postpone Flight'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
