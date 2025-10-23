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
import { Loader2, AlertCircle, User, Building2, Check, ChevronsUpDown, X, Plus } from 'lucide-react'
import { chargeFlightToUser, chargeFlightToCostCenter, splitChargeFlight } from '@/lib/actions/billing'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { UnchargedFlight, CostCenter, UserBalance } from '@/lib/database.types'

type SplitTarget = {
  id: string
  type: 'user' | 'cost_center'
  targetId: string
  targetName: string
  percentage: number
}

type SplitMode = 'percentage' | 'time'

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
  const [description, setDescription] = useState(
    `Flight ${flight.tail_number} on ${flight.block_off ? format(new Date(flight.block_off), 'dd.MM.yyyy') : ''}`
  )
  const [splitTargets, setSplitTargets] = useState<SplitTarget[]>([])
  const [splitMode, setSplitMode] = useState<SplitMode>('percentage')

  // Auto-initialize split targets if there's a copilot and no default cost center
  useEffect(() => {
    if (open) {
      // Check if this flight should have split enabled
      const shouldEnableSplit = !!(flight.copilot_id && !flight.default_cost_center_id && flight.pilot_id)

      setIsSplitCost(shouldEnableSplit)

      if (shouldEnableSplit) {
        // Initialize with pilot and copilot at 50/50
        setSplitTargets([
          {
            id: '1',
            type: 'user',
            targetId: flight.pilot_id,
            targetName: `${flight.pilot_surname}, ${flight.pilot_name}`,
            percentage: 50
          },
          {
            id: '2',
            type: 'user',
            targetId: flight.copilot_id,
            targetName: `${flight.copilot_surname}, ${flight.copilot_name}`,
            percentage: 50
          }
        ])
      } else {
        // Clear split targets for non-copilot flights
        setSplitTargets([])
      }
    }
  }, [open, flight.id, flight.copilot_id, flight.pilot_id, flight.default_cost_center_id])

  const selectedUser = userBalances.find(u => u.user_id === selectedUserId)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const addSplitTarget = () => {
    const newId = (splitTargets.length + 1).toString()
    const remainingPercentage = 100 - splitTargets.reduce((sum, t) => sum + t.percentage, 0)
    setSplitTargets([
      ...splitTargets,
      {
        id: newId,
        type: 'user',
        targetId: flight.pilot_id || '',
        targetName: flight.pilot_id ? `${flight.pilot_surname}, ${flight.pilot_name}` : '',
        percentage: Math.max(0, remainingPercentage)
      }
    ])
  }

  const removeSplitTarget = (id: string) => {
    setSplitTargets(splitTargets.filter(t => t.id !== id))
  }

  const updateSplitTarget = (id: string, updates: Partial<SplitTarget>) => {
    setSplitTargets(splitTargets.map(t => t.id === id ? { ...t, ...updates } : t))
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
            percentage: t.percentage
          })),
          totalAmount: flight.calculated_amount || 0,
          description
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
                  // Initialize with pilot and copilot if available, otherwise one target
                  if (flight.copilot_id && flight.pilot_id) {
                    setSplitTargets([
                      {
                        id: '1',
                        type: 'user',
                        targetId: flight.pilot_id,
                        targetName: `${flight.pilot_surname}, ${flight.pilot_name}`,
                        percentage: 50
                      },
                      {
                        id: '2',
                        type: 'user',
                        targetId: flight.copilot_id,
                        targetName: `${flight.copilot_surname}, ${flight.copilot_name}`,
                        percentage: 50
                      }
                    ])
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

              {splitTargets.map((target, index) => (
                <div key={target.id} className="space-y-1.5 p-2 bg-muted/50 rounded-md">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Target {index + 1}</span>
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
                      € {((flight.calculated_amount || 0) * target.percentage / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}

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
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Charge Flight
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
