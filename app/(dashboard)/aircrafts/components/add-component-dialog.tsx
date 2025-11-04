'use client'

import { useState, useTransition, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, Sparkles } from 'lucide-react'
import { addComponent, getTBOPresets } from '@/lib/actions/aircraft-components'
import { toast } from 'sonner'
import { format } from 'date-fns'

type ComponentType = 'engine' | 'propeller' | 'landing_gear' | 'constant_speed_unit' | 'magneto' | 'vacuum_pump' | 'alternator' | 'starter' | 'other'

interface TBOPreset {
  id: string
  component_type: ComponentType
  manufacturer: string | null
  model: string | null
  default_tbo_hours: number
  description: string | null
  is_common: boolean | null
}

interface AddComponentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  aircraftId: string
  aircraftTailNumber: string
  currentAircraftHours: number
}

const COMPONENT_TYPES: { value: ComponentType; label: string }[] = [
  { value: 'engine', label: 'Engine' },
  { value: 'propeller', label: 'Propeller' },
  { value: 'landing_gear', label: 'Landing Gear' },
  { value: 'constant_speed_unit', label: 'Constant Speed Unit' },
  { value: 'magneto', label: 'Magneto' },
  { value: 'vacuum_pump', label: 'Vacuum Pump' },
  { value: 'alternator', label: 'Alternator' },
  { value: 'starter', label: 'Starter' },
  { value: 'other', label: 'Other' },
]

export function AddComponentDialog({
  open,
  onOpenChange,
  onSuccess,
  aircraftId,
  aircraftTailNumber,
  currentAircraftHours,
}: AddComponentDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Form fields
  const [componentType, setComponentType] = useState<ComponentType>('engine')
  const [position, setPosition] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [manufacturer, setManufacturer] = useState('')
  const [model, setModel] = useState('')
  const [partNumber, setPartNumber] = useState('')
  const [tboHours, setTboHours] = useState('')
  const [hoursAtInstallation, setHoursAtInstallation] = useState(currentAircraftHours.toString())
  const [componentHoursOffset, setComponentHoursOffset] = useState('0')
  const [installedAt, setInstalledAt] = useState(format(new Date(), "yyyy-MM-dd"))
  const [notes, setNotes] = useState('')

  // TBO Presets
  const [presets, setPresets] = useState<TBOPreset[]>([])
  const [selectedPreset, setSelectedPreset] = useState<string>('')
  const [loadingPresets, setLoadingPresets] = useState(false)

  // Load TBO presets when component type changes
  useEffect(() => {
    async function loadPresets() {
      if (!componentType) return

      setLoadingPresets(true)
      const result = await getTBOPresets(componentType)

      if (result.success && result.data) {
        setPresets(result.data as TBOPreset[])
      }
      setLoadingPresets(false)
    }

    loadPresets()
    setSelectedPreset('') // Reset preset selection
  }, [componentType])

  // Apply preset when selected
  useEffect(() => {
    if (!selectedPreset) return

    const preset = presets.find(p => p.id === selectedPreset)
    if (preset) {
      setManufacturer(preset.manufacturer || '')
      setModel(preset.model || '')
      setTboHours(preset.default_tbo_hours.toString())
    }
  }, [selectedPreset, presets])

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setComponentType('engine')
      setPosition('')
      setSerialNumber('')
      setManufacturer('')
      setModel('')
      setPartNumber('')
      setTboHours('')
      setHoursAtInstallation(currentAircraftHours.toString())
      setComponentHoursOffset('0')
      setInstalledAt(format(new Date(), "yyyy-MM-dd"))
      setNotes('')
      setSelectedPreset('')
      setError(null)
    }
  }, [open, currentAircraftHours])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!tboHours || parseFloat(tboHours) <= 0) {
      setError('TBO hours must be greater than 0')
      return
    }

    const hoursAtInstall = parseFloat(hoursAtInstallation)
    if (isNaN(hoursAtInstall) || hoursAtInstall < 0) {
      setError('Aircraft hours at installation must be a valid number')
      return
    }

    const offsetHours = parseFloat(componentHoursOffset)
    if (isNaN(offsetHours) || offsetHours < 0) {
      setError('Component hours offset must be a valid number')
      return
    }

    startTransition(async () => {
      const result = await addComponent({
        planeId: aircraftId,
        componentType,
        position: position || null,
        serialNumber: serialNumber || null,
        manufacturer: manufacturer || null,
        model: model || null,
        partNumber: partNumber || null,
        tboHours: parseFloat(tboHours),
        hoursAtInstallation: hoursAtInstall,
        componentHoursOffset: offsetHours,
        installedAt: new Date(installedAt).toISOString(),
        notes: notes || null,
      })

      if (result.success) {
        toast.success('Component added successfully')
        onOpenChange(false)
        onSuccess?.()
      } else {
        setError(result.error || 'Failed to add component')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Component</DialogTitle>
          <DialogDescription>
            Add a life-limited component to track TBO for {aircraftTailNumber}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Component Type */}
          <div className="space-y-2">
            <Label htmlFor="componentType">Component Type *</Label>
            <Select value={componentType} onValueChange={(value) => setComponentType(value as ComponentType)}>
              <SelectTrigger id="componentType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMPONENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* TBO Preset Selector */}
          {presets.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="preset">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-500" />
                  Quick Select (Optional)
                </div>
              </Label>
              <Select value={selectedPreset} onValueChange={setSelectedPreset}>
                <SelectTrigger id="preset">
                  <SelectValue placeholder="Select a preset to auto-fill..." />
                </SelectTrigger>
                <SelectContent>
                  {presets.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.manufacturer} {preset.model} - {preset.default_tbo_hours}h TBO
                      {preset.is_common && ' ⭐'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select a preset to automatically fill manufacturer, model, and TBO hours
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Position */}
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="e.g., Left, Right, 1, 2"
              />
              <p className="text-xs text-muted-foreground">
                For multi-component setups
              </p>
            </div>

            {/* Serial Number */}
            <div className="space-y-2">
              <Label htmlFor="serialNumber">Serial Number</Label>
              <Input
                id="serialNumber"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="Component S/N"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Manufacturer */}
            <div className="space-y-2">
              <Label htmlFor="manufacturer">Manufacturer</Label>
              <Input
                id="manufacturer"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="e.g., Lycoming"
              />
            </div>

            {/* Model */}
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g., O-360"
              />
            </div>
          </div>

          {/* Part Number */}
          <div className="space-y-2">
            <Label htmlFor="partNumber">Part Number</Label>
            <Input
              id="partNumber"
              value={partNumber}
              onChange={(e) => setPartNumber(e.target.value)}
              placeholder="Optional"
            />
          </div>

          {/* TBO Hours */}
          <div className="space-y-2">
            <Label htmlFor="tboHours">TBO Hours *</Label>
            <Input
              id="tboHours"
              type="number"
              step="0.1"
              min="0"
              value={tboHours}
              onChange={(e) => setTboHours(e.target.value)}
              placeholder="e.g., 2000"
              required
            />
            <p className="text-xs text-muted-foreground">
              Time Between Overhaul in hours
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Aircraft Hours at Installation */}
            <div className="space-y-2">
              <Label htmlFor="hoursAtInstallation">Aircraft Hours at Installation *</Label>
              <Input
                id="hoursAtInstallation"
                type="number"
                step="0.1"
                min="0"
                value={hoursAtInstallation}
                onChange={(e) => setHoursAtInstallation(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Current: {currentAircraftHours.toFixed(1)}h
              </p>
            </div>

            {/* Component Hours Offset */}
            <div className="space-y-2">
              <Label htmlFor="componentHoursOffset">Component Hours (if used) *</Label>
              <Input
                id="componentHoursOffset"
                type="number"
                step="0.1"
                min="0"
                value={componentHoursOffset}
                onChange={(e) => setComponentHoursOffset(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                0 for new component
              </p>
            </div>
          </div>

          {/* Installation Date */}
          <div className="space-y-2">
            <Label htmlFor="installedAt">Installation Date *</Label>
            <Input
              id="installedAt"
              type="date"
              value={installedAt}
              onChange={(e) => setInstalledAt(e.target.value)}
              required
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this component..."
              rows={3}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Component
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
