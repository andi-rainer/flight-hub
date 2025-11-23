'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import {
  ChevronDown,
  ChevronRight,
  Clock,
  User,
  UserPlus,
  Plane as PlaneIcon,
  Edit,
  Trash2,
  CheckCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { AddJumperDialog } from './add-jumper-dialog'
import { CompleteFlightDialog } from './complete-flight-dialog'
import { EditFlightDialog } from './edit-flight-dialog'
import { CancelOrDeleteFlightDialog } from './cancel-or-delete-flight-dialog'
import { PostponeFlightDialog } from './postpone-flight-dialog'
import { RemoveJumperDialog } from './remove-jumper-dialog'
import { FlightStatusControls } from './flight-status-controls'
import { cn } from '@/lib/utils'

interface FlightListViewProps {
  flights: any[]
  operationDay: any
  canManage: boolean
  userProfile: any
  manifestSettings: any
}

function getFlightStatusBadgeVariant(status: string) {
  switch (status) {
    case 'completed':
      return 'outline'
    case 'in_air':
      return 'default'
    case 'boarding':
      return 'secondary'
    case 'ready':
      return 'secondary'
    case 'planned':
      return 'outline'
    case 'cancelled':
      return 'destructive'
    default:
      return 'outline'
  }
}

export function FlightListView({
  flights,
  operationDay,
  canManage,
  userProfile,
  manifestSettings,
}: FlightListViewProps) {
  const [expandedFlights, setExpandedFlights] = useState<Set<string>>(new Set())

  const toggleFlight = (flightId: string) => {
    const newExpanded = new Set(expandedFlights)
    if (newExpanded.has(flightId)) {
      newExpanded.delete(flightId)
    } else {
      newExpanded.add(flightId)
    }
    setExpandedFlights(newExpanded)
  }

  return (
    <div className="space-y-2">
      {flights.map((flight) => {
        const isExpanded = expandedFlights.has(flight.id)
        const jumpers = flight.jumpers || []
        const sportJumpers = jumpers.filter((j: any) => j.jumper_type === 'sport')
        const tandemPairs = jumpers.filter((j: any) => j.jumper_type === 'tandem')
        const maxJumpers = operationDay.plane.max_jumpers || 10

        // Calculate occupied slots accounting for multi-slot jumpers (tandem pairs take 2 slots)
        const occupiedSlots = new Set<number>()
        jumpers.forEach((j: any) => {
          const slotsOccupied = j.slots_occupied || 1
          for (let i = 0; i < slotsOccupied; i++) {
            occupiedSlots.add(j.slot_number + i)
          }
        })
        const availableSlots = maxJumpers - occupiedSlots.size

        return (
          <Collapsible
            key={flight.id}
            open={isExpanded}
            onOpenChange={() => toggleFlight(flight.id)}
          >
            <div className="border rounded-lg overflow-hidden">
              {/* Flight Header */}
              <CollapsibleTrigger asChild>
                <div
                  className={cn(
                    'flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors',
                    isExpanded && 'border-b'
                  )}
                >
                  <div className="flex items-center gap-4 flex-1">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}

                    <div className="flex items-center gap-6 flex-1">
                      <div className="min-w-[100px]">
                        <div className="text-sm text-muted-foreground">Load #</div>
                        <div className="text-lg font-bold">{flight.flight_number}</div>
                      </div>

                      <div className="min-w-[100px]">
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Time
                        </div>
                        <div className="font-semibold">{flight.scheduled_time}</div>
                      </div>

                      {flight.altitude_feet && (
                        <div className="min-w-[100px]">
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <PlaneIcon className="h-3 w-3" />
                            Altitude
                          </div>
                          <div className="font-semibold">{flight.altitude_feet} ft</div>
                        </div>
                      )}

                      <div className="min-w-[120px]">
                        <div className="text-sm text-muted-foreground">Pilot</div>
                        <div className="font-semibold">
                          {flight.pilot
                            ? `${flight.pilot.name} ${flight.pilot.surname}`
                            : 'Not assigned'}
                        </div>
                      </div>

                      <div className="min-w-[100px]">
                        <div className="text-sm text-muted-foreground">Slots</div>
                        <div className="font-semibold">
                          {occupiedSlots.size} / {maxJumpers}
                          {availableSlots > 0 && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({availableSlots} available)
                            </span>
                          )}
                        </div>
                      </div>

                      <Badge variant={getFlightStatusBadgeVariant(flight.status)}>
                        {flight.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                    {canManage && flight.status !== 'completed' && (
                      <>
                        <FlightStatusControls flight={flight} canManage={canManage} variant="compact" />
                        {flight.status !== 'cancelled' && (
                          <>
                            {availableSlots > 0 && (
                              <AddJumperDialog
                                flight={flight}
                                operationDay={operationDay}
                                availableSlots={availableSlots}
                              />
                            )}
                            <EditFlightDialog
                              flight={flight}
                              manifestSettings={manifestSettings}
                              trigger={
                                <Button variant="ghost" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              }
                            />
                            <PostponeFlightDialog
                              flight={flight}
                              allFlights={flights}
                              manifestSettings={manifestSettings}
                              trigger={
                                <Button variant="ghost" size="sm">
                                  <Clock className="h-4 w-4" />
                                </Button>
                              }
                            />
                            <CancelOrDeleteFlightDialog
                              flight={flight}
                              trigger={
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              }
                            />
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>

              {/* Jumpers List */}
              <CollapsibleContent>
                <div className="p-4 bg-muted/30">
                  {jumpers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No jumpers assigned yet</p>
                      {canManage && availableSlots > 0 && (
                        <AddJumperDialog
                          flight={flight}
                          operationDay={operationDay}
                          availableSlots={availableSlots}
                          trigger={
                            <Button variant="outline" size="sm" className="mt-4">
                              <UserPlus className="mr-2 h-4 w-4" />
                              Assign First Jumper
                            </Button>
                          }
                        />
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Sport Jumpers */}
                      {sportJumpers.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 text-muted-foreground">
                            Sport Jumpers ({sportJumpers.length})
                          </h4>
                          <div className="space-y-2">
                            {sportJumpers.map((jumper: any) => (
                              <div
                                key={jumper.id}
                                className="flex items-center justify-between p-3 bg-background rounded-md border"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                                    {jumper.slot_number}
                                  </div>
                                  <div>
                                    <div className="font-medium">
                                      {jumper.sport_jumper?.name} {jumper.sport_jumper?.surname}
                                    </div>
                                    {jumper.notes && (
                                      <div className="text-xs text-muted-foreground">
                                        {jumper.notes}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {canManage && flight.status !== 'completed' && flight.status !== 'cancelled' && (
                                  <RemoveJumperDialog jumper={jumper} flightStatus={flight.status} />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tandem Pairs */}
                      {tandemPairs.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 text-muted-foreground">
                            Tandem Jumps ({tandemPairs.length})
                          </h4>
                          <div className="space-y-2">
                            {tandemPairs.map((jumper: any) => {
                              const slotsOccupied = jumper.slots_occupied || 2
                              const slotDisplay = slotsOccupied > 1
                                ? `${jumper.slot_number}-${jumper.slot_number + slotsOccupied - 1}`
                                : jumper.slot_number.toString()
                              return (
                                <div
                                  key={jumper.id}
                                  className="flex items-center justify-between p-3 bg-background rounded-md border"
                                >
                                  <div className="flex items-center gap-3 flex-1">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary text-xs">
                                      {slotDisplay}
                                    </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-medium">
                                        {jumper.tandem_master?.name} {jumper.tandem_master?.surname}
                                      </span>
                                      <span className="text-muted-foreground">+</span>
                                      <span>
                                        {jumper.passenger?.name} {jumper.passenger?.surname}
                                      </span>
                                      {jumper.payment_received && (
                                        <Badge variant="outline" className="text-xs">
                                          <CheckCircle className="mr-1 h-3 w-3" />
                                          Paid
                                        </Badge>
                                      )}
                                      {!jumper.payment_received && (
                                        <Badge variant="secondary" className="text-xs">
                                          {jumper.payment_type}
                                        </Badge>
                                      )}
                                    </div>
                                    {jumper.notes && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {jumper.notes}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {canManage && flight.status !== 'completed' && flight.status !== 'cancelled' && (
                                  <RemoveJumperDialog jumper={jumper} flightStatus={flight.status} />
                                )}
                              </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )
      })}
    </div>
  )
}
