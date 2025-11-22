'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createAircraft, updateAircraft } from '../actions'
import type { Plane, PlaneInsert } from '@/lib/database.types'
import { useRouter } from 'next/navigation'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { Switch } from '@/components/ui/switch'

interface AircraftFormProps {
  aircraft?: Plane
  onSuccess?: () => void
}

export function AircraftForm({ aircraft, onSuccess }: AircraftFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [massUnit, setMassUnit] = useState<'kg' | 'lbs'>(aircraft?.mass_unit || 'kg')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)

    // Parse arrays
    const navEquipment = formData.get('nav_equipment') as string
    const navEquipmentArray = navEquipment
      ? navEquipment.split(',').map((item) => item.trim())
      : []

    // Parse initial flight hours from HH:MM format
    const initialFlightHoursStr = formData.get('initial_flight_hours') as string
    let initialFlightHours = 0
    if (initialFlightHoursStr) {
      const match = initialFlightHoursStr.match(/^(\d+):([0-5][0-9])$/)
      if (match) {
        const hours = parseInt(match[1])
        const minutes = parseInt(match[2])
        initialFlightHours = hours + (minutes / 60)
      } else {
        setError('Invalid format for Initial Flight Hours. Use HH:MM format (e.g., 1250:30)')
        return
      }
    }

    const aircraftData: PlaneInsert = {
      tail_number: formData.get('tail_number') as string,
      type: formData.get('type') as string,
      color: formData.get('color') as string || null,
      max_fuel: parseFloat(formData.get('max_fuel') as string) || null,
      fuel_consumption: parseFloat(formData.get('fuel_consumption') as string) || null,
      max_mass: parseFloat(formData.get('max_mass') as string) || null,
      nav_equipment: navEquipmentArray,
      xdpr_equipment: formData.get('xdpr_equipment') as string || null,
      emer_equipment: formData.get('emer_equipment') as string || null,
      mass_unit: massUnit,
      active: formData.get('active') === 'on',
      initial_flight_hours: initialFlightHours,
      initial_landings: parseInt(formData.get('initial_landings') as string) || 0,
    }

    startTransition(async () => {
      const result = aircraft
        ? await updateAircraft(aircraft.id, aircraftData)
        : await createAircraft(aircraftData)

      if (result.error) {
        setError(result.error)
      } else {
        router.refresh()
        onSuccess?.()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="tail_number">Tail Number *</Label>
          <Input
            id="tail_number"
            name="tail_number"
            defaultValue={aircraft?.tail_number}
            required
            placeholder="e.g., N12345"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Type *</Label>
          <Input
            id="type"
            name="type"
            defaultValue={aircraft?.type}
            required
            placeholder="e.g., Cessna 172"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="color">Color</Label>
          <Input
            id="color"
            name="color"
            defaultValue={aircraft?.color || ''}
            placeholder="e.g., White/Blue"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="mass_unit">Mass Unit</Label>
          <Select value={massUnit} onValueChange={(value: 'kg' | 'lbs') => setMassUnit(value)} disabled={!!aircraft}>
            <SelectTrigger id="mass_unit">
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kg">Kilograms (kg)</SelectItem>
              <SelectItem value="lbs">Pounds (lbs)</SelectItem>
            </SelectContent>
          </Select>
          {aircraft && (
            <p className="text-xs text-muted-foreground">
              Unit can be changed in the Weight & Balance tab
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="max_mass">Max. T/O Mass - MTOM ({massUnit})</Label>
          <Input
            id="max_mass"
            name="max_mass"
            type="number"
            step="0.01"
            defaultValue={aircraft?.max_mass || ''}
            placeholder="e.g., 1100"
          />
          <p className="text-xs text-muted-foreground">
            Maximum Takeoff Mass
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="max_fuel">Max Fuel (L)</Label>
          <Input
            id="max_fuel"
            name="max_fuel"
            type="number"
            step="0.01"
            defaultValue={aircraft?.max_fuel || ''}
            placeholder="e.g., 200"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fuel_consumption">Fuel Consumption (L/h)</Label>
          <Input
            id="fuel_consumption"
            name="fuel_consumption"
            type="number"
            step="0.01"
            defaultValue={aircraft?.fuel_consumption || ''}
            placeholder="e.g., 35"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="xdpr_equipment">XPDR Equipment</Label>
          <Input
            id="xdpr_equipment"
            name="xdpr_equipment"
            defaultValue={aircraft?.xdpr_equipment || ''}
            placeholder="e.g., Mode S"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="initial_flight_hours">Initial Flight Hours (HH:MM)</Label>
          <Input
            id="initial_flight_hours"
            name="initial_flight_hours"
            type="text"
            pattern="[0-9]+:[0-5][0-9]"
            defaultValue={
              aircraft?.initial_flight_hours
                ? `${Math.floor(aircraft.initial_flight_hours)}:${Math.round((aircraft.initial_flight_hours % 1) * 60).toString().padStart(2, '0')}`
                : '0:00'
            }
            placeholder="e.g., 1250:30"
          />
          <p className="text-xs text-muted-foreground">
            For aircraft that were not brand new when added to the system
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="initial_landings">Initial Landings</Label>
          <Input
            id="initial_landings"
            name="initial_landings"
            type="number"
            min="0"
            defaultValue={aircraft?.initial_landings || '0'}
            placeholder="e.g., 450"
          />
          <p className="text-xs text-muted-foreground">
            For aircraft that were not brand new when added to the system
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="nav_equipment">Nav Equipment (comma-separated)</Label>
        <Input
          id="nav_equipment"
          name="nav_equipment"
          defaultValue={aircraft?.nav_equipment?.join(', ') || ''}
          placeholder="e.g., GPS, VOR, ADF"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="emer_equipment">Emergency Equipment</Label>
        <Input
          id="emer_equipment"
          name="emer_equipment"
          defaultValue={aircraft?.emer_equipment || ''}
          placeholder="e.g., Life jackets, ELT"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch id="active" name="active" defaultChecked={aircraft?.active ?? true} />
        <Label htmlFor="active">Active</Label>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : aircraft ? 'Update Aircraft' : 'Add Aircraft'}
        </Button>
      </div>
    </form>
  )
}
