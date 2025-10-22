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
import { createFlightlog, updateFlightlog, deleteFlightlog, uploadMassAndBalanceDocument } from '../../actions'
import type { FlightlogWithTimes, OperationType } from '@/lib/database.types'
import { Loader2, Plane as PlaneIcon, User, Clock, Fuel, Lock, ExternalLink, Upload, FileText, Wrench } from 'lucide-react'

interface FlightlogDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  aircraft: { id: string; tail_number: string; type: string }
  aircraftId: string
  users: Array<{ id: string; name: string; surname: string; email: string }>
  operationTypes: OperationType[]
  existingEntry?: FlightlogWithTimes
  currentUserId: string
  isBoardMember: boolean
}

export function FlightlogDialog({
  open,
  onOpenChange,
  aircraft,
  aircraftId,
  users,
  operationTypes,
  existingEntry,
  currentUserId,
  isBoardMember,
}: FlightlogDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [isDeleting, setIsDeleting] = useState(false)

  // Form state - aircraft is fixed, so no need for planeId state
  const [pilotId, setPilotId] = useState<string>(currentUserId)
  const [additionalCrewId, setAdditionalCrewId] = useState<string>('')
  const [operationTypeId, setOperationTypeId] = useState<string>('')
  const [blockOff, setBlockOff] = useState('')
  const [takeoffTime, setTakeoffTime] = useState('')
  const [landingTime, setLandingTime] = useState('')
  const [blockOn, setBlockOn] = useState('')
  const [fuel, setFuel] = useState('')
  const [oil, setOil] = useState('')
  const [landings, setLandings] = useState('1')
  const [mAndBPdfUrl, setMAndBPdfUrl] = useState('')
  const [mAndBFile, setMAndBFile] = useState<File | null>(null)
  const [isUploadingMB, setIsUploadingMB] = useState(false)

  const isEditMode = !!existingEntry
  const canEdit = isEditMode && (
    (existingEntry.pilot_id === currentUserId && !existingEntry.locked) ||
    isBoardMember
  )
  const canDelete = isBoardMember

  // Reset form when dialog opens or props change
  useEffect(() => {
    if (open) {
      // Format today's date with empty time (user will fill in time)
      const today = format(new Date(), "yyyy-MM-dd'T'00:00")

      // Find default operation type
      const defaultOpType = operationTypes.find(ot => ot.is_default)

      if (existingEntry) {
        setPilotId(existingEntry.pilot_id)
        setAdditionalCrewId(existingEntry.copilot_id || '')
        setOperationTypeId(existingEntry.operation_type_id || '')
        setBlockOff(format(new Date(existingEntry.block_off), "yyyy-MM-dd'T'HH:mm"))
        setTakeoffTime(format(new Date(existingEntry.takeoff_time), "yyyy-MM-dd'T'HH:mm"))
        setLandingTime(format(new Date(existingEntry.landing_time), "yyyy-MM-dd'T'HH:mm"))
        setBlockOn(format(new Date(existingEntry.block_on), "yyyy-MM-dd'T'HH:mm"))
        setFuel(existingEntry.fuel?.toString() || '')
        setOil(existingEntry.oil?.toString() || '')
        setLandings(existingEntry.landings?.toString() || '1')
        setMAndBPdfUrl(existingEntry.m_and_b_pdf_url || '')
        setMAndBFile(null)
      } else {
        setPilotId(currentUserId)
        setAdditionalCrewId('')
        setOperationTypeId(defaultOpType?.id || '')
        setBlockOff(today)
        setTakeoffTime(today)
        setLandingTime(today)
        setBlockOn(today)
        setFuel('')
        setOil('')
        setLandings('1')
        setMAndBPdfUrl('')
        setMAndBFile(null)
      }
    }
  }, [open, existingEntry, currentUserId, operationTypes])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!pilotId || !blockOff || !takeoffTime || !landingTime || !blockOn) {
      toast.error('Please fill in all required fields')
      return
    }

    // Validate pilot/crew conflict
    if (additionalCrewId && additionalCrewId === pilotId) {
      toast.error('Additional crewmember cannot be the same as pilot')
      return
    }

    const blockOffDate = new Date(blockOff)
    const takeoffTimeDate = new Date(takeoffTime)
    const landingTimeDate = new Date(landingTime)
    const blockOnDate = new Date(blockOn)

    // Chronological order: Block Off ≤ Takeoff ≤ Landing ≤ Block On
    if (takeoffTimeDate < blockOffDate) {
      toast.error('Takeoff time must be after or at Block Off time')
      return
    }

    if (landingTimeDate < takeoffTimeDate) {
      toast.error('Landing time must be after or at takeoff time')
      return
    }

    if (blockOnDate < landingTimeDate) {
      toast.error('Block On time must be after or at landing time')
      return
    }

    startTransition(async () => {
      let mbUrl = mAndBPdfUrl

      // Upload M&B file if a new file is selected
      if (mAndBFile) {
        setIsUploadingMB(true)
        const formData = new FormData()
        formData.append('file', mAndBFile)
        formData.append('planeId', aircraftId)
        if (isEditMode && existingEntry) {
          formData.append('flightlogId', existingEntry.id)
        }

        const uploadResult = await uploadMassAndBalanceDocument(formData)
        setIsUploadingMB(false)

        if (uploadResult.error) {
          toast.error(`M&B upload failed: ${uploadResult.error}`)
          return
        }

        mbUrl = uploadResult.data?.url || null
        toast.success('M&B document uploaded successfully')
      }

      if (isEditMode && existingEntry) {
        const result = await updateFlightlog(existingEntry.id, {
          plane_id: aircraftId,
          pilot_id: pilotId,
          copilot_id: additionalCrewId || null,
          operation_type_id: operationTypeId || null,
          block_off: blockOffDate.toISOString(),
          takeoff_time: takeoffTimeDate.toISOString(),
          landing_time: landingTimeDate.toISOString(),
          block_on: blockOnDate.toISOString(),
          fuel: fuel ? parseFloat(fuel) : null,
          oil: oil ? parseFloat(oil) : null,
          landings: landings ? parseInt(landings) : 1,
          m_and_b_pdf_url: mbUrl || null,
        })

        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success('Flightlog entry updated successfully')
          onOpenChange(false)
        }
      } else {
        const result = await createFlightlog({
          plane_id: aircraftId,
          pilot_id: pilotId,
          copilot_id: additionalCrewId || null,
          operation_type_id: operationTypeId || null,
          block_off: blockOffDate.toISOString(),
          takeoff_time: takeoffTimeDate.toISOString(),
          landing_time: landingTimeDate.toISOString(),
          block_on: blockOnDate.toISOString(),
          fuel: fuel ? parseFloat(fuel) : null,
          oil: oil ? parseFloat(oil) : null,
          landings: landings ? parseInt(landings) : 1,
          m_and_b_pdf_url: mbUrl || null,
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
          {/* Aircraft Info (Read-only) */}
          <div className="space-y-2">
            <Label>
              <PlaneIcon className="inline h-4 w-4 mr-1" />
              Aircraft
            </Label>
            <div className="rounded-md border bg-muted px-3 py-2 text-sm">
              {aircraft.tail_number} - {aircraft.type}
            </div>
          </div>

          {/* Pilot Selection (Board members only) */}
          {isBoardMember ? (
            <div className="space-y-2">
              <Label htmlFor="pilot">
                <User className="inline h-4 w-4 mr-1" />
                Pilot *
              </Label>
              <Select
                value={pilotId}
                onValueChange={setPilotId}
                disabled={isPending || (isEditMode && !canEdit)}
              >
                <SelectTrigger id="pilot">
                  <SelectValue placeholder="Select pilot" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} {user.surname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {/* Additional Crewmember Selection */}
          <div className="space-y-2">
            <Label htmlFor="crew">
              <User className="inline h-4 w-4 mr-1" />
              Additional Crewmember (Optional)
            </Label>
            <Select
              value={additionalCrewId || 'none'}
              onValueChange={(value) => setAdditionalCrewId(value === 'none' ? '' : value)}
              disabled={isPending || (isEditMode && !canEdit)}
            >
              <SelectTrigger id="crew">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {users
                  .filter(u => u.id !== pilotId)
                  .map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} {user.surname}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              E.g., Flight Instructor, Cost Sharing Partner
            </p>
          </div>

          {/* Operation Type Selection */}
          {operationTypes.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="operation-type">
                <Wrench className="inline h-4 w-4 mr-1" />
                Operation Type {operationTypes.length > 1 ? '*' : '(Optional)'}
              </Label>
              <Select
                value={operationTypeId || 'none'}
                onValueChange={(value) => setOperationTypeId(value === 'none' ? '' : value)}
                disabled={isPending || (isEditMode && !canEdit)}
              >
                <SelectTrigger id="operation-type">
                  <SelectValue placeholder="Select operation type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {operationTypes.map((opType) => (
                    <SelectItem key={opType.id} value={opType.id}>
                      <div className="flex items-center gap-2">
                        {opType.color && (
                          <div
                            className="h-3 w-3 rounded-full border"
                            style={{ backgroundColor: opType.color }}
                          />
                        )}
                        {opType.name}
                        {opType.is_default && (
                          <span className="text-xs text-muted-foreground">(default)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select operation type for billing purposes (e.g., Normal, Skydive Ops, Aerobatic)
              </p>
            </div>
          )}

          {/* Time Fields - Block Off, Takeoff, Landing, Block On */}
          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label htmlFor="takeoff">
                <Clock className="inline h-4 w-4 mr-1" />
                Takeoff *
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="landing">
                <Clock className="inline h-4 w-4 mr-1" />
                Landing *
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
          </div>

          {/* Fuel, Oil, and Landings */}
          <div className="grid grid-cols-3 gap-4">
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
            <div className="space-y-2">
              <Label htmlFor="landings">
                Landings *
              </Label>
              <Input
                id="landings"
                type="number"
                min="1"
                value={landings}
                onChange={(e) => setLandings(e.target.value)}
                disabled={isPending || (isEditMode && !canEdit)}
                placeholder="1"
                required
              />
              <p className="text-xs text-muted-foreground">
                E.g., 3 for touch-and-go
              </p>
            </div>
          </div>

          {/* Mass & Balance Document */}
          <div className="space-y-2">
            <Label htmlFor="mb-file">
              <FileText className="inline h-4 w-4 mr-1" />
              Mass & Balance Document
            </Label>

            {mAndBPdfUrl && !mAndBFile ? (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 justify-start"
                  onClick={() => window.open(mAndBPdfUrl, '_blank')}
                  disabled={isPending}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Current Document
                </Button>
                {(!isEditMode || canEdit) && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setMAndBPdfUrl('')
                      const fileInput = document.getElementById('mb-file') as HTMLInputElement
                      fileInput?.click()
                    }}
                    disabled={isPending}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Replace
                  </Button>
                )}
              </div>
            ) : (
              <>
                <Input
                  id="mb-file"
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => setMAndBFile(e.target.files?.[0] || null)}
                  disabled={isPending || isUploadingMB || (isEditMode && !canEdit)}
                />
                {mAndBFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {mAndBFile.name}
                  </p>
                )}
              </>
            )}

            <p className="text-xs text-muted-foreground">
              Upload Mass & Balance calculation (PDF or Image)
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
            {isEditMode && canDelete && (
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
              <Button type="submit" disabled={isPending || isDeleting || isUploadingMB}>
                {isPending || isUploadingMB ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isUploadingMB ? 'Uploading M&B...' : isEditMode ? 'Updating...' : 'Creating...'}
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
