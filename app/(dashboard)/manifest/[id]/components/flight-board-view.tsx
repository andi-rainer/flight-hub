'use client'

import { Clock, User, Users, CheckCircle, Plane as PlaneIcon, Edit, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AddJumperDialog } from './add-jumper-dialog'
import { CompleteFlightDialog } from './complete-flight-dialog'
import { EditFlightDialog } from './edit-flight-dialog'
import { CancelOrDeleteFlightDialog } from './cancel-or-delete-flight-dialog'
import { PostponeFlightDialog } from './postpone-flight-dialog'
import { RemoveJumperDialog } from './remove-jumper-dialog'
import { FlightStatusControls } from './flight-status-controls'

interface FlightBoardViewProps {
  flights: any[]
  operationDay: any
  canManage: boolean
  userProfile: any
  manifestSettings: any
}

function getFlightStatusColor(status: string) {
  switch (status) {
    case 'completed':
      return 'border-green-500 bg-green-50 dark:bg-green-950'
    case 'in_air':
      return 'border-blue-500 bg-blue-50 dark:bg-blue-950'
    case 'boarding':
      return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950'
    case 'ready':
      return 'border-purple-500 bg-purple-50 dark:bg-purple-950'
    case 'planned':
      return 'border-gray-300 bg-white dark:bg-gray-900'
    case 'cancelled':
      return 'border-red-500 bg-red-50 dark:bg-red-950'
    default:
      return 'border-gray-300'
  }
}

export function FlightBoardView({
  flights,
  operationDay,
  canManage,
  userProfile,
  manifestSettings,
}: FlightBoardViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {flights.map((flight) => {
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

        // Create array of slot numbers
        const slots = Array.from({ length: maxJumpers }, (_, i) => i + 1)

        return (
          <Card key={flight.id} className={`border-2 ${getFlightStatusColor(flight.status)}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Load #{flight.flight_number}</CardTitle>
                <Badge variant="outline" className="uppercase text-xs">
                  {flight.status}
                </Badge>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  {flight.scheduled_time}
                </div>
                {flight.altitude_feet && (
                  <div className="flex items-center gap-2">
                    <PlaneIcon className="h-3 w-3" />
                    {flight.altitude_feet} ft
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <User className="h-3 w-3" />
                  {flight.pilot
                    ? `${flight.pilot.name} ${flight.pilot.surname}`
                    : 'No pilot assigned'}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Slot Grid */}
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center justify-between">
                  <span>Jumper Slots ({jumpers.length}/{maxJumpers})</span>
                  {availableSlots > 0 && (
                    <span className="text-green-600">{availableSlots} available</span>
                  )}
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {slots.map((slotNum) => {
                    // Find jumper that occupies this slot (accounting for multi-slot jumpers)
                    const jumper = jumpers.find((j: any) => {
                      const slotsOccupied = j.slots_occupied || 1
                      const startSlot = j.slot_number
                      const endSlot = startSlot + slotsOccupied - 1
                      return slotNum >= startSlot && slotNum <= endSlot
                    })

                    // Check if this is the second slot of a tandem pair
                    const isSecondSlotOfTandem = jumper?.jumper_type === 'tandem' &&
                                                  jumper.slot_number !== slotNum

                    return (
                      <div
                        key={slotNum}
                        className={`
                          aspect-square rounded-md border-2 flex items-center justify-center text-xs font-semibold
                          ${
                            jumper
                              ? jumper.jumper_type === 'sport'
                                ? 'bg-blue-100 border-blue-400 text-blue-700 dark:bg-blue-900 dark:border-blue-600 dark:text-blue-200'
                                : 'bg-purple-100 border-purple-400 text-purple-700 dark:bg-purple-900 dark:border-purple-600 dark:text-purple-200'
                              : 'bg-muted border-muted-foreground/20 text-muted-foreground'
                          }
                          ${isSecondSlotOfTandem ? 'opacity-75' : ''}
                        `}
                        title={
                          jumper
                            ? jumper.jumper_type === 'sport'
                              ? `${jumper.sport_jumper?.name} ${jumper.sport_jumper?.surname}`
                              : `${jumper.tandem_master?.name} + ${jumper.passenger?.name} (slots ${jumper.slot_number}-${jumper.slot_number + 1})`
                            : `Slot ${slotNum} (empty)`
                        }
                      >
                        {slotNum}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Jumper Details */}
              {jumpers.length > 0 && (
                <div className="space-y-2 text-xs">
                  {sportJumpers.length > 0 && (
                    <div>
                      <div className="font-semibold text-muted-foreground mb-1">
                        Sport ({sportJumpers.length})
                      </div>
                      {sportJumpers.map((j: any) => (
                        <div key={j.id} className="flex items-center justify-between text-xs">
                          <span>#{j.slot_number}: {j.sport_jumper?.name} {j.sport_jumper?.surname}</span>
                          {canManage && flight.status !== 'completed' && flight.status !== 'cancelled' && (
                            <RemoveJumperDialog
                              jumper={j}
                              flightStatus={flight.status}
                              trigger={
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              }
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {tandemPairs.length > 0 && (
                    <div>
                      <div className="font-semibold text-muted-foreground mb-1">
                        Tandem ({tandemPairs.length})
                      </div>
                      {tandemPairs.map((j: any) => {
                        const slotsOccupied = j.slots_occupied || 2
                        const slotRange = slotsOccupied > 1
                          ? `#${j.slot_number}-${j.slot_number + slotsOccupied - 1}`
                          : `#${j.slot_number}`
                        return (
                          <div key={j.id} className="text-xs flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <span>{slotRange}:</span>
                              <span>{j.tandem_master?.name}</span>
                              <span className="text-muted-foreground">+</span>
                              <span>{j.passenger?.name}</span>
                              {j.payment_received && (
                                <CheckCircle className="h-3 w-3 text-green-600 ml-1" />
                              )}
                            </div>
                            {canManage && flight.status !== 'completed' && flight.status !== 'cancelled' && (
                              <RemoveJumperDialog
                                jumper={j}
                                flightStatus={flight.status}
                                trigger={
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                }
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              {canManage && flight.status !== 'completed' && (
                <div className="space-y-2 pt-2 border-t">
                  {/* Status progression / reactivate */}
                  <FlightStatusControls flight={flight} canManage={canManage} variant="compact" />

                  {/* Add jumper - only for non-cancelled */}
                  {flight.status !== 'cancelled' && availableSlots > 0 && (
                    <AddJumperDialog
                      flight={flight}
                      operationDay={operationDay}
                      availableSlots={availableSlots}
                      trigger={
                        <Button variant="outline" size="sm" className="w-full">
                          <Users className="mr-2 h-4 w-4" />
                          Add Jumper
                        </Button>
                      }
                    />
                  )}

                  {/* Edit/Postpone/Cancel - only for non-cancelled */}
                  {flight.status !== 'cancelled' && (
                    <>
                      <div className="flex gap-2">
                        <EditFlightDialog
                          flight={flight}
                          manifestSettings={manifestSettings}
                          trigger={
                            <Button variant="outline" size="sm" className="flex-1">
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Button>
                          }
                        />
                        <PostponeFlightDialog
                          flight={flight}
                          allFlights={flights}
                          manifestSettings={manifestSettings}
                          trigger={
                            <Button variant="outline" size="sm" className="flex-1">
                              <Clock className="mr-2 h-4 w-4" />
                              Postpone
                            </Button>
                          }
                        />
                      </div>
                      <CancelOrDeleteFlightDialog
                        flight={flight}
                        trigger={
                          <Button variant="outline" size="sm" className="w-full">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Cancel
                          </Button>
                        }
                      />
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
