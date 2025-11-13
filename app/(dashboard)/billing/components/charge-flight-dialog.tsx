'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { format } from 'date-fns'
import { Loader2, AlertCircle, User, Building2, Check, ChevronsUpDown, X, Plus, MessageSquare } from 'lucide-react'
import { chargeFlightToUser, chargeFlightToCostCenter, splitChargeFlight } from '@/lib/actions/billing'
import { calculateAirportFeesForFlight } from '@/lib/actions/airport-fees'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { UnchargedFlight, CostCenter, UserBalance } from '@/lib/database.types'

type SplitTarget = {
  id: string
  type: 'user' | 'cost_center'
  targetId: string
  targetName: string
  percentage: number
  description: string
  isDescriptionOverridden: boolean
}

type SplitMode = 'percentage' | 'time'
type AirportFeeAllocation = 'split_equally' | 'assign_to_target'

interface ChargeFlightDialogProps {
  flight: UnchargedFlight
  costCenters: CostCenter[]
  userBalances: UserBalance[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChargeFlightDialog({ flight, costCenters, userBalances, open, onOpenChange }: ChargeFlightDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [isSplitCost, setIsSplitCost] = useState(false)
  const [chargeType, setChargeType] = useState<'user' | 'cost_center'>(
    flight.default_cost_center_id ? 'cost_center' : 'user'
  )
  const [selectedUserId, setSelectedUserId] = useState<string>(flight.pilot_id || '')
  const [userSelectorOpen, setUserSelectorOpen] = useState(false)
  const [selectedCostCenterId, setSelectedCostCenterId] = useState<string>(
    flight.default_cost_center_id || ''
  )
  const [description, setDescription] = useState('')
  const [splitTargets, setSplitTargets] = useState<SplitTarget[]>([])
  const [splitMode, setSplitMode] = useState<SplitMode>('percentage')
  const [includeAirportFees, setIncludeAirportFees] = useState(true)
  const [airportFeeAllocation, setAirportFeeAllocation] = useState<AirportFeeAllocation>('split_equally')
  const [airportFeeTargetId, setAirportFeeTargetId] = useState<string>('')
  const [airportFeesBreakdown, setAirportFeesBreakdown] = useState<{
    fees: Array<{ airport: string; icao_code: string; fee_type: string; amount: number }>
    totalAmount: number
  } | null>(null)
  const [useCustomRate, setUseCustomRate] = useState(false)
  const [customRate, setCustomRate] = useState<string>('')

  // Helper function to format flight time
  const formatFlightTime = (hours: number | null) => {
    if (!hours || hours <= 0) return ''
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return `${h}:${m.toString().padStart(2, '0')}h`
  }

  // Generate detailed description with cost breakdown
  const generateDetailedDescription = async () => {
    if (!flight.id || !flight.plane_id) return

    const blockOffTime = flight.block_off ? format(new Date(flight.block_off), 'dd.MM.yyyy, HH:mm') : ''
    const flightTime = formatFlightTime(flight.flight_time_hours)
    const rate = (flight.operation_rate || flight.plane_default_rate || 0).toFixed(2)
    const rateUnit = flight.billing_unit === 'minute' ? 'min' : 'hr'

    let desc = `Flight ${flight.tail_number} on ${blockOffTime}${flightTime ? `, ${flightTime}` : ''} @ €${rate}/${rateUnit}`

    // Fetch airport fees breakdown if applicable
    if (flight.icao_departure || flight.icao_destination) {
      const feesResult = await calculateAirportFeesForFlight(
        flight.icao_departure,
        flight.icao_destination,
        flight.plane_id,
        flight.landings || 0,
        flight.passengers || 0
      )

      if (feesResult.success && feesResult.fees && feesResult.fees.length > 0) {
        setAirportFeesBreakdown({
          fees: feesResult.fees,
          totalAmount: feesResult.totalAmount
        })

        // Add fees to description if included
        if (includeAirportFees) {
          const feeBreakdown = feesResult.fees.map(fee =>
            `${fee.icao_code} ${fee.fee_type} €${fee.amount.toFixed(2)}`
          ).join(', ')
          desc += `, ${feeBreakdown}`
        }
      }
    }

    setDescription(desc)
  }

  // Update description when includeAirportFees or custom rate changes
  useEffect(() => {
    if (!airportFeesBreakdown) return

    const blockOffTime = flight.block_off ? format(new Date(flight.block_off), 'dd.MM.yyyy, HH:mm') : ''
    const flightTime = formatFlightTime(flight.flight_time_hours)
    const rate = getEffectiveRate().toFixed(2)
    const rateUnit = flight.billing_unit === 'minute' ? 'min' : 'hr'

    let desc = `Flight ${flight.tail_number} on ${blockOffTime}${flightTime ? `, ${flightTime}` : ''} @ €${rate}/${rateUnit}`

    // Add custom rate note if applicable
    if (useCustomRate) {
      desc += ' (Custom Rate)'
    }

    if (includeAirportFees && airportFeesBreakdown.fees.length > 0) {
      const feeBreakdown = airportFeesBreakdown.fees.map(fee =>
        `${fee.icao_code} ${fee.fee_type} €${fee.amount.toFixed(2)}`
      ).join(', ')
      desc += `, ${feeBreakdown}`
    }

    setDescription(desc)
  }, [includeAirportFees, airportFeesBreakdown, useCustomRate, customRate])

  // Auto-initialize split targets based on operation type configuration, pilot request, or copilot presence
  useEffect(() => {
    if (!open) return

    const initializeChargeDialog = async () => {
      // Initialize custom rate with current rate
      const currentRate = (flight.operation_rate || flight.plane_default_rate || 0).toFixed(2)
      setCustomRate(currentRate)
      setUseCustomRate(false)

      // Generate detailed description
      generateDetailedDescription()

      // Check if operation type has default split configuration
      let operationTypeSplits: Array<{
        target_type: 'cost_center' | 'pilot'
        cost_center_id: string | null
        cost_center_name?: string
        percentage: number
        sort_order: number
      }> = []

      if (flight.operation_type_id) {
        try {
          const response = await fetch(`/api/operation-types/${flight.operation_type_id}/splits`)
          if (response.ok) {
            const data = await response.json()
            operationTypeSplits = data.splits || []
          }
        } catch (error) {
          console.error('Error fetching operation type splits:', error)
        }
      }

      // Priority 1: Operation type has default split configuration
      if (operationTypeSplits.length > 0) {
        setIsSplitCost(true)
        const targets: SplitTarget[] = operationTypeSplits.map((split, index) => {
          const target: SplitTarget = {
            id: (index + 1).toString(),
            type: split.target_type === 'pilot' ? 'user' : 'cost_center',
            targetId: split.target_type === 'pilot' ? (flight.pilot_id || '') : (split.cost_center_id || ''),
            targetName: split.target_type === 'pilot'
              ? `${flight.pilot_surname}, ${flight.pilot_name}`
              : (split.cost_center_name || ''),
            percentage: split.percentage,
            description: '',
            isDescriptionOverridden: false
          }
          return target
        })

        // Generate descriptions for all targets
        targets.forEach(target => {
          target.description = generateTargetDescription(target)
        })

        setSplitTargets(targets)
        // Default: assign airport fees to first target
        setAirportFeeTargetId('1')
        // Set charge type to match first target (for UI consistency)
        setChargeType(targets[0]?.type === 'cost_center' ? 'cost_center' : 'user')
        return
      }

      // Priority 2: Reset to default charge target (pilot or default cost center)
      if (flight.default_cost_center_id) {
        setChargeType('cost_center')
        setSelectedCostCenterId(flight.default_cost_center_id)
      } else {
        setChargeType('user')
        setSelectedUserId(flight.pilot_id || '')
      }

      // Priority 3: Pilot requested split with copilot
      if (flight.split_cost_with_copilot && flight.copilot_id) {
        setIsSplitCost(true)
        const pilotPercentage = flight.pilot_cost_percentage || 50
        const copilotPercentage = 100 - pilotPercentage

        const pilotTarget: SplitTarget = {
          id: '1',
          type: 'user',
          targetId: flight.pilot_id,
          targetName: `${flight.pilot_surname}, ${flight.pilot_name}`,
          percentage: pilotPercentage,
          description: '',
          isDescriptionOverridden: false
        }

        const copilotTarget: SplitTarget = {
          id: '2',
          type: 'user',
          targetId: flight.copilot_id,
          targetName: `${flight.copilot_surname}, ${flight.copilot_name}`,
          percentage: copilotPercentage,
          description: '',
          isDescriptionOverridden: false
        }

        // Generate initial descriptions
        pilotTarget.description = generateTargetDescription(pilotTarget)
        copilotTarget.description = generateTargetDescription(copilotTarget)

        setSplitTargets([pilotTarget, copilotTarget])
        setAirportFeeTargetId('1')
      }
      // Priority 4: Copilot exists but no split requested (suggest split)
      else if (flight.copilot_id && !flight.default_cost_center_id && flight.pilot_id) {
        setIsSplitCost(true)
        const pilotTarget: SplitTarget = {
          id: '1',
          type: 'user',
          targetId: flight.pilot_id,
          targetName: `${flight.pilot_surname}, ${flight.pilot_name}`,
          percentage: 50,
          description: '',
          isDescriptionOverridden: false
        }

        const copilotTarget: SplitTarget = {
          id: '2',
          type: 'user',
          targetId: flight.copilot_id,
          targetName: `${flight.copilot_surname}, ${flight.copilot_name}`,
          percentage: 50,
          description: '',
          isDescriptionOverridden: false
        }

        pilotTarget.description = generateTargetDescription(pilotTarget)
        copilotTarget.description = generateTargetDescription(copilotTarget)

        setSplitTargets([pilotTarget, copilotTarget])
        setAirportFeeTargetId('1')
      } else {
        // No split needed
        setIsSplitCost(false)
        setSplitTargets([])
        setAirportFeeTargetId('')
      }
    }

    initializeChargeDialog()
  }, [open, flight.id, flight.operation_type_id, flight.copilot_id, flight.pilot_id, flight.default_cost_center_id, flight.split_cost_with_copilot, flight.pilot_cost_percentage])

  const selectedUser = userBalances.find(u => u.user_id === selectedUserId)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  // Get the effective rate (custom rate if enabled, otherwise operation/default rate)
  const getEffectiveRate = () => {
    if (useCustomRate) {
      return parseFloat(customRate) || 0
    }
    return flight.operation_rate || flight.plane_default_rate || 0
  }

  // Calculate flight amount using effective rate
  const calculateFlightAmount = () => {
    const rate = getEffectiveRate()
    const flightTimeHours = flight.flight_time_hours || 0

    if (flight.billing_unit === 'minute') {
      return (flightTimeHours * 60) * rate
    }
    return flightTimeHours * rate
  }

  const calculatedFlightAmount = calculateFlightAmount()

  // Calculate amount for a split target based on fee allocation mode
  const calculateSplitTargetAmount = (target: SplitTarget) => {
    const flightAmount = calculatedFlightAmount
    const airportFeesTotal = includeAirportFees && airportFeesBreakdown ? airportFeesBreakdown.totalAmount : 0

    if (!includeAirportFees || airportFeesTotal === 0) {
      // No airport fees, just split the flight amount
      return (flightAmount * target.percentage) / 100
    }

    if (airportFeeAllocation === 'split_equally') {
      // Split both flight and fees by percentage
      return ((flightAmount + airportFeesTotal) * target.percentage) / 100
    } else {
      // Assign fees to specific target
      const flightPortionAmount = (flightAmount * target.percentage) / 100
      const feesAmount = target.id === airportFeeTargetId ? airportFeesTotal : 0
      return flightPortionAmount + feesAmount
    }
  }

  // Generate description for a split target
  const generateTargetDescription = (target: SplitTarget): string => {
    const blockOffTime = flight.block_off ? format(new Date(flight.block_off), 'dd.MM.yyyy, HH:mm') : ''
    const flightTime = formatFlightTime(flight.flight_time_hours)
    const rate = getEffectiveRate().toFixed(2)
    const rateUnit = flight.billing_unit === 'minute' ? 'min' : 'hr'
    const amount = calculateSplitTargetAmount(target).toFixed(2)

    const splitInfo = splitMode === 'percentage'
      ? `${target.percentage.toFixed(1)}%`
      : `${percentageToMinutes(target.percentage)} min`

    let desc = `Flight ${flight.tail_number} on ${blockOffTime}${flightTime ? `, ${flightTime}` : ''} @ €${rate}/${rateUnit} (${splitInfo} split)`

    // Add a custom rate note if applicable
    if (useCustomRate) {
      desc += ' [Custom Rate]'
    }

    // Add airport fees info if applicable
    const airportFeesTotal = includeAirportFees && airportFeesBreakdown ? airportFeesBreakdown.totalAmount : 0
    if (airportFeesTotal > 0) {
      if (airportFeeAllocation === 'split_equally') {
        const feesPortion = (airportFeesTotal * target.percentage) / 100
        desc += `, Airport Fees €${feesPortion.toFixed(2)}`
      } else if (target.id === airportFeeTargetId) {
        desc += `, Airport Fees €${airportFeesTotal.toFixed(2)}`
      }
    }

    desc += ` = €${amount}`

    return desc
  }

  // Auto-update descriptions for all targets (unless overridden)
  useEffect(() => {
    if (!isSplitCost || splitTargets.length === 0) return

    setSplitTargets(prevTargets =>
      prevTargets.map(target => {
        if (target.isDescriptionOverridden) {
          // Don't update if user has manually overridden
          return target
        }
        return {
          ...target,
          description: generateTargetDescription(target)
        }
      })
    )
  }, [
    flight.block_off,
    flight.tail_number,
    flight.billing_unit,
    customRate,
    useCustomRate,
    splitMode,
    includeAirportFees,
    airportFeesBreakdown,
    airportFeeAllocation,
    airportFeeTargetId,
    isSplitCost
  ])

  const addSplitTarget = () => {
    const newId = (splitTargets.length + 1).toString()
    const remainingPercentage = 100 - splitTargets.reduce((sum, t) => sum + t.percentage, 0)

    const newTarget: SplitTarget = {
      id: newId,
      type: 'user',
      targetId: '',
      targetName: '',
      percentage: Math.max(remainingPercentage, 0),
      description: '',
      isDescriptionOverridden: false
    }

    // Pre-fill with pilot info if available
    newTarget.targetId = flight.pilot_id || ''
    newTarget.targetName = flight.pilot_id ? `${flight.pilot_surname}, ${flight.pilot_name}` : ''

    // Generate initial description
    newTarget.description = generateTargetDescription(newTarget)

    setSplitTargets([...splitTargets, newTarget])
  }

  const removeSplitTarget = (id: string) => {
    setSplitTargets(splitTargets.filter(t => t.id !== id))
  }

  const updateSplitTarget = (id: string, updates: Partial<SplitTarget>) => {
    setSplitTargets(splitTargets.map(t => {
      if (t.id !== id) return t

      const updatedTarget = { ...t, ...updates }

      // If percentage changed and description is not manually overridden, regenerate description
      if ('percentage' in updates && !updatedTarget.isDescriptionOverridden) {
        updatedTarget.description = generateTargetDescription(updatedTarget)
      }

      return updatedTarget
    }))
  }

  const totalPercentage = splitTargets.reduce((sum, t) => sum + t.percentage, 0)

  const formatDuration = (hours: number | null) => {
    if (!hours) return '-'
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return `${h}:${m.toString().padStart(2, '0')}`
  }

  // Convert flight time hours to total minutes
  const flightTimeMinutes = Math.round((flight.flight_time_hours || 0) * 60)

  // Convert percentage to minutes for display
  const percentageToMinutes = (percentage: number) => {
    return Math.round((percentage / 100) * flightTimeMinutes)
  }

  // Convert minutes to percentage
  const minutesToPercentage = (minutes: number) => {
    if (flightTimeMinutes === 0) return 0
    return (minutes / flightTimeMinutes) * 100
  }

  // Calculate total minutes for validation
  const totalMinutes = splitTargets.reduce((sum, t) => sum + percentageToMinutes(t.percentage), 0)

  const handleSubmit = async () => {
    if (!flight.id) {
      setError('Invalid flight data')
      return
    }

    setError(null)

    // Calculate total amount based on whether airport fees are included
    // Use calculated amount with custom rate if provided
    const flightAmount = calculatedFlightAmount
    const airportFeesAmount = includeAirportFees && airportFeesBreakdown ? airportFeesBreakdown.totalAmount : 0
    const totalAmount = flightAmount + airportFeesAmount

    startTransition(async () => {
      let result

      if (isSplitCost) {
        // Validate split
        if (splitTargets.length === 0) {
          setError('Please add at least one split target')
          return
        }

        // Validate based on split mode
        if (splitMode === 'percentage') {
          if (Math.abs(totalPercentage - 100) > 0.01) {
            setError(`Split percentages must sum to 100% (currently ${totalPercentage.toFixed(1)}%)`)
            return
          }
        } else {
          // Time mode - validate minutes equal flight time
          if (totalMinutes !== flightTimeMinutes) {
            setError(`Split minutes must equal flight time (${totalMinutes} / ${flightTimeMinutes} minutes)`)
            return
          }
        }

        // Check all targets have valid IDs
        for (const target of splitTargets) {
          if (!target.targetId) {
            setError('Please select a target for all splits')
            return
          }
        }

        result = await splitChargeFlight({
          flightlogId: flight.id!,
          splits: splitTargets.map(t => ({
            type: t.type,
            targetId: t.targetId,
            percentage: t.percentage,
            description: t.description
          })),
          flightAmount,
          airportFeesAmount,
          airportFeeAllocation,
          airportFeeTargetId: airportFeeAllocation === 'assign_to_target' ? airportFeeTargetId : null
        })
      } else {
        // Single target charge
        if (chargeType === 'user') {
          if (!selectedUserId) {
            setError('Please select a user')
            return
          }

          result = await chargeFlightToUser({
            flightlogId: flight.id!,
            userId: selectedUserId,
            amount: totalAmount,
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
            amount: totalAmount,
            description,
          })
        }
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
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Charge Flight</DialogTitle>
          <DialogDescription>
            Charge this flight to a user account or cost center
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pr-2">
          {/* Warning if flight needs board review */}
          {flight.needs_board_review && (
            <Alert variant="destructive" className="border-red-500 bg-red-50 dark:bg-red-950">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold text-sm mb-1">Flight Needs Board Review</div>
                <div className="text-sm">This flight requires board review and approval before it can be charged. Please review it in the flight log first.</div>
              </AlertDescription>
            </Alert>
          )}

          {/* Flight Notes - Display prominently if present */}
          {flight.notes && (
            <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
              <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription>
                <div className="font-semibold text-sm mb-1">Note for Treasurer:</div>
                <div className="text-sm whitespace-pre-wrap">{flight.notes}</div>
              </AlertDescription>
            </Alert>
          )}

          {/* Flight Details */}
          <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
            <div className="grid grid-cols-3 gap-4 text-sm">
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
                <span className="text-muted-foreground">Co-Pilot:</span>
                <span className="ml-2 font-medium">
                  {flight.copilot_id && flight.copilot_name
                    ? `${flight.copilot_name} ${flight.copilot_surname}`
                    : '-'
                  }
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
              <div>
                <span className="text-muted-foreground">Route:</span>
                <span className="ml-2 font-medium font-mono">
                  {flight.icao_departure && flight.icao_destination ? (
                    `${flight.icao_departure} → ${flight.icao_destination}`
                  ) : flight.icao_departure ? (
                    `${flight.icao_departure} →`
                  ) : flight.icao_destination ? (
                    `→ ${flight.icao_destination}`
                  ) : (
                    '—'
                  )}
                </span>
              </div>
            </div>

            {/* Custom Rate Override */}
            <div className="pt-2 border-t space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="use-custom-rate"
                  checked={useCustomRate}
                  onCheckedChange={(checked) => setUseCustomRate(checked as boolean)}
                />
                <Label htmlFor="use-custom-rate" className="font-medium cursor-pointer">
                  Override Rate
                </Label>
              </div>
              {useCustomRate && (
                <div className="flex items-center gap-2 pl-6">
                  <Label htmlFor="custom-rate" className="text-sm text-muted-foreground whitespace-nowrap">
                    Custom Rate:
                  </Label>
                  <Input
                    id="custom-rate"
                    type="number"
                    step="0.01"
                    min="0"
                    value={customRate}
                    onChange={(e) => setCustomRate(e.target.value)}
                    className="h-8 w-32"
                  />
                  <span className="text-sm text-muted-foreground">
                    €/{flight.billing_unit === 'minute' ? 'min' : 'hr'}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">
                  Flight: {formatDuration(flight.flight_time_hours)} × € {getEffectiveRate().toFixed(2)}/{flight.billing_unit === 'minute' ? 'min' : 'hr'}
                </span>
                <span className="font-medium">
                  € {calculatedFlightAmount.toFixed(2)}
                </span>
              </div>
              {airportFeesBreakdown && airportFeesBreakdown.totalAmount > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="include-airport-fees"
                        checked={includeAirportFees}
                        onCheckedChange={(checked) => setIncludeAirportFees(checked as boolean)}
                      />
                      <Label htmlFor="include-airport-fees" className="text-sm text-muted-foreground cursor-pointer">
                        Airport Fees:
                      </Label>
                    </div>
                    <span className={`font-medium ${!includeAirportFees ? 'line-through text-muted-foreground' : ''}`}>
                      € {airportFeesBreakdown.totalAmount.toFixed(2)}
                    </span>
                  </div>
                  {includeAirportFees && airportFeesBreakdown.fees.length > 0 && (
                    <div className="pl-8 space-y-0.5 text-xs text-muted-foreground">
                      {airportFeesBreakdown.fees.map((fee, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>{fee.icao_code} {fee.fee_type}:</span>
                          <span>€ {fee.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="font-semibold">Total Amount:</span>
                <span className="font-bold text-lg">
                  € {(calculatedFlightAmount + (includeAirportFees && airportFeesBreakdown ? airportFeesBreakdown.totalAmount : 0)).toFixed(2)}
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
                  User Account
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

          {/* Split Cost Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="split-cost"
              checked={isSplitCost}
              onCheckedChange={(checked) => {
                setIsSplitCost(checked as boolean)
                if (checked && splitTargets.length === 0) {
                  // Initialize with pilot and copilot as targets if available, otherwise one target
                  if (flight.copilot_id && flight.pilot_id) {
                    const target1 = {
                      id: '1',
                      type: 'user' as const,
                      targetId: flight.pilot_id,
                      targetName: `${flight.pilot_surname}, ${flight.pilot_name}`,
                      percentage: 50,
                      description: '',
                      isDescriptionOverridden: false
                    }
                    const target2 = {
                      id: '2',
                      type: 'user' as const,
                      targetId: flight.copilot_id,
                      targetName: `${flight.copilot_surname}, ${flight.copilot_name}`,
                      percentage: 50,
                      description: '',
                      isDescriptionOverridden: false
                    }
                    // Generate descriptions for initial targets
                    target1.description = generateTargetDescription(target1)
                    target2.description = generateTargetDescription(target2)
                    setSplitTargets([target1, target2])
                  } else {
                    // Initialize with one target
                    addSplitTarget()
                  }
                }
              }}
            />
            <Label htmlFor="split-cost" className="font-normal cursor-pointer">
              Split cost between multiple targets
              {flight.copilot_id && (
                <span className="ml-2 text-xs text-muted-foreground">
                  (Auto-enabled for co-pilot flights)
                </span>
              )}
            </Label>
          </div>

          {/* Split Targets UI */}
          {isSplitCost ? (
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <Label>Split Targets</Label>
                <Button type="button" size="sm" variant="outline" onClick={addSplitTarget}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Target
                </Button>
              </div>

              {/* Split Mode Toggle */}
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">Split by:</span>
                <RadioGroup value={splitMode} onValueChange={(value) => setSplitMode(value as SplitMode)} className="flex gap-4">
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="percentage" id="split-percentage" />
                    <Label htmlFor="split-percentage" className="text-xs font-normal cursor-pointer">Percentage</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="time" id="split-time" />
                    <Label htmlFor="split-time" className="text-xs font-normal cursor-pointer">
                      Time ({flightTimeMinutes} min total)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Airport Fee Allocation (only show if fees exist) */}
              {includeAirportFees && airportFeesBreakdown && airportFeesBreakdown.totalAmount > 0 && (
                <div className="space-y-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                  <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Airport Fees Allocation (€ {airportFeesBreakdown.totalAmount.toFixed(2)})
                  </div>
                  <RadioGroup
                    value={airportFeeAllocation}
                    onValueChange={(value) => setAirportFeeAllocation(value as AirportFeeAllocation)}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="split_equally" id="fee-split-equal" />
                      <Label htmlFor="fee-split-equal" className="text-sm font-normal cursor-pointer">
                        Split equally by percentage/time
                      </Label>
                    </div>
                    <div className="flex items-start space-x-2">
                      <RadioGroupItem value="assign_to_target" id="fee-assign" className="mt-0.5" />
                      <div className="flex-1 space-y-2">
                        <Label htmlFor="fee-assign" className="text-sm font-normal cursor-pointer">
                          Assign to specific target
                        </Label>
                        {airportFeeAllocation === 'assign_to_target' && (
                          <Select value={airportFeeTargetId} onValueChange={setAirportFeeTargetId}>
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Select target for fees..." />
                            </SelectTrigger>
                            <SelectContent>
                              {splitTargets.map((target, idx) => (
                                <SelectItem key={target.id} value={target.id}>
                                  Target {idx + 1}: {target.targetName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {splitTargets.map((target, index) => {
                // Color coding for targets
                const borderColors = [
                  'border-l-blue-500',
                  'border-l-green-500',
                  'border-l-orange-500',
                  'border-l-purple-500',
                  'border-l-pink-500'
                ]
                const bgColors = [
                  'bg-blue-50 dark:bg-blue-950/30',
                  'bg-green-50 dark:bg-green-950/30',
                  'bg-orange-50 dark:bg-orange-950/30',
                  'bg-purple-50 dark:bg-purple-950/30',
                  'bg-pink-50 dark:bg-pink-950/30'
                ]
                const textColors = [
                  'text-blue-900 dark:text-blue-100',
                  'text-green-900 dark:text-green-100',
                  'text-orange-900 dark:text-orange-100',
                  'text-purple-900 dark:text-purple-100',
                  'text-pink-900 dark:text-pink-100'
                ]

                return (
                  <div
                    key={target.id}
                    className={cn(
                      "space-y-2 p-3 rounded-md border-l-4",
                      bgColors[index % bgColors.length],
                      borderColors[index % borderColors.length]
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn("text-sm font-semibold", textColors[index % textColors.length])}>
                        Target {index + 1}
                        {target.targetName && `: ${target.targetName}`}
                      </span>
                      {splitTargets.length > 1 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removeSplitTarget(target.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Type</Label>
                      <RadioGroup
                        value={target.type}
                        onValueChange={(value) => updateSplitTarget(target.id, { type: value as 'user' | 'cost_center' })}
                        className="space-y-1"
                      >
                        <div className="flex items-center space-x-1.5">
                          <RadioGroupItem value="user" id={`${target.id}-user`} className="h-3 w-3" />
                          <Label htmlFor={`${target.id}-user`} className="text-xs font-normal cursor-pointer">User</Label>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <RadioGroupItem value="cost_center" id={`${target.id}-cc`} className="h-3 w-3" />
                          <Label htmlFor={`${target.id}-cc`} className="text-xs font-normal cursor-pointer">Cost Center</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div>
                      <Label className="text-xs">
                        {splitMode === 'percentage' ? 'Percentage' : 'Minutes'}
                      </Label>
                      {splitMode === 'percentage' ? (
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={target.percentage}
                          onChange={(e) => updateSplitTarget(target.id, { percentage: parseFloat(e.target.value) || 0 })}
                          className="h-8"
                        />
                      ) : (
                        <Input
                          type="number"
                          min="0"
                          max={flightTimeMinutes}
                          step="1"
                          value={percentageToMinutes(target.percentage)}
                          onChange={(e) => {
                            const minutes = parseInt(e.target.value) || 0
                            updateSplitTarget(target.id, { percentage: minutesToPercentage(minutes) })
                          }}
                          className="h-8"
                        />
                      )}
                    </div>
                  </div>

                  {target.type === 'user' ? (
                    <div>
                      <Label className="text-xs">User</Label>
                      <Select
                        value={target.targetId}
                        onValueChange={(value) => {
                          const user = userBalances.find(u => u.user_id === value)
                          updateSplitTarget(target.id, {
                            targetId: value,
                            targetName: user ? `${user.surname}, ${user.name}` : ''
                          })
                        }}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select user..." />
                        </SelectTrigger>
                        <SelectContent>
                          {userBalances.map((user) => (
                            <SelectItem key={user.user_id} value={user.user_id}>
                              {user.surname}, {user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div>
                      <Label className="text-xs">Cost Center</Label>
                      <Select
                        value={target.targetId}
                        onValueChange={(value) => {
                          const cc = costCenters.find(c => c.id === value)
                          updateSplitTarget(target.id, {
                            targetId: value,
                            targetName: cc?.name || ''
                          })
                        }}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select cost center..." />
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

                  <div className="text-xs text-muted-foreground flex justify-between">
                    <span>
                      {splitMode === 'percentage'
                        ? `${target.percentage.toFixed(1)}% = ${percentageToMinutes(target.percentage)} min`
                        : `${percentageToMinutes(target.percentage)} min = ${target.percentage.toFixed(1)}%`
                      }
                    </span>
                    <span className="font-medium">
                      € {calculateSplitTargetAmount(target).toFixed(2)}
                    </span>
                  </div>

                  {/* Transaction Description */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Transaction Description</Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs"
                        onClick={() => {
                          if (target.isDescriptionOverridden) {
                            // Reset to auto-generated
                            updateSplitTarget(target.id, {
                              description: generateTargetDescription(target),
                              isDescriptionOverridden: false
                            })
                          } else {
                            // Enable manual override
                            updateSplitTarget(target.id, {
                              isDescriptionOverridden: true
                            })
                          }
                        }}
                      >
                        {target.isDescriptionOverridden ? 'Reset to Auto' : 'Edit Manually'}
                      </Button>
                    </div>
                    <Textarea
                      value={target.description}
                      onChange={(e) => {
                        updateSplitTarget(target.id, {
                          description: e.target.value,
                          isDescriptionOverridden: true
                        })
                      }}
                      readOnly={!target.isDescriptionOverridden}
                      rows={2}
                      className={cn(
                        "text-xs",
                        !target.isDescriptionOverridden && "bg-muted cursor-not-allowed"
                      )}
                      placeholder="Transaction description will appear here..."
                    />
                    {!target.isDescriptionOverridden && (
                      <p className="text-xs text-muted-foreground italic">
                        Auto-updated based on flight details
                      </p>
                    )}
                  </div>
                </div>
                )
              })}

              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm font-medium">Total:</span>
                {splitMode === 'percentage' ? (
                  <span className={`text-sm font-medium ${Math.abs(totalPercentage - 100) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                    {totalPercentage.toFixed(1)}% {Math.abs(totalPercentage - 100) < 0.01 ? '✓' : '(must equal 100%)'}
                  </span>
                ) : (
                  <span className={`text-sm font-medium ${totalMinutes === flightTimeMinutes ? 'text-green-600' : 'text-red-600'}`}>
                    {totalMinutes} / {flightTimeMinutes} min {totalMinutes === flightTimeMinutes ? '✓' : '(must match flight time)'}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* User Selection */}
              {chargeType === 'user' && (
            <div className="space-y-2">
              <Label>User</Label>
              <Popover open={userSelectorOpen} onOpenChange={setUserSelectorOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={userSelectorOpen}
                    className="w-full justify-between"
                  >
                    {selectedUser ? (
                      <span className="flex items-center justify-between w-full">
                        <span>{selectedUser.surname}, {selectedUser.name}</span>
                        {selectedUser.balance !== undefined && (
                          <span className={`text-xs ml-2 ${selectedUser.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(selectedUser.balance)}
                          </span>
                        )}
                      </span>
                    ) : (
                      "Select user..."
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Search users..." />
                    <CommandList>
                      <CommandEmpty>No user found.</CommandEmpty>
                      <CommandGroup>
                        {userBalances.map((user) => (
                          <CommandItem
                            key={user.user_id}
                            value={`${user.surname} ${user.name} ${user.email}`}
                            onSelect={() => {
                              setSelectedUserId(user.user_id)
                              setUserSelectorOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedUserId === user.user_id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex items-center justify-between w-full">
                              <div className="flex flex-col">
                                <span>{user.surname}, {user.name}</span>
                                <span className="text-xs text-muted-foreground">{user.email}</span>
                              </div>
                              {user.balance !== undefined && (
                                <span className={`text-xs ml-2 ${user.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatCurrency(user.balance)}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedUser && selectedUser.user_id !== flight.pilot_id && (
                <p className="text-xs text-orange-600">
                  Note: Charging to {selectedUser.surname}, {selectedUser.name} instead of pilot ({flight.pilot_surname}, {flight.pilot_name})
                </p>
              )}
            </div>
          )}

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
            </>
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
          <Button onClick={handleSubmit} disabled={isPending || flight.needs_board_review}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Charge Flight
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
