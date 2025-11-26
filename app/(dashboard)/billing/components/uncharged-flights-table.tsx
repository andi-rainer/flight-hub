'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { format } from 'date-fns'
import { CreditCard, User, Building2, CheckCircle2, Loader2, Info, MessageSquare, AlertTriangle, Split } from 'lucide-react'
import { ChargeFlightDialog } from './charge-flight-dialog'
import { batchChargeFlights, splitChargeFlight } from '@/lib/actions/billing'
import type { UnchargedFlight, CostCenter, UserBalance } from '@/lib/database.types'

interface UnchargedFlightsTableProps {
  flights: UnchargedFlight[]
  costCenters: CostCenter[]
  userBalances: UserBalance[]
}

export function UnchargedFlightsTable({ flights, costCenters, userBalances }: UnchargedFlightsTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedFlight, setSelectedFlight] = useState<UnchargedFlight | null>(null)
  const [chargeDialogOpen, setChargeDialogOpen] = useState(false)
  const [batchResult, setBatchResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null)

  const formatDuration = (hours: number | null) => {
    if (!hours) return '-'
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return `${h}:${m.toString().padStart(2, '0')}`
  }

  // Helper function to format flight time for descriptions
  const formatFlightTime = (hours: number | null) => {
    if (!hours || hours <= 0) return ''
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return `${h}:${m.toString().padStart(2, '0')}h`
  }

  const handleChargeClick = (flight: UnchargedFlight) => {
    setSelectedFlight(flight)
    setChargeDialogOpen(true)
  }

  const handleBatchCharge = () => {
    // Filter out flights that need board review
    const chargeableFlights = flights.filter(flight => !flight.needs_board_review)
    const reviewFlightsCount = flights.length - chargeableFlights.length

    if (chargeableFlights.length === 0) {
      alert('No flights available to charge. All flights need board review.')
      return
    }

    let confirmMessage = `Are you sure you want to charge ${chargeableFlights.length} flight${chargeableFlights.length === 1 ? '' : 's'}?`
    if (reviewFlightsCount > 0) {
      confirmMessage += ` (${reviewFlightsCount} flight${reviewFlightsCount === 1 ? '' : 's'} requiring board review will be excluded.)`
    }
    confirmMessage += ' Flights will be charged to their pilots or default cost centers.'

    if (!confirm(confirmMessage)) {
      return
    }

    setBatchResult(null)
    startTransition(async () => {
      let successCount = 0
      let failedCount = 0
      const errors: string[] = []

      // Process each flight - check for operation type splits first
      for (const flight of chargeableFlights) {
        // Check if operation type has default split configuration
        let operationTypeSplits: Array<{
          target_type: 'cost_center' | 'pilot'
          cost_center_id: string | null
          percentage: number
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

        const blockOffTime = flight.block_off ? format(new Date(flight.block_off), 'dd.MM.yyyy, HH:mm') : ''
        const flightTime = formatFlightTime(flight.flight_time_hours)
        const rate = (flight.operation_rate || flight.plane_default_rate || 0).toFixed(2)
        const rateUnit = flight.billing_unit === 'minute' ? 'min' : 'hr'

        // Priority 1: Operation type has split configuration
        if (operationTypeSplits.length > 0) {
          const flightAmount = flight.flight_amount || 0
          const airportFeesAmount = (flight.calculated_amount || 0) - flightAmount

          const splits = operationTypeSplits.map(split => ({
            type: split.target_type === 'pilot' ? ('user' as const) : ('cost_center' as const),
            targetId: split.target_type === 'pilot' ? flight.pilot_id! : split.cost_center_id!,
            percentage: split.percentage,
            description: `Flight ${flight.tail_number} on ${blockOffTime}${flightTime ? `, ${flightTime}` : ''} @ €${rate}/${rateUnit} (${split.percentage.toFixed(1)}% split)`
          }))

          const result = await splitChargeFlight({
            flightlogId: flight.id!,
            splits,
            flightAmount,
            airportFeesAmount,
            airportFeeAllocation: 'split_equally',
            airportFeeTargetId: null
          })

          if (result.success) {
            successCount++
          } else {
            failedCount++
            errors.push(result.error || 'Unknown error')
          }
          continue
        }

        // Priority 2: Pilot requested split with copilot
        if (flight.split_cost_with_copilot && flight.copilot_id) {
          const pilotPercentage = flight.pilot_cost_percentage || 50
          const copilotPercentage = 100 - pilotPercentage

          const flightAmount = flight.flight_amount || 0
          const airportFeesAmount = (flight.calculated_amount || 0) - flightAmount

          const pilotDescription = `Flight ${flight.tail_number} on ${blockOffTime}${flightTime ? `, ${flightTime}` : ''} @ €${rate}/${rateUnit} (${pilotPercentage}% split)`
          const copilotDescription = `Flight ${flight.tail_number} on ${blockOffTime}${flightTime ? `, ${flightTime}` : ''} @ €${rate}/${rateUnit} (${copilotPercentage}% split)`

          const result = await splitChargeFlight({
            flightlogId: flight.id!,
            splits: [
              {
                type: 'user',
                targetId: flight.pilot_id!,
                percentage: pilotPercentage,
                description: pilotDescription
              },
              {
                type: 'user',
                targetId: flight.copilot_id!,
                percentage: copilotPercentage,
                description: copilotDescription
              }
            ],
            flightAmount,
            airportFeesAmount,
            airportFeeAllocation: 'split_equally',
            airportFeeTargetId: null
          })

          if (result.success) {
            successCount++
          } else {
            failedCount++
            errors.push(result.error || 'Unknown error')
          }
          continue
        }

        // Priority 3: Regular flight - charge to pilot or default cost center
        const description = `Flight ${flight.tail_number} on ${blockOffTime}${flightTime ? `, ${flightTime}` : ''} @ €${rate}/${rateUnit}`

        const charge = {
          flightlogId: flight.id!,
          targetType: flight.default_cost_center_id ? ('cost_center' as const) : ('user' as const),
          targetId: flight.default_cost_center_id || flight.pilot_id!,
          amount: flight.calculated_amount || 0,
          description,
        }

        // Use batch charge for single flights too (simpler error handling)
        const result = await batchChargeFlights([charge])
        if (result.success && result.data) {
          successCount += result.data.success
          failedCount += result.data.failed
          errors.push(...result.data.errors)
        } else {
          failedCount++
          errors.push(result.error || 'Unknown error')
        }
      }

      // Show combined results
      setBatchResult({
        success: successCount,
        failed: failedCount,
        errors
      })
      router.refresh()
    })
  }

  // Calculate totals for all flights and chargeable flights
  const totalAmount = flights.reduce((sum, flight) => sum + (flight.calculated_amount || 0), 0)
  const chargeableFlights = flights.filter(flight => !flight.needs_board_review)
  const chargeableAmount = chargeableFlights.reduce((sum, flight) => sum + (flight.calculated_amount || 0), 0)
  const reviewFlightsCount = flights.length - chargeableFlights.length

  return (
    <>
      {batchResult && (
        <Alert className={batchResult.failed === 0 ? "border-green-500 bg-green-50" : "border-orange-500 bg-orange-50"}>
          <CheckCircle2 className={`h-4 w-4 ${batchResult.failed === 0 ? "text-green-600" : "text-orange-600"}`} />
          <AlertDescription>
            <div className="font-medium">Batch Charge Complete</div>
            <div className="mt-1 text-sm">
              Successfully charged {batchResult.success} flights. {batchResult.failed > 0 && `${batchResult.failed} failed.`}
            </div>
            {batchResult.errors.length > 0 && (
              <div className="mt-2 text-xs text-muted-foreground">
                {batchResult.errors.slice(0, 3).map((error, i) => (
                  <div key={i}>• {error}</div>
                ))}
                {batchResult.errors.length > 3 && <div>... and {batchResult.errors.length - 3} more</div>}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Uncharged Flights</CardTitle>
              <CardDescription className="space-y-1">
                <div>
                  {flights.length} {flights.length === 1 ? 'flight' : 'flights'} ready to charge • Total: € {totalAmount.toFixed(2)}
                </div>
                {reviewFlightsCount > 0 && (
                  <div className="flex items-center gap-1 text-orange-600">
                    <AlertTriangle className="h-3 w-3" />
                    <span>
                      {reviewFlightsCount} {reviewFlightsCount === 1 ? 'flight needs' : 'flights need'} board review (€ {(totalAmount - chargeableAmount).toFixed(2)})
                    </span>
                  </div>
                )}
              </CardDescription>
            </div>
            {chargeableFlights.length > 0 && (
              <Button onClick={handleBatchCharge} disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Charge All {chargeableFlights.length} {chargeableFlights.length === 1 ? 'Flight' : 'Flights'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {flights.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No uncharged flights</p>
              <p className="text-sm">All flights have been charged</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="hidden lg:table-cell">Route</TableHead>
                    <TableHead>Aircraft</TableHead>
                    <TableHead>Pilot</TableHead>
                    <TableHead>Operation</TableHead>
                    <TableHead>Flight Time</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flights.map((flight) => (
                    <TableRow key={flight.id}>
                      <TableCell className="font-medium">
                        {flight.block_off ? format(new Date(flight.block_off), 'dd.MM.yyyy') : '-'}
                      </TableCell>
                      <TableCell className="font-mono text-xs hidden lg:table-cell">
                        {flight.icao_departure && flight.icao_destination ? (
                          <span>{flight.icao_departure} → {flight.icao_destination}</span>
                        ) : flight.icao_departure ? (
                          <span>{flight.icao_departure} →</span>
                        ) : flight.icao_destination ? (
                          <span>→ {flight.icao_destination}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{flight.tail_number}</div>
                          <div className="text-muted-foreground">{flight.plane_type}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {flight.pilot_name} {flight.pilot_surname}
                          {flight.copilot_id && flight.copilot_name && (
                            <span> / {flight.copilot_name} {flight.copilot_surname}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {flight.operation_type_name ? (
                          <Badge variant="outline">{flight.operation_type_name}</Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {formatDuration(flight.flight_time_hours)}
                      </TableCell>
                      <TableCell className="text-sm">
                        € {(flight.operation_rate || flight.plane_default_rate || 0).toFixed(2)}/{flight.billing_unit === 'minute' ? 'min' : 'hr'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="font-medium">€ {(flight.calculated_amount || 0).toFixed(2)}</span>
                          {(flight as any).airport_fees && (flight as any).airport_fees > 0 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-xs">
                                  <div className="space-y-1 text-xs">
                                    <div className="font-semibold">Amount Breakdown:</div>
                                    <div className="flex justify-between gap-4">
                                      <span>Flight:</span>
                                      <span>€ {((flight as any).flight_amount || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                      <span>Airport Fees:</span>
                                      <span>€ {((flight as any).airport_fees || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="border-t pt-1 flex justify-between gap-4 font-semibold">
                                      <span>Total:</span>
                                      <span>€ {(flight.calculated_amount || 0).toFixed(2)}</span>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {flight.default_cost_center_id ? (
                          <div className="flex items-center gap-1 text-xs">
                            <Building2 className="h-3 w-3" />
                            <span className="text-muted-foreground">
                              {flight.default_cost_center_name}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs">
                            <User className="h-3 w-3" />
                            <span className="text-muted-foreground">
                              {flight.pilot_surname}, {flight.pilot_name}
                              {flight.copilot_id && flight.copilot_name && (
                                <span> / {flight.copilot_surname}, {flight.copilot_name}</span>
                              )}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {flight.needs_board_review && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center">
                                    <AlertTriangle className="h-4 w-4 text-orange-600 cursor-help" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-sm">
                                  <div className="space-y-1">
                                    <div className="font-semibold text-xs text-orange-600">Needs Board Review</div>
                                    <div className="text-sm">This flight requires board review before it can be charged. Please review and approve it first.</div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {flight.notes && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center">
                                    <MessageSquare className="h-4 w-4 text-blue-600 cursor-help" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-sm">
                                  <div className="space-y-1">
                                    <div className="font-semibold text-xs">Note for Treasurer:</div>
                                    <div className="text-sm whitespace-pre-wrap">{flight.notes}</div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {flight.split_cost_with_copilot && flight.copilot_id && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center">
                                    <Split className="h-4 w-4 text-green-600 cursor-help" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-sm">
                                  <div className="space-y-1">
                                    <div className="font-semibold text-xs text-green-600">Cost Splitting Requested</div>
                                    <div className="text-sm">
                                      Pilot requested {flight.pilot_cost_percentage ?? 50}% / {100 - (flight.pilot_cost_percentage ?? 50)}% split with {flight.copilot_name} {flight.copilot_surname}
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          <Button
                            size="sm"
                            onClick={() => handleChargeClick(flight)}
                            disabled={flight.needs_board_review || false}
                          >
                            Charge
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedFlight && (
        <ChargeFlightDialog
          flight={selectedFlight}
          costCenters={costCenters}
          userBalances={userBalances}
          open={chargeDialogOpen}
          onOpenChange={setChargeDialogOpen}
        />
      )}
    </>
  )
}
