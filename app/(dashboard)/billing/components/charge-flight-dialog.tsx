'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { format } from 'date-fns'
import { Loader2, AlertCircle, User, Building2 } from 'lucide-react'
import { chargeFlightToUser, chargeFlightToCostCenter } from '@/lib/actions/billing'
import type { UnchargedFlight, CostCenter } from '@/lib/database.types'

interface ChargeFlightDialogProps {
  flight: UnchargedFlight
  costCenters: CostCenter[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChargeFlightDialog({ flight, costCenters, open, onOpenChange }: ChargeFlightDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [chargeType, setChargeType] = useState<'user' | 'cost_center'>(
    flight.default_cost_center_id ? 'cost_center' : 'user'
  )
  const [selectedCostCenterId, setSelectedCostCenterId] = useState<string>(
    flight.default_cost_center_id || ''
  )
  const [description, setDescription] = useState(
    `Flight ${flight.tail_number} on ${flight.block_off ? format(new Date(flight.block_off), 'dd.MM.yyyy') : ''}`
  )

  const formatDuration = (hours: number | null) => {
    if (!hours) return '-'
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return `${h}:${m.toString().padStart(2, '0')}`
  }

  const handleSubmit = async () => {
    if (!flight.id || !flight.pilot_id) {
      setError('Invalid flight data')
      return
    }

    setError(null)

    startTransition(async () => {
      let result

      if (chargeType === 'user') {
        result = await chargeFlightToUser({
          flightlogId: flight.id!,
          userId: flight.pilot_id!,
          amount: flight.calculated_amount || 0,
          description,
        })
      } else {
        if (!selectedCostCenterId) {
          setError('Please select a cost center')
          return
        }
        result = await chargeFlightToCostCenter({
          flightlogId: flight.id!,
          costCenterId: selectedCostCenterId,
          amount: flight.calculated_amount || 0,
          description,
        })
      }

      if (result.success) {
        onOpenChange(false)
        router.refresh()
      } else {
        setError(result.error || 'Failed to charge flight')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Charge Flight</DialogTitle>
          <DialogDescription>
            Charge this flight to a user account or cost center
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Flight Details */}
          <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Date:</span>
                <span className="ml-2 font-medium">
                  {flight.block_off ? format(new Date(flight.block_off), 'dd.MM.yyyy') : '-'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Aircraft:</span>
                <span className="ml-2 font-medium">{flight.tail_number}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Pilot:</span>
                <span className="ml-2 font-medium">
                  {flight.pilot_name} {flight.pilot_surname}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Operation:</span>
                <span className="ml-2 font-medium">{flight.operation_type_name || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Flight Time:</span>
                <span className="ml-2 font-medium font-mono">
                  {formatDuration(flight.flight_time_hours)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Rate:</span>
                <span className="ml-2 font-medium">
                  € {(flight.operation_rate || flight.plane_default_rate || 0).toFixed(2)}/{flight.billing_unit === 'minute' ? 'min' : 'hr'}
                </span>
              </div>
            </div>
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">
                  {formatDuration(flight.flight_time_hours)} × € {(flight.operation_rate || flight.plane_default_rate || 0).toFixed(2)}/{flight.billing_unit === 'minute' ? 'min' : 'hr'}
                </span>
                <span className="font-bold text-lg">
                  € {(flight.calculated_amount || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Charge Type Selection */}
          <div className="space-y-3">
            <Label>Charge To</Label>
            <RadioGroup value={chargeType} onValueChange={(value) => setChargeType(value as 'user' | 'cost_center')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="user" id="user" />
                <Label htmlFor="user" className="flex items-center gap-2 font-normal cursor-pointer">
                  <User className="h-4 w-4" />
                  User Account ({flight.pilot_name} {flight.pilot_surname})
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cost_center" id="cost_center" />
                <Label htmlFor="cost_center" className="flex items-center gap-2 font-normal cursor-pointer">
                  <Building2 className="h-4 w-4" />
                  Cost Center
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Cost Center Selection */}
          {chargeType === 'cost_center' && (
            <div className="space-y-2">
              <Label htmlFor="cost-center">Cost Center</Label>
              <Select value={selectedCostCenterId} onValueChange={setSelectedCostCenterId}>
                <SelectTrigger id="cost-center">
                  <SelectValue placeholder="Select cost center" />
                </SelectTrigger>
                <SelectContent>
                  {costCenters.map((cc) => (
                    <SelectItem key={cc.id} value={cc.id}>
                      {cc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter transaction description"
              rows={2}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Charge Flight
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
