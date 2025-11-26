'use client'

import { useState, useEffect, useTransition } from 'react'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from 'sonner'
import { createReservation, updateReservation, deleteReservation } from '../actions'
import { type ActiveReservation, type Plane, type ReservationStatus } from '@/lib/database.types'
import { Loader2, Plane as PlaneIcon, Clock, User, MessageSquare, AlertCircle, AlertTriangle, Wrench } from 'lucide-react'

type AircraftWithMaintenance = Pick<Plane, 'id' | 'tail_number' | 'type' | 'color'> & {
  total_flight_hours?: number
  hours_until_maintenance?: number | null
  maintenance_status?: string
}

interface ReservationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  aircraft: AircraftWithMaintenance[]
  initialStartTime?: Date
  initialEndTime?: Date
  initialAircraftId?: string
  existingReservation?: ActiveReservation
  currentUserId: string
  isBoardMember: boolean
}

export function ReservationDialog({
  open,
  onOpenChange,
  aircraft,
  initialStartTime,
  initialEndTime,
  initialAircraftId,
  existingReservation,
  currentUserId,
  isBoardMember,
}: ReservationDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [isDeleting, setIsDeleting] = useState(false)

  // Form state - reset when dialog opens with new props
  const [planeId, setPlaneId] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [status, setStatus] = useState<ReservationStatus>('active')
  const [priority, setPriority] = useState(false)
  const [remarks, setRemarks] = useState('')

  // Reset form when dialog opens or props change
  useEffect(() => {
    if (open) {
      if (existingReservation) {
        setPlaneId(existingReservation.plane_id ?? '')
        setStartTime(existingReservation.start_time ? format(new Date(existingReservation.start_time), "yyyy-MM-dd'T'HH:mm") : '')
        setEndTime(existingReservation.end_time ? format(new Date(existingReservation.end_time), "yyyy-MM-dd'T'HH:mm") : '')
        setStatus((existingReservation.status as 'active' | 'standby' | 'cancelled') ?? 'active')
        setPriority(existingReservation.priority || false)
        setRemarks(existingReservation.remarks || '')
      } else {
        setPlaneId(initialAircraftId || '')
        setStartTime(initialStartTime ? format(initialStartTime, "yyyy-MM-dd'T'HH:mm") : '')
        setEndTime(initialEndTime ? format(initialEndTime, "yyyy-MM-dd'T'HH:mm") : '')
        setStatus('active')
        setPriority(false)
        setRemarks('')
      }
    }
  }, [open, existingReservation, initialStartTime, initialEndTime, initialAircraftId])

  const isEditMode = !!existingReservation
  const canEdit = isEditMode && (existingReservation.user_id === currentUserId || isBoardMember)
  const canDelete = canEdit

  const roundToQuarterHour = (date: Date): Date => {
    const minutes = date.getMinutes()
    const roundedMinutes = Math.round(minutes / 15) * 15
    const newDate = new Date(date)
    newDate.setMinutes(roundedMinutes, 0, 0)
    return newDate
  }

  // Handler to automatically round time to 15-minute intervals
  const handleTimeChange = (value: string, setter: (value: string) => void) => {
    if (!value) {
      setter('')
      return
    }

    try {
      const date = new Date(value)
      const rounded = roundToQuarterHour(date)
      const formattedTime = format(rounded, "yyyy-MM-dd'T'HH:mm")
      setter(formattedTime)
    } catch {
      // If parsing fails, just set the raw value
      setter(value)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!planeId || !startTime || !endTime) {
      toast.error('Please fill in all required fields')
      return
    }

    // Always round to nearest quarter hour before submitting
    const start = roundToQuarterHour(new Date(startTime))
    const end = roundToQuarterHour(new Date(endTime))

    if (end <= start) {
      toast.error('End time must be after start time')
      return
    }

    startTransition(async () => {
      if (isEditMode && existingReservation) {
        const result = await updateReservation(existingReservation.id ?? '', {
          plane_id: planeId,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          priority,
          remarks: remarks || null,
        })

        if (result.error) {
          toast.error(result.error)
        } else {
          if (result.warning) {
            toast.warning(result.warning)
          } else {
            toast.success('Reservation updated successfully')
          }
          onOpenChange(false)
        }
      } else {
        const result = await createReservation({
          plane_id: planeId,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          priority,
          remarks: remarks || null,
        })

        if (result.error) {
          toast.error(result.error)
        } else {
          if (result.warning) {
            toast.warning(result.warning)
          } else {
            toast.success('Reservation created successfully')
          }
          onOpenChange(false)
        }
      }
    })
  }

  const handleDelete = async () => {
    if (!existingReservation) return

    if (!confirm('Are you sure you want to cancel this reservation?')) {
      return
    }

    setIsDeleting(true)

    const result = await deleteReservation(existingReservation.id ?? '')

    setIsDeleting(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Reservation cancelled successfully')
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Reservation' : 'Create Reservation'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the reservation details below.'
              : 'Fill in the details to create a new reservation.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Aircraft Selection */}
          <div className="space-y-2">
            <Label htmlFor="aircraft">
              <PlaneIcon className="inline h-4 w-4 mr-1" />
              Aircraft *
            </Label>
            <Select
              value={planeId}
              onValueChange={setPlaneId}
              disabled={isPending || (isEditMode && !canEdit)}
            >
              <SelectTrigger id="aircraft">
                <SelectValue placeholder="Select aircraft" />
              </SelectTrigger>
              <SelectContent>
                {aircraft.map((plane) => {
                  const maintenanceIcon = plane.maintenance_status === 'overdue' || plane.maintenance_status === 'critical'
                    ? <AlertTriangle className="h-3 w-3 inline ml-1 text-destructive" />
                    : null

                  return (
                    <SelectItem key={plane.id} value={plane.id}>
                      <div className="flex items-center gap-2">
                        <span>{(plane.tail_number ?? "")} - {(plane.type ?? "")}</span>
                        {maintenanceIcon}
                        {plane.hours_until_maintenance !== undefined && plane.hours_until_maintenance !== null && (
                          <span className="text-xs text-muted-foreground">
                            ({plane.hours_until_maintenance > 0 ? `${plane.hours_until_maintenance.toFixed(0)}h left` : 'Overdue'})
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Maintenance Warning */}
          {planeId && (() => {
            const selectedAircraft = aircraft.find(a => a.id === planeId)
            if (!selectedAircraft) return null

            if (selectedAircraft.maintenance_status === 'overdue') {
              return (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Maintenance Overdue</AlertTitle>
                  <AlertDescription>
                    This aircraft is {Math.abs(selectedAircraft.hours_until_maintenance || 0).toFixed(0)} hours overdue for
                    maintenance. Consider selecting a different aircraft or confirming maintenance status before flying.
                  </AlertDescription>
                </Alert>
              )
            }

            if (selectedAircraft.maintenance_status === 'critical') {
              return (
                <Alert variant="destructive" className="border-orange-600 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-800" />
                  <AlertTitle className="text-orange-800">Maintenance Critical</AlertTitle>
                  <AlertDescription className="text-orange-700">
                    Only {selectedAircraft.hours_until_maintenance?.toFixed(0)} hours remaining until maintenance is due.
                    Ensure your flight duration is within this limit.
                  </AlertDescription>
                </Alert>
              )
            }

            if (selectedAircraft.maintenance_status === 'warning' && selectedAircraft.hours_until_maintenance !== null) {
              return (
                <Alert className="border-yellow-600 bg-yellow-50">
                  <Wrench className="h-4 w-4 text-yellow-800" />
                  <AlertTitle className="text-yellow-800">Maintenance Due Soon</AlertTitle>
                  <AlertDescription className="text-yellow-700">
                    {(selectedAircraft.hours_until_maintenance ?? 0).toFixed(0)} hours remaining until maintenance is due.
                  </AlertDescription>
                </Alert>
              )
            }

            return null
          })()}

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">
                <Clock className="inline h-4 w-4 mr-1" />
                Start Time *
              </Label>
              <Input
                id="start-time"
                type="datetime-local"
                value={startTime}
                onChange={(e) => handleTimeChange(e.target.value, setStartTime)}
                onBlur={(e) => handleTimeChange(e.target.value, setStartTime)}
                disabled={isPending || (isEditMode && !canEdit)}
                min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                required
              />
              <p className="text-xs text-muted-foreground">
                Times will be rounded to 15-minute intervals
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">
                <Clock className="inline h-4 w-4 mr-1" />
                End Time *
              </Label>
              <Input
                id="end-time"
                type="datetime-local"
                value={endTime}
                onChange={(e) => handleTimeChange(e.target.value, setEndTime)}
                onBlur={(e) => handleTimeChange(e.target.value, setEndTime)}
                disabled={isPending || (isEditMode && !canEdit)}
                min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                required
              />
              <p className="text-xs text-muted-foreground">
                Times will be rounded to 15-minute intervals
              </p>
            </div>
          </div>

          {/* Priority (Board members only) */}
          {isBoardMember && (
            <div className="space-y-2">
              <Label htmlFor="priority">Priority Reservation (Board Only)</Label>
              <Select
                value={priority ? 'yes' : 'no'}
                onValueChange={(value) => setPriority(value === 'yes')}
                disabled={isPending}
              >
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">Normal</SelectItem>
                  <SelectItem value="yes">Priority (bumps existing to standby)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Priority reservations will move any conflicting active reservations to standby status
              </p>
            </div>
          )}

          {/* Show status badge if viewing existing */}
          {isEditMode && existingReservation && (
            <div className="space-y-2">
              <Label>Current Status</Label>
              <div>
                {existingReservation.status === 'active' && (
                  <Badge variant="default">Active</Badge>
                )}
                {existingReservation.status === 'standby' && (
                  <Badge variant="outline" className="border-amber-500 text-amber-600">Standby</Badge>
                )}
                {existingReservation.status === 'cancelled' && (
                  <Badge variant="secondary">Cancelled</Badge>
                )}
                {existingReservation.priority && (
                  <Badge variant="default" className="ml-2 bg-purple-600">Priority</Badge>
                )}
              </div>
            </div>
          )}

          {/* Remarks */}
          <div className="space-y-2">
            <Label htmlFor="remarks">
              <MessageSquare className="inline h-4 w-4 mr-1" />
              Remarks
            </Label>
            <Textarea
              id="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              disabled={isPending || (isEditMode && !canEdit)}
              placeholder="Optional notes or comments..."
              rows={3}
            />
          </div>

          {/* Show user info if viewing someone else's reservation */}
          {isEditMode && existingReservation && existingReservation.user_id !== currentUserId && (
            <div className="rounded-lg bg-muted p-3 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="font-medium">Reserved by:</span>
                <span>
                  {existingReservation.user_name} {existingReservation.user_surname}
                </span>
              </div>
            </div>
          )}

          {/* Warning for non-editable */}
          {isEditMode && !canEdit && (
            <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3 text-sm text-yellow-600 dark:text-yellow-500">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  You can only view this reservation. Only the owner or board members can edit it.
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {canDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending || isDeleting}
                className="mr-auto"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  'Cancel Reservation'
                )}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending || isDeleting}
            >
              Cancel
            </Button>
            {(!isEditMode || canEdit) && (
              <Button type="submit" disabled={isPending || isDeleting}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditMode ? 'Updating...' : 'Reserving...'}
                  </>
                ) : (
                  <>{isEditMode ? 'Update' : 'Reserve'}</>
                )}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
