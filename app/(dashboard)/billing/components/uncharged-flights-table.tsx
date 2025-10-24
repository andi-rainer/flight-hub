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
import { CreditCard, User, Building2, CheckCircle2, Loader2, Info } from 'lucide-react'
import { ChargeFlightDialog } from './charge-flight-dialog'
import { batchChargeFlights } from '@/lib/actions/billing'
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

  const handleChargeClick = (flight: UnchargedFlight) => {
    setSelectedFlight(flight)
    setChargeDialogOpen(true)
  }

  const handleBatchCharge = () => {
    if (!confirm(`Are you sure you want to charge all ${flights.length} flights? This will charge flights to their pilots or default cost centers.`)) {
      return
    }

    setBatchResult(null)
    startTransition(async () => {
      // Build charges array - charge to default cost center if available, otherwise to pilot
      const charges = flights.map(flight => ({
        flightlogId: flight.id!,
        targetType: flight.default_cost_center_id ? ('cost_center' as const) : ('user' as const),
        targetId: flight.default_cost_center_id || flight.pilot_id!,
        amount: flight.calculated_amount || 0,
        description: `Flight ${flight.tail_number} on ${flight.block_off ? format(new Date(flight.block_off), 'dd.MM.yyyy') : ''}`,
      }))

      const result = await batchChargeFlights(charges)
      if (result.success && result.data) {
        setBatchResult(result.data)
        router.refresh()
      }
    })
  }

  const totalAmount = flights.reduce((sum, flight) => sum + (flight.calculated_amount || 0), 0)

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
              <CardDescription>
                {flights.length} {flights.length === 1 ? 'flight' : 'flights'} ready to charge • Total: € {totalAmount.toFixed(2)}
              </CardDescription>
            </div>
            {flights.length > 0 && (
              <Button onClick={handleBatchCharge} disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Charge All {flights.length} Flights
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
                          {flight.airport_fees && flight.airport_fees > 0 && (
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
                                      <span>€ {(flight.flight_amount || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                      <span>Airport Fees:</span>
                                      <span>€ {flight.airport_fees.toFixed(2)}</span>
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
                        <Button
                          size="sm"
                          onClick={() => handleChargeClick(flight)}
                        >
                          Charge
                        </Button>
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
