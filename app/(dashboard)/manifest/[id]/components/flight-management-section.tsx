'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { List, LayoutGrid, Plus } from 'lucide-react'
import { CreateFlightDialog } from './create-flight-dialog'
import { FlightListView } from './flight-list-view'
import { FlightBoardView } from './flight-board-view'

interface FlightManagementSectionProps {
  operationDay: any
  manifestSettings: any
  canManage: boolean
  userProfile: any
}

export function FlightManagementSection({
  operationDay,
  manifestSettings,
  canManage,
  userProfile,
}: FlightManagementSectionProps) {
  const [viewMode, setViewMode] = useState<'list' | 'board'>('board')

  const flights = operationDay.flights || []
  const canCreateFlights =
    canManage && operationDay.status !== 'completed' && operationDay.status !== 'cancelled'

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle>Flight Schedule</CardTitle>
            <CardDescription>
              Manage flights and assign jumpers for this operation day
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <div className="flex items-center rounded-md border">
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-r-none"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'board' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('board')}
                className="rounded-l-none"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>

            {/* Create flight button */}
            {canCreateFlights && (
              <CreateFlightDialog
                operationDayId={operationDay.id}
                operationDate={operationDay.operation_date}
                existingFlights={flights}
                manifestSettings={manifestSettings}
              />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {flights.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-3 mb-4">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Flights Scheduled</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              Create your first flight to start assigning jumpers and managing the manifest.
            </p>
            {canCreateFlights && (
              <CreateFlightDialog
                operationDayId={operationDay.id}
                operationDate={operationDay.operation_date}
                existingFlights={flights}
                manifestSettings={manifestSettings}
                trigger={
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Flight
                  </Button>
                }
              />
            )}
          </div>
        ) : (
          <>
            {viewMode === 'list' ? (
              <FlightListView
                flights={flights}
                operationDay={operationDay}
                canManage={canManage}
                userProfile={userProfile}
                manifestSettings={manifestSettings}
              />
            ) : (
              <FlightBoardView
                flights={flights}
                operationDay={operationDay}
                canManage={canManage}
                userProfile={userProfile}
                manifestSettings={manifestSettings}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
