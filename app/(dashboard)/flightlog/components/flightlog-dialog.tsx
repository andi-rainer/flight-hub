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
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { createFlightlog, updateFlightlog, deleteFlightlog } from '../actions'
import type { FlightlogWithTimes } from '@/lib/database.types'
import { Loader2, Plane as PlaneIcon, User, Clock, Fuel, Lock, ExternalLink } from 'lucide-react'

interface FlightlogDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  aircraft: Array<{ id: string; tail_number: string; type: string }>
  users: Array<{ id: string; name: string; surname: string; email: string }>
  existingEntry?: FlightlogWithTimes
  currentUserId: string
  isBoardMember: boolean
}

export function FlightlogDialog({
  open,
  onOpenChange,
  aircraft,
  users,
  existingEntry,
  currentUserId,
  isBoardMember,
}: FlightlogDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [isDeleting, setIsDeleting] = useState(false)

  // Form state
  const [planeId, setPlaneId] = useState('')
  const [copilotId, setCopilotId] = useState<string>('')
  const [blockOn, setBlockOn] = useState('')
  const [blockOff, setBlockOff] = useState('')
  const [takeoffTime, setTakeoffTime] = useState('')
  const [landingTime, setLandingTime] = useState('')
  const [fuel, setFuel] = useState('')
  const [oil, setOil] = useState('')
  const [mAndBPdfUrl, setMAndBPdfUrl] = useState('')

  const isEditMode = !!existingEntry
  const canEdit = isEditMode && (
    (existingEntry.pilot_id === currentUserId && !existingEntry.locked) ||
    isBoardMember
  )
  const canDelete = isBoardMember

  // Reset form when dialog opens or props change
  useEffect(() => {
    if (open) {
      if (existingEntry) {
        setPlaneId(existingEntry.plane_id)
        setCopilotId(existingEntry.copilot_id || '')
        setBlockOn(format(new Date(existingEntry.block_on), "yyyy-MM-dd'T'HH:mm"))
        setBlockOff(format(new Date(existingEntry.block_off), "yyyy-MM-dd'T'HH:mm"))
        setTakeoffTime(format(new Date(existingEntry.takeoff_time), "yyyy-MM-dd'T'HH:mm"))
        setLandingTime(format(new Date(existingEntry.landing_time), "yyyy-MM-dd'T'HH:mm"))
        setFuel(existingEntry.fuel?.toString() || '')
        setOil(existingEntry.oil?.toString() || '')
        setMAndBPdfUrl(existingEntry.m_and_b_pdf_url || '')
      } else {
        setPlaneId('')
        setCopilotId('')
        setBlockOn('')
        setBlockOff('')
        setTakeoffTime('')
        setLandingTime('')
        setFuel('')
        setOil('')
        setMAndBPdfUrl('')
      }
    }
  }, [open, existingEntry])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!planeId || !blockOn || !blockOff || !takeoffTime || !landingTime) {
      toast.error('Please fill in all required fields')
      return
    }

    const blockOnDate = new Date(blockOn)
    const blockOffDate = new Date(blockOff)
    const takeoffTimeDate = new Date(takeoffTime)
    const landingTimeDate = new Date(landingTime)

    if (blockOffDate <= blockOnDate) {
      toast.error('Block off time must be after block on time')
      return
    }

    if (landingTimeDate <= takeoffTimeDate) {
      toast.error('Landing time must be after takeoff time')
      return
    }

    startTransition(async () => {
      if (isEditMode && existingEntry) {
        const result = await updateFlightlog(existingEntry.id, {
          plane_id: planeId,
          copilot_id: copilotId || null,
          block_on: blockOnDate.toISOString(),
          block_off: blockOffDate.toISOString(),
          takeoff_time: takeoffTimeDate.toISOString(),
          landing_time: landingTimeDate.toISOString(),
          fuel: fuel ? parseFloat(fuel) : null,
          oil: oil ? parseFloat(oil) : null,
          m_and_b_pdf_url: mAndBPdfUrl || null,
        })

        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success('Flightlog entry updated successfully')
          onOpenChange(false)
        }
      } else {
        const result = await createFlightlog({
          plane_id: planeId,
          copilot_id: copilotId || null,
          block_on: blockOnDate.toISOString(),
          block_off: blockOffDate.toISOString(),
          takeoff_time: takeoffTimeDate.toISOString(),
          landing_time: landingTimeDate.toISOString(),
          fuel: fuel ? parseFloat(fuel) : null,
          oil: oil ? parseFloat(oil) : null,
          m_and_b_pdf_url: mAndBPdfUrl || null,
        })

        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success('Flightlog entry created successfully')
          onOpenChange(false)
        }
      }
    })
  }

  const handleDelete = async () => {
    if (!existingEntry) return

    if (!confirm('Are you sure you want to delete this flightlog entry?')) {
      return
    }

    setIsDeleting(true)

    const result = await deleteFlightlog(existingEntry.id)

    setIsDeleting(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Flightlog entry deleted successfully')
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Flightlog Entry' : 'New Flightlog Entry'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the flightlog entry details below.'
              : 'Fill in the details to create a new flightlog entry.'}
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
                {aircraft.map((plane) => (
                  <SelectItem key={plane.id} value={plane.id}>
                    {plane.tail_number} - {plane.type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Copilot Selection */}
          <div className="space-y-2">
            <Label htmlFor="copilot">
              <User className="inline h-4 w-4 mr-1" />
              Copilot (Optional)
            </Label>
            <Select
              value={copilotId || 'none'}
              onValueChange={(value) => setCopilotId(value === 'none' ? '' : value)}
              disabled={isPending || (isEditMode && !canEdit)}
            >
              <SelectTrigger id="copilot">
                <SelectValue placeholder="No copilot" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No copilot</SelectItem>
                {users
                  .filter(u => u.id !== currentUserId)
                  .map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} {user.surname}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="block-on">
                <Clock className="inline h-4 w-4 mr-1" />
                Block On *
              </Label>
              <Input
                id="block-on"
                type="datetime-local"
                value={blockOn}
                onChange={(e) => setBlockOn(e.target.value)}
                disabled={isPending || (isEditMode && !canEdit)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="block-off">
                <Clock className="inline h-4 w-4 mr-1" />
                Block Off *
              </Label>
              <Input
                id="block-off"
                type="datetime-local"
                value={blockOff}
                onChange={(e) => setBlockOff(e.target.value)}
                disabled={isPending || (isEditMode && !canEdit)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="takeoff">
                <Clock className="inline h-4 w-4 mr-1" />
                Takeoff Time *
              </Label>
              <Input
                id="takeoff"
                type="datetime-local"
                value={takeoffTime}
                onChange={(e) => setTakeoffTime(e.target.value)}
                disabled={isPending || (isEditMode && !canEdit)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="landing">
                <Clock className="inline h-4 w-4 mr-1" />
                Landing Time *
              </Label>
              <Input
                id="landing"
                type="datetime-local"
                value={landingTime}
                onChange={(e) => setLandingTime(e.target.value)}
                disabled={isPending || (isEditMode && !canEdit)}
                required
              />
            </div>
          </div>

          {/* Fuel and Oil */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fuel">
                <Fuel className="inline h-4 w-4 mr-1" />
                Fuel (liters)
              </Label>
              <Input
                id="fuel"
                type="number"
                step="0.01"
                value={fuel}
                onChange={(e) => setFuel(e.target.value)}
                disabled={isPending || (isEditMode && !canEdit)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="oil">
                Oil (liters)
              </Label>
              <Input
                id="oil"
                type="number"
                step="0.01"
                value={oil}
                onChange={(e) => setOil(e.target.value)}
                disabled={isPending || (isEditMode && !canEdit)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Mass & Balance PDF URL */}
          <div className="space-y-2">
            <Label htmlFor="mb-pdf">
              Mass & Balance PDF URL
            </Label>
            <div className="flex gap-2">
              <Input
                id="mb-pdf"
                type="url"
                value={mAndBPdfUrl}
                onChange={(e) => setMAndBPdfUrl(e.target.value)}
                disabled={isPending || (isEditMode && !canEdit)}
                placeholder="https://..."
                className="flex-1"
              />
              {mAndBPdfUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(mAndBPdfUrl, '_blank')}
                  disabled={isPending}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Upload your M&B PDF to a file host and paste the URL here
            </p>
          </div>

          {/* Show status if viewing existing */}
          {isEditMode && existingEntry && (
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex gap-2">
                {existingEntry.locked && (
                  <Badge variant="secondary">
                    <Lock className="mr-1 h-3 w-3" />
                    Locked
                  </Badge>
                )}
                {existingEntry.charged && (
                  <Badge variant="default">Charged</Badge>
                )}
                {!existingEntry.locked && !existingEntry.charged && (
                  <Badge variant="outline">Editable</Badge>
                )}
              </div>
            </div>
          )}

          {/* Show pilot info if viewing someone else's entry */}
          {isEditMode && existingEntry && existingEntry.pilot_id !== currentUserId && (
            <div className="rounded-lg bg-muted p-3 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="font-medium">Pilot:</span>
                <span>
                  {existingEntry.pilot_name} {existingEntry.pilot_surname}
                </span>
              </div>
              {existingEntry.copilot_name && (
                <div className="flex items-center gap-2 mt-1">
                  <User className="h-4 w-4" />
                  <span className="font-medium">Copilot:</span>
                  <span>
                    {existingEntry.copilot_name} {existingEntry.copilot_surname}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Show calculated times if viewing existing */}
          {isEditMode && existingEntry && (
            <div className="rounded-lg border bg-card p-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground">Block Time:</span>
                  <span className="ml-2 font-medium">
                    {existingEntry.block_time_hours?.toFixed(2)} hrs
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Flight Time:</span>
                  <span className="ml-2 font-medium">
                    {existingEntry.flight_time_hours?.toFixed(2)} hrs
                  </span>
                </div>
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
                    Deleting...
                  </>
                ) : (
                  'Delete'
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
                    {isEditMode ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>{isEditMode ? 'Update' : 'Create'}</>
                )}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
