'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)

    // Parse arrays
    const navEquipment = formData.get('nav_equipment') as string
    const navEquipmentArray = navEquipment
      ? navEquipment.split(',').map((item) => item.trim())
      : []

    // Parse CG Limits (JSON)
    const cgLimitsStr = formData.get('cg_limits') as string
    let cgLimits = null
    if (cgLimitsStr) {
      try {
        cgLimits = JSON.parse(cgLimitsStr)
      } catch {
        setError('Invalid JSON format for CG Limits')
        return
      }
    }

    const aircraftData: PlaneInsert = {
      tail_number: formData.get('tail_number') as string,
      type: formData.get('type') as string,
      color: formData.get('color') as string || null,
      empty_weight: parseFloat(formData.get('empty_weight') as string) || null,
      max_fuel: parseFloat(formData.get('max_fuel') as string) || null,
      fuel_consumption: parseFloat(formData.get('fuel_consumption') as string) || null,
      max_mass: parseFloat(formData.get('max_mass') as string) || null,
      nav_equipment: navEquipmentArray,
      xdpr_equipment: formData.get('xdpr_equipment') as string || null,
      emer_equipment: formData.get('emer_equipment') as string || null,
      cg_limits: cgLimits,
      active: formData.get('active') === 'on',
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
          <Label htmlFor="empty_weight">Empty Weight (kg)</Label>
          <Input
            id="empty_weight"
            name="empty_weight"
            type="number"
            step="0.01"
            defaultValue={aircraft?.empty_weight || ''}
            placeholder="e.g., 750"
          />
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
          <Label htmlFor="max_mass">Max Mass (kg)</Label>
          <Input
            id="max_mass"
            name="max_mass"
            type="number"
            step="0.01"
            defaultValue={aircraft?.max_mass || ''}
            placeholder="e.g., 1100"
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

      <div className="space-y-2">
        <Label htmlFor="cg_limits">CG Limits (JSON format)</Label>
        <Textarea
          id="cg_limits"
          name="cg_limits"
          defaultValue={aircraft?.cg_limits ? JSON.stringify(aircraft.cg_limits, null, 2) : ''}
          placeholder='{"forward": 0.15, "aft": 0.35, "arms": []}'
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          Enter CG limits in JSON format. Example: {`{"forward": 0.15, "aft": 0.35}`}
        </p>
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
