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
import { createFlightlog, updateFlightlog, deleteFlightlog, uploadMassAndBalanceDocument, checkFlightWarnings, markFlightlogAsReviewed, getPreviousFlightDestination, type FlightWarning } from '../../actions'
import type { FlightlogWithTimes, OperationType } from '@/lib/database.types'
import { Loader2, Plane as PlaneIcon, User, Clock, Fuel, Lock, ExternalLink, Upload, FileText, Wrench, AlertTriangle, CheckCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { PersonSelector } from '@/components/person-selector'
import { PERSON_SELECTOR_CONTEXTS } from '@/lib/constants/system-functions'

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
  const [isMarkingReviewed, setIsMarkingReviewed] = useState(false)

  // Form state - aircraft is fixed, so no need for planeId state
  const [pilotId, setPilotId] = useState<string>(currentUserId)
  const [additionalCrewId, setAdditionalCrewId] = useState<string>('')
  const [operationTypeId, setOperationTypeId] = useState<string>('')
  const [flightDate, setFlightDate] = useState('')
  const [blockOffTime, setBlockOffTime] = useState('')
  const [takeoffTime, setTakeoffTime] = useState('')
  const [landingTime, setLandingTime] = useState('')
  const [blockOnTime, setBlockOnTime] = useState('')
  const [fuel, setFuel] = useState('')
  const [oil, setOil] = useState('')
  const [landings, setLandings] = useState('1')
  const [icaoDeparture, setIcaoDeparture] = useState('')
  const [icaoDestination, setIcaoDestination] = useState('')
  const [mAndBPdfUrl, setMAndBPdfUrl] = useState('')
  const [mAndBFile, setMAndBFile] = useState<File | null>(null)
  const [isUploadingMB, setIsUploadingMB] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [flightWarnings, setFlightWarnings] = useState<FlightWarning[]>([])
  const [calculatedDates, setCalculatedDates] = useState<{
    blockOff: Date
    takeoff: Date
    landing: Date
    blockOn: Date
    hasDifferentDates: boolean
  } | null>(null)

  const isEditMode = !!existingEntry
  const canEdit = isEditMode && (
    (existingEntry.pilot_id === currentUserId && !existingEntry.locked) ||
    isBoardMember
  )
  const canDelete = isBoardMember

  // Check if all mandatory fields are filled
  const isFormValid = !!(
    pilotId &&
    flightDate &&
    blockOffTime &&
    takeoffTime &&
    landingTime &&
    blockOnTime &&
    landings &&
    // ICAO codes must be exactly 4 characters
    icaoDeparture.length === 4 &&
    icaoDestination.length === 4
  )

  // Reset form when dialog opens or props change
  useEffect(() => {
    if (open) {
      // Format today's date
      const todayDate = format(new Date(), "yyyy-MM-dd")

      // Find default operation type
      const defaultOpType = operationTypes.find(ot => ot.is_default)

      if (existingEntry) {
        setPilotId(existingEntry.pilot_id!)
        setAdditionalCrewId(existingEntry.copilot_id || '')
        setOperationTypeId(existingEntry.operation_type_id || '')
        // Extract date from block_off and times from each field
        setFlightDate(format(new Date(existingEntry.block_off!), "yyyy-MM-dd"))
        setBlockOffTime(format(new Date(existingEntry.block_off!), "HH:mm"))
        setTakeoffTime(format(new Date(existingEntry.takeoff_time!), "HH:mm"))
        setLandingTime(format(new Date(existingEntry.landing_time!), "HH:mm"))
        setBlockOnTime(format(new Date(existingEntry.block_on!), "HH:mm"))
        setFuel(existingEntry.fuel?.toString() || '')
        setOil(existingEntry.oil?.toString() || '')
        setLandings(existingEntry.landings?.toString() || '1')
        setIcaoDeparture(existingEntry.icao_departure || '')
        setIcaoDestination(existingEntry.icao_destination || '')
        setMAndBPdfUrl(existingEntry.m_and_b_pdf_url || '')
        setMAndBFile(null)
      } else {
        setPilotId(currentUserId)
        setAdditionalCrewId('')
        setOperationTypeId(defaultOpType?.id || '')
        setFlightDate(todayDate)
        setBlockOffTime('')
        setTakeoffTime('')
        setLandingTime('')
        setBlockOnTime('')
        setFuel('')
        setOil('')
        setLandings('1')
        setIcaoDestination('')
        setMAndBPdfUrl('')
        setMAndBFile(null)

        // Pre-fill ICAO departure with previous flight's destination
        getPreviousFlightDestination(aircraftId).then(result => {
          if (result.data) {
            setIcaoDeparture(result.data)
          } else {
            setIcaoDeparture('')
          }
        })
      }
      setShowConfirmation(false)
      setCalculatedDates(null)
    }
  }, [open, existingEntry, currentUserId, operationTypes, aircraftId])

  // Helper function to calculate dates with smart next-day detection
  const calculateDates = () => {
    if (!flightDate || !blockOffTime || !takeoffTime || !landingTime || !blockOnTime) {
      return null
    }

    // Parse times (HH:mm format)
    const [blockOffHour, blockOffMin] = blockOffTime.split(':').map(Number)
    const [takeoffHour, takeoffMin] = takeoffTime.split(':').map(Number)
    const [landingHour, landingMin] = landingTime.split(':').map(Number)
    const [blockOnHour, blockOnMin] = blockOnTime.split(':').map(Number)

    // Create base date from flight date
    const baseDate = new Date(flightDate)

    // Block off is always on flight date
    const blockOffDate = new Date(baseDate)
    blockOffDate.setHours(blockOffHour, blockOffMin, 0, 0)

    // Takeoff must be >= block off
    const takeoffDate = new Date(baseDate)
    takeoffDate.setHours(takeoffHour, takeoffMin, 0, 0)
    if (takeoffDate < blockOffDate) {
      takeoffDate.setDate(takeoffDate.getDate() + 1)
    }

    // Landing: if landing time < takeoff time AND duration <= 12 hours, landing is next day
    const landingDateSameDay = new Date(takeoffDate)
    landingDateSameDay.setHours(landingHour, landingMin, 0, 0)

    const landingDateNextDay = new Date(landingDateSameDay)
    landingDateNextDay.setDate(landingDateNextDay.getDate() + 1)

    let landingDate: Date
    if (landingDateSameDay < takeoffDate) {
      // Landing time is earlier than takeoff time - check if it should be next day
      const durationHours = (landingDateNextDay.getTime() - takeoffDate.getTime()) / (1000 * 60 * 60)
      if (durationHours <= 12) {
        landingDate = landingDateNextDay
      } else {
        // Duration > 12 hours, something is wrong - use same day anyway
        landingDate = landingDateSameDay
      }
    } else {
      landingDate = landingDateSameDay
    }

    // Block on: if block on time < landing time, block on is next day
    const blockOnDateSameDay = new Date(landingDate)
    blockOnDateSameDay.setHours(blockOnHour, blockOnMin, 0, 0)

    let blockOnDate: Date
    if (blockOnDateSameDay < landingDate) {
      blockOnDate = new Date(blockOnDateSameDay)
      blockOnDate.setDate(blockOnDate.getDate() + 1)
    } else {
      blockOnDate = blockOnDateSameDay
    }

    // Check if any dates differ from base date
    const hasDifferentDates =
      landingDate.toDateString() !== baseDate.toDateString() ||
      blockOnDate.toDateString() !== baseDate.toDateString()

    return {
      blockOff: blockOffDate,
      takeoff: takeoffDate,
      landing: landingDate,
      blockOn: blockOnDate,
      hasDifferentDates
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!pilotId || !flightDate || !blockOffTime || !takeoffTime || !landingTime || !blockOnTime) {
      toast.error('Please fill in all required fields')
      return
    }

    // Validate pilot/crew conflict
    if (additionalCrewId && additionalCrewId === pilotId) {
      toast.error('Additional crewmember cannot be the same as pilot')
      return
    }

    // Validate ICAO codes (must be exactly 4 characters if provided)
    if (icaoDeparture && icaoDeparture.length !== 4) {
      toast.error('ICAO Departure code must be exactly 4 characters')
      return
    }
    if (icaoDestination && icaoDestination.length !== 4) {
      toast.error('ICAO Destination code must be exactly 4 characters')
      return
    }

    // Calculate dates with smart next-day detection
    const dates = calculateDates()
    if (!dates) {
      toast.error('Unable to calculate flight dates')
      return
    }

    const { blockOff: blockOffDate, takeoff: takeoffDate, landing: landingDate, blockOn: blockOnDate } = dates

    // Chronological order: Block Off ≤ Takeoff ≤ Landing ≤ Block On
    if (takeoffDate < blockOffDate) {
      toast.error('Takeoff time must be after or at Block Off time')
      return
    }

    if (landingDate <= takeoffDate) {
      toast.error('Landing time must be after takeoff time (minimum 1 minute flight time)')
      return
    }

    // Check minimum 1 minute flight time
    const flightTimeMinutes = (landingDate.getTime() - takeoffDate.getTime()) / (1000 * 60)
    if (flightTimeMinutes < 1) {
      toast.error('Flight time must be at least 1 minute')
      return
    }

    if (blockOnDate < landingDate) {
      toast.error('Block On time must be after or at landing time')
      return
    }

    // Check for warnings (only for new entries, not edits)
    if (!isEditMode) {
      const warningCheck = await checkFlightWarnings(
        aircraftId,
        blockOffDate.toISOString(),
        blockOnDate.toISOString(),
        takeoffDate.toISOString(),
        landingDate.toISOString(),
        icaoDeparture || null,
        icaoDestination || null
      )

      if (warningCheck.error) {
        toast.error(`Warning check failed: ${warningCheck.error}`)
        return
      }

      if (warningCheck.data) {
        setFlightWarnings(warningCheck.data.warnings)
      }
    }

    // Store calculated dates and show confirmation modal
    setCalculatedDates(dates)
    setShowConfirmation(true)
    return
  }

  const handleConfirmAndCreate = async () => {
    if (!calculatedDates) return

    const { blockOff: blockOffDate, takeoff: takeoffDate, landing: landingDate, blockOn: blockOnDate } = calculatedDates

    setShowConfirmation(false)

    startTransition(async () => {
      let mbUrl: string | null = mAndBPdfUrl

      // Upload M&B file if a new file is selected
      if (mAndBFile) {
        setIsUploadingMB(true)
        const formData = new FormData()
        formData.append('file', mAndBFile)
        formData.append('planeId', aircraftId)
        if (isEditMode && existingEntry) {
          formData.append('flightlogId', existingEntry.id!)
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
        const result = await updateFlightlog(existingEntry.id!, {
          plane_id: aircraftId,
          pilot_id: pilotId,
          copilot_id: additionalCrewId || null,
          operation_type_id: operationTypeId || null,
          block_off: blockOffDate.toISOString(),
          takeoff_time: takeoffDate.toISOString(),
          landing_time: landingDate.toISOString(),
          block_on: blockOnDate.toISOString(),
          fuel: fuel ? parseFloat(fuel) : null,
          oil: oil ? parseFloat(oil) : null,
          landings: landings ? parseInt(landings) : 1,
          icao_departure: icaoDeparture.toUpperCase() || null,
          icao_destination: icaoDestination.toUpperCase() || null,
          m_and_b_pdf_url: mbUrl || null,
        })

        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success('Flightlog entry updated successfully')
          onOpenChange(false)
        }
      } else {
        const result = await createFlightlog(
          {
            plane_id: aircraftId,
            pilot_id: pilotId,
            copilot_id: additionalCrewId || null,
            operation_type_id: operationTypeId || null,
            block_off: blockOffDate.toISOString(),
            takeoff_time: takeoffDate.toISOString(),
            landing_time: landingDate.toISOString(),
            block_on: blockOnDate.toISOString(),
            fuel: fuel ? parseFloat(fuel) : null,
            oil: oil ? parseFloat(oil) : null,
            landings: landings ? parseInt(landings) : 1,
            icao_departure: icaoDeparture.toUpperCase() || null,
            icao_destination: icaoDestination.toUpperCase() || null,
            m_and_b_pdf_url: mbUrl || null,
          },
          flightWarnings.length > 0, // overrideWarnings
          flightWarnings // warnings
        )

        if (result.error) {
          toast.error(result.error)
        } else {
          if (flightWarnings.length > 0) {
            toast.success('Flightlog entry created successfully. Board members have been notified for review.')
          } else {
            toast.success('Flightlog entry created successfully')
          }
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

    const result = await deleteFlightlog(existingEntry.id!)

    setIsDeleting(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Flightlog entry deleted successfully')
      onOpenChange(false)
    }
  }

  const handleMarkAsReviewed = async () => {
    if (!existingEntry) return

    setIsMarkingReviewed(true)

    const result = await markFlightlogAsReviewed(existingEntry.id!)

    setIsMarkingReviewed(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Flight entry marked as reviewed')
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

          {/* Pilot Selection */}
          <PersonSelector
            context={PERSON_SELECTOR_CONTEXTS.PILOT_IN_COMMAND}
            value={pilotId}
            onChange={(userId) => setPilotId(userId || currentUserId)}
            label="Pilot"
            placeholder="Select pilot..."
            required
            disabled={isPending || (isEditMode && !canEdit)}
          />

          {/* Additional Crewmember Selection */}
          <div className="space-y-2">
            <PersonSelector
              context={PERSON_SELECTOR_CONTEXTS.COPILOT}
              value={additionalCrewId}
              onChange={(userId) => setAdditionalCrewId(userId || '')}
              label="Additional Crewmember (Optional)"
              placeholder="None"
              disabled={isPending || (isEditMode && !canEdit)}
            />
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

          {/* ICAO Departure and Destination */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="icao-departure">
                ICAO Departure
              </Label>
              <Input
                id="icao-departure"
                type="text"
                value={icaoDeparture}
                onChange={(e) => setIcaoDeparture(e.target.value.toUpperCase())}
                disabled={isPending || (isEditMode && !canEdit)}
                placeholder="LSZB"
                maxLength={4}
                className="uppercase font-mono"
              />
              <p className="text-xs text-muted-foreground">
                4-letter ICAO code
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="icao-destination">
                ICAO Destination
              </Label>
              <Input
                id="icao-destination"
                type="text"
                value={icaoDestination}
                onChange={(e) => setIcaoDestination(e.target.value.toUpperCase())}
                disabled={isPending || (isEditMode && !canEdit)}
                placeholder="LSZH"
                maxLength={4}
                className="uppercase font-mono"
              />
              <p className="text-xs text-muted-foreground">
                4-letter ICAO code
              </p>
            </div>
          </div>

          {/* Flight Date */}
          <div className="space-y-2">
            <Label htmlFor="flight-date">
              <Clock className="inline h-4 w-4 mr-1" />
              Flight Date *
            </Label>
            <Input
              id="flight-date"
              type="date"
              value={flightDate}
              onChange={(e) => setFlightDate(e.target.value)}
              disabled={isPending || (isEditMode && !canEdit)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Block Off will always be on this date. Landing/Block On dates are calculated automatically for overnight flights.
            </p>
          </div>

          {/* Time Fields - Block Off, Takeoff, Landing, Block On */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="block-off">
                <Clock className="inline h-4 w-4 mr-1" />
                Block Off Time *
              </Label>
              <Input
                id="block-off"
                type="time"
                value={blockOffTime}
                onChange={(e) => setBlockOffTime(e.target.value)}
                disabled={isPending || (isEditMode && !canEdit)}
                required
                className="[&::-webkit-calendar-picker-indicator]:hidden"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="takeoff">
                <Clock className="inline h-4 w-4 mr-1" />
                Takeoff Time *
              </Label>
              <Input
                id="takeoff"
                type="time"
                value={takeoffTime}
                onChange={(e) => setTakeoffTime(e.target.value)}
                disabled={isPending || (isEditMode && !canEdit)}
                required
                className="[&::-webkit-calendar-picker-indicator]:hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="landing">
                <Clock className="inline h-4 w-4 mr-1" />
                Landing Time *
              </Label>
              <Input
                id="landing"
                type="time"
                value={landingTime}
                onChange={(e) => setLandingTime(e.target.value)}
                disabled={isPending || (isEditMode && !canEdit)}
                required
                className="[&::-webkit-calendar-picker-indicator]:hidden"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="block-on">
                <Clock className="inline h-4 w-4 mr-1" />
                Block On Time *
              </Label>
              <Input
                id="block-on"
                type="time"
                value={blockOnTime}
                onChange={(e) => setBlockOnTime(e.target.value)}
                disabled={isPending || (isEditMode && !canEdit)}
                required
                className="[&::-webkit-calendar-picker-indicator]:hidden"
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
              <div className="flex gap-2 flex-wrap">
                {existingEntry.needs_board_review && (
                  <Badge variant="destructive">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    Needs Review
                  </Badge>
                )}
                {existingEntry.locked && (
                  <Badge variant="secondary">
                    <Lock className="mr-1 h-3 w-3" />
                    Locked
                  </Badge>
                )}
                {existingEntry.charged && (
                  <Badge variant="default">Charged</Badge>
                )}
                {!existingEntry.locked && !existingEntry.charged && !existingEntry.needs_board_review && (
                  <Badge variant="outline">Editable</Badge>
                )}
              </div>
              {isBoardMember && existingEntry.needs_board_review && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAsReviewed}
                  disabled={isMarkingReviewed || isPending || isDeleting}
                  className="w-full"
                >
                  {isMarkingReviewed ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Marking as Reviewed...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark as Reviewed
                    </>
                  )}
                </Button>
              )}
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
                disabled={isPending || isDeleting || isMarkingReviewed}
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
              disabled={isPending || isDeleting || isMarkingReviewed}
            >
              Cancel
            </Button>
            {(!isEditMode || canEdit) && (
              <Button type="submit" disabled={isPending || isDeleting || isUploadingMB || isMarkingReviewed || !isFormValid}>
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

      {/* Confirmation Modal */}
      {showConfirmation && calculatedDates && (
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Confirm Flight Entry</DialogTitle>
            <DialogDescription>
              Please review the flight details before creating the entry
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Warning for different dates */}
            {calculatedDates.hasDifferentDates && (
              <Alert variant="default" className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-800" />
                <AlertTitle className="text-orange-800">CAREFUL - Different dates detected</AlertTitle>
                <AlertDescription className="text-orange-700">
                  This flight crosses midnight. Please verify the dates below are correct.
                </AlertDescription>
              </Alert>
            )}

            {/* Flight warnings */}
            {flightWarnings.length > 0 && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-800" />
                <AlertTitle className="text-red-800">Flight Warnings Detected</AlertTitle>
                <AlertDescription className="text-red-700 space-y-1">
                  {flightWarnings.map((warning, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className="mt-0.5">•</span>
                      <span>{warning.message}</span>
                    </div>
                  ))}
                  <p className="mt-2 text-sm font-medium">
                    By continuing, this entry will be flagged for board review and all board members will be notified.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* Flight Summary */}
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="font-medium">Aircraft:</div>
                <div>{aircraft.tail_number} - {aircraft.type}</div>

                <div className="font-medium">Route:</div>
                <div className="font-mono">{icaoDeparture} → {icaoDestination}</div>

                <div className="font-medium">Pilot:</div>
                <div>
                  {users.find(u => u.id === pilotId)?.name} {users.find(u => u.id === pilotId)?.surname}
                </div>

                {additionalCrewId && (
                  <>
                    <div className="font-medium">Additional Crew:</div>
                    <div>
                      {users.find(u => u.id === additionalCrewId)?.name} {users.find(u => u.id === additionalCrewId)?.surname}
                    </div>
                  </>
                )}
              </div>

              <div className="border-t pt-3 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="font-medium">Block Off:</div>
                  <div className="font-mono">
                    {format(calculatedDates.blockOff, 'dd.MM.yyyy')} - {format(calculatedDates.blockOff, 'HH:mm')}
                  </div>

                  <div className="font-medium">Takeoff:</div>
                  <div className="font-mono">
                    {format(calculatedDates.takeoff, 'dd.MM.yyyy')} - {format(calculatedDates.takeoff, 'HH:mm')}
                  </div>

                  <div className="font-medium">Landing:</div>
                  <div className={`font-mono ${calculatedDates.landing.toDateString() !== calculatedDates.blockOff.toDateString() ? 'text-orange-600 font-semibold' : ''}`}>
                    {format(calculatedDates.landing, 'dd.MM.yyyy')} - {format(calculatedDates.landing, 'HH:mm')}
                  </div>

                  <div className="font-medium">Block On:</div>
                  <div className={`font-mono ${calculatedDates.blockOn.toDateString() !== calculatedDates.blockOff.toDateString() ? 'text-orange-600 font-semibold' : ''}`}>
                    {format(calculatedDates.blockOn, 'dd.MM.yyyy')} - {format(calculatedDates.blockOn, 'HH:mm')}
                  </div>
                </div>

                <div className="border-t pt-2 grid grid-cols-2 gap-2 text-sm">
                  <div className="font-medium">Flight Time:</div>
                  <div className="font-mono">
                    {(() => {
                      const totalMinutes = Math.floor((calculatedDates.landing.getTime() - calculatedDates.takeoff.getTime()) / (1000 * 60))
                      const hours = Math.floor(totalMinutes / 60)
                      const minutes = totalMinutes % 60
                      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
                    })()}
                  </div>

                  <div className="font-medium">Block Time:</div>
                  <div className="font-mono">
                    {(() => {
                      const totalMinutes = Math.floor((calculatedDates.blockOn.getTime() - calculatedDates.blockOff.getTime()) / (1000 * 60))
                      const hours = Math.floor(totalMinutes / 60)
                      const minutes = totalMinutes % 60
                      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowConfirmation(false)}
              disabled={isPending || isUploadingMB}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmAndCreate}
              disabled={isPending || isUploadingMB}
            >
              {isPending || isUploadingMB ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isUploadingMB ? 'Uploading...' : isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>{isEditMode ? 'Update Entry' : 'Create Entry'}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  )
}
