'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Wrench, AlertTriangle, CheckCircle, Clock, Plus, TrendingUp } from 'lucide-react'
import { AddMaintenanceRecordDialog } from './add-maintenance-record-dialog'
import { UpdateMaintenanceScheduleDialog } from './update-maintenance-schedule-dialog'
import { MaintenanceRecordRow } from './maintenance-record-row'

export type AircraftWithMaintenance = {
  id: string
  tail_number: string
  type: string
  total_flight_hours: number
  next_maintenance_hours: number | null
  maintenance_interval_hours: number | null
  hours_until_maintenance: number | null
  maintenance_status: 'not_scheduled' | 'ok' | 'warning' | 'critical' | 'overdue'
  last_maintenance: {
    id: string
    performed_at: string
    performed_at_hours: number
    maintenance_type: string
    description: string | null
    performed_by: string
    cost: number | null
  } | null
}

export type MaintenanceRecord = {
  id: string
  plane_id: string
  performed_at: string
  performed_at_hours: number
  performed_by: string
  maintenance_type: string
  description: string | null
  next_due_hours: number | null
  cost: number | null
  vendor: string | null
  notes: string | null
  created_at: string
  updated_at: string
  performed_by_user: {
    id: string
    name: string
    surname: string
  } | null
}

interface AircraftMaintenanceTabProps {
  aircraft: AircraftWithMaintenance
  maintenanceHistory: MaintenanceRecord[]
  isBoardMember: boolean
}

function getMaintenanceStatusBadge(status: string) {
  switch (status) {
    case 'not_scheduled':
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" />
          Not Scheduled
        </Badge>
      )
    case 'ok':
      return (
        <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
          <CheckCircle className="h-3 w-3" />
          OK
        </Badge>
      )
    case 'warning':
      return (
        <Badge variant="default" className="gap-1 bg-yellow-600 hover:bg-yellow-700">
          <AlertTriangle className="h-3 w-3" />
          Warning
        </Badge>
      )
    case 'critical':
      return (
        <Badge variant="default" className="gap-1 bg-orange-600 hover:bg-orange-700">
          <AlertTriangle className="h-3 w-3" />
          Critical
        </Badge>
      )
    case 'overdue':
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Overdue
        </Badge>
      )
    default:
      return <Badge variant="secondary">Unknown</Badge>
  }
}

export function AircraftMaintenanceTab({
  aircraft,
  maintenanceHistory,
  isBoardMember,
}: AircraftMaintenanceTabProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)

  return (
    <div className="space-y-6">
      {/* Maintenance Status Alert */}
      {aircraft.maintenance_status === 'overdue' && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Maintenance Overdue</AlertTitle>
          <AlertDescription>
            This aircraft is {Math.abs(aircraft.hours_until_maintenance || 0).toFixed(1)} hours overdue for
            maintenance. Operations should be restricted until maintenance is completed.
          </AlertDescription>
        </Alert>
      )}

      {aircraft.maintenance_status === 'critical' && (
        <Alert variant="destructive" className="border-orange-600 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-800" />
          <AlertTitle className="text-orange-800">Maintenance Critical</AlertTitle>
          <AlertDescription className="text-orange-700">
            Only {aircraft.hours_until_maintenance?.toFixed(1)} hours remaining until maintenance is due. Schedule
            maintenance soon.
          </AlertDescription>
        </Alert>
      )}

      {aircraft.maintenance_status === 'warning' && (
        <Alert className="border-yellow-600 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-800" />
          <AlertTitle className="text-yellow-800">Maintenance Due Soon</AlertTitle>
          <AlertDescription className="text-yellow-700">
            {aircraft.hours_until_maintenance?.toFixed(1)} hours remaining until maintenance is due.
          </AlertDescription>
        </Alert>
      )}

      {/* Maintenance Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Maintenance Status
              </CardTitle>
              <CardDescription>Current aircraft hours and maintenance schedule</CardDescription>
            </div>
            {getMaintenanceStatusBadge(aircraft.maintenance_status)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Hours */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Total Aircraft Hours</p>
              <p className="text-3xl font-bold">{aircraft.total_flight_hours.toFixed(1)}</p>
            </div>

            {/* Next Maintenance Due */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Next Maintenance Due</p>
              {aircraft.next_maintenance_hours !== null ? (
                <p className="text-3xl font-bold">{aircraft.next_maintenance_hours.toFixed(1)}</p>
              ) : (
                <p className="text-muted-foreground">Not scheduled</p>
              )}
            </div>

            {/* Hours Remaining */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Hours Until Maintenance</p>
              {aircraft.hours_until_maintenance !== null ? (
                <p
                  className={`text-3xl font-bold ${
                    aircraft.hours_until_maintenance < 0
                      ? 'text-red-600'
                      : aircraft.hours_until_maintenance <= 5
                      ? 'text-orange-600'
                      : aircraft.hours_until_maintenance <= 10
                      ? 'text-yellow-600'
                      : 'text-green-600'
                  }`}
                >
                  {aircraft.hours_until_maintenance.toFixed(1)}
                </p>
              ) : (
                <p className="text-muted-foreground">-</p>
              )}
            </div>
          </div>

          {/* Maintenance Interval */}
          {aircraft.maintenance_interval_hours && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Standard maintenance interval: {aircraft.maintenance_interval_hours} hours
              </div>
            </div>
          )}

          {/* Last Maintenance Info */}
          {aircraft.last_maintenance && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium mb-2">Last Maintenance</p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  <span className="font-medium">Type:</span> {aircraft.last_maintenance.maintenance_type}
                </p>
                <p>
                  <span className="font-medium">Performed:</span>{' '}
                  {new Date(aircraft.last_maintenance.performed_at).toLocaleDateString()} at{' '}
                  {aircraft.last_maintenance.performed_at_hours.toFixed(1)} hours
                </p>
                {aircraft.last_maintenance.description && (
                  <p>
                    <span className="font-medium">Description:</span> {aircraft.last_maintenance.description}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Board Member Actions */}
          {isBoardMember && (
            <div className="mt-6 flex gap-2">
              <Button variant="outline" onClick={() => setScheduleDialogOpen(true)}>
                Update Schedule
              </Button>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Record Maintenance
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Maintenance History */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance History</CardTitle>
          <CardDescription>Complete maintenance record for this aircraft</CardDescription>
        </CardHeader>
        <CardContent>
          {maintenanceHistory.length === 0 ? (
            <div className="text-center py-12">
              <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No maintenance records yet</p>
              {isBoardMember && (
                <p className="text-sm text-muted-foreground mt-2">
                  Click "Record Maintenance" to add the first record
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>At Hours</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Performed By</TableHead>
                      <TableHead>Cost</TableHead>
                      {isBoardMember && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maintenanceHistory.map((record) => (
                      <MaintenanceRecordRow
                        key={record.id}
                        record={record}
                        aircraftId={aircraft.id}
                        isBoardMember={isBoardMember}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {maintenanceHistory.map((record) => (
                  <Card key={record.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">{record.maintenance_type}</CardTitle>
                          <CardDescription className="text-xs">
                            {new Date(record.performed_at).toLocaleDateString()} • At{' '}
                            {record.performed_at_hours.toFixed(1)} hours
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {record.description && (
                        <p className="text-muted-foreground">{record.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          By:{' '}
                          {record.performed_by_user
                            ? `${record.performed_by_user.name} ${record.performed_by_user.surname}`
                            : 'Unknown'}
                        </span>
                        {record.cost && (
                          <span className="font-medium">CHF {record.cost.toFixed(2)}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {isBoardMember && (
        <>
          <AddMaintenanceRecordDialog
            open={addDialogOpen}
            onOpenChange={setAddDialogOpen}
            aircraftId={aircraft.id}
            currentHours={aircraft.total_flight_hours}
            defaultInterval={aircraft.maintenance_interval_hours || 50}
          />
          <UpdateMaintenanceScheduleDialog
            open={scheduleDialogOpen}
            onOpenChange={setScheduleDialogOpen}
            aircraftId={aircraft.id}
            currentNextDue={aircraft.next_maintenance_hours}
            currentInterval={aircraft.maintenance_interval_hours}
          />
        </>
      )}
    </div>
  )
}
