'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { createStation, updateStation } from '@/lib/actions/weight-balance'
import { toast } from 'sonner'

interface Station {
  id: string
  name: string
  station_type: 'seat' | 'cargo' | 'fuel' | 'aircraft_item'
  arm: number
  weight_limit: number
  basic_weight: number
  sort_order: number
  active: boolean
  notes: string | null
}

interface StationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  station: Station | null
  planeId: string
  massUnit?: 'kg' | 'lbs'
  onSuccess: () => void
}

export function StationDialog({
  open,
  onOpenChange,
  station,
  planeId,
  massUnit = 'kg',
  onSuccess,
}: StationDialogProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [name, setName] = useState('')
  const [stationType, setStationType] = useState<'seat' | 'cargo' | 'fuel' | 'aircraft_item'>('seat')
  const [arm, setArm] = useState('')
  const [weightLimit, setWeightLimit] = useState('')
  const [basicWeight, setBasicWeight] = useState('')
  const [active, setActive] = useState(true)
  const [notes, setNotes] = useState('')

  const isEditing = station?.id !== ''

  // Reset form when dialog opens with new data
  useEffect(() => {
    if (open && station) {
      setName(station.name || '')
      setStationType(station.station_type || 'seat')
      setArm(station.arm?.toString() || '')
      setWeightLimit(station.weight_limit?.toString() || '')
      setBasicWeight(station.basic_weight?.toString() || '0')
      setActive(station.active ?? true)
      setNotes(station.notes || '')
    }
  }, [open, station])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    // Validate inputs
    if (!name.trim()) {
      toast.error('Please enter a station name')
      setIsSaving(false)
      return
    }

    const armValue = parseFloat(arm)
    const weightLimitValue = parseFloat(weightLimit)
    const basicWeightValue = parseFloat(basicWeight)

    if (isNaN(armValue)) {
      toast.error('Please enter a valid arm value')
      setIsSaving(false)
      return
    }

    if (isNaN(weightLimitValue) || weightLimitValue < 0) {
      toast.error('Please enter a valid weight limit (must be >= 0)')
      setIsSaving(false)
      return
    }

    if (isNaN(basicWeightValue) || basicWeightValue < 0) {
      toast.error('Please enter a valid basic weight (must be >= 0)')
      setIsSaving(false)
      return
    }

    if (!station) {
      toast.error('Invalid station data')
      setIsSaving(false)
      return
    }

    try {
      let result

      if (isEditing) {
        // Update existing station
        result = await updateStation({
          id: station.id,
          name: name.trim(),
          station_type: stationType,
          arm: armValue,
          weight_limit: weightLimitValue,
          basic_weight: basicWeightValue,
          active,
          notes: notes.trim() || undefined,
        })
      } else {
        // Create new station
        result = await createStation({
          plane_id: planeId,
          name: name.trim(),
          station_type: stationType,
          arm: armValue,
          weight_limit: weightLimitValue,
          basic_weight: basicWeightValue,
          sort_order: station.sort_order,
          notes: notes.trim() || undefined,
        })
      }

      if (result.success) {
        toast.success(isEditing ? 'Station updated' : 'Station created')
        onSuccess()
      } else {
        toast.error(result.error || 'Failed to save station')
      }
    } catch (error) {
      console.error('Error saving station:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  const getStationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      seat: 'Seat',
      cargo: 'Cargo',
      fuel: 'Fuel',
      aircraft_item: 'Aircraft Item',
    }
    return labels[type] || type
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit Loading Station' : 'Add Loading Station'}
            </DialogTitle>
            <DialogDescription>
              Define a weight and balance loading station for this aircraft.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            {/* Station Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">
                Station Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Pilot Seat, Front Baggage"
                required
                disabled={isSaving}
              />
            </div>

            {/* Station Type */}
            <div className="grid gap-2">
              <Label htmlFor="station-type">
                Station Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={stationType}
                onValueChange={(value) => setStationType(value as typeof stationType)}
                disabled={isSaving}
              >
                <SelectTrigger id="station-type">
                  <SelectValue placeholder="Select station type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="seat">{getStationTypeLabel('seat')}</SelectItem>
                  <SelectItem value="cargo">{getStationTypeLabel('cargo')}</SelectItem>
                  <SelectItem value="fuel">{getStationTypeLabel('fuel')}</SelectItem>
                  <SelectItem value="aircraft_item">{getStationTypeLabel('aircraft_item')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Arm */}
            <div className="grid gap-2">
              <Label htmlFor="arm">
                Arm (position) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="arm"
                type="number"
                step="0.01"
                value={arm}
                onChange={(e) => setArm(e.target.value)}
                placeholder="e.g., 2.15"
                required
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">
                Station arm position from datum point
              </p>
            </div>

            {/* Weight Limit */}
            <div className="grid gap-2">
              <Label htmlFor="weight-limit">
                Weight Limit ({massUnit}) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="weight-limit"
                type="number"
                step="0.01"
                min="0"
                value={weightLimit}
                onChange={(e) => setWeightLimit(e.target.value)}
                placeholder="e.g., 100"
                required
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">
                Maximum weight allowed at this station
              </p>
            </div>

            {/* Basic Weight (BOW) */}
            <div className="grid gap-2">
              <Label htmlFor="basic-weight">
                Basic Operating Weight ({massUnit}) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="basic-weight"
                type="number"
                step="0.01"
                min="0"
                value={basicWeight}
                onChange={(e) => setBasicWeight(e.target.value)}
                placeholder="e.g., 0"
                required
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">
                Weight of the item itself (e.g., seat weight). Use 0 for loading stations.
              </p>
            </div>

            {/* Active Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="active"
                checked={active}
                onCheckedChange={(checked) => setActive(checked as boolean)}
                disabled={isSaving}
              />
              <Label
                htmlFor="active"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Active (include in W&B calculations)
              </Label>
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional information about this station..."
                rows={3}
                disabled={isSaving}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
