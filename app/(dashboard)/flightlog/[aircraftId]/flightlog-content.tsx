'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { FlightlogDialog } from './components/flightlog-dialog'
import { getFlightlogs, getAllUsers, getActiveAircraftForFlightlog, getOperationTypesForPlane } from '../actions'
import { createClient } from '@/lib/supabase/client'
import type { FlightlogWithTimes, OperationType } from '@/lib/database.types'
import { Plus, Filter, Loader2, Lock, ExternalLink, Plane as PlaneIcon, ArrowLeft, Clock, Target, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import Link from 'next/link'

interface FlightlogContentProps {
  aircraftId: string
  userId: string
  isBoardMember: boolean
}

export function FlightlogContent({ aircraftId, userId, isBoardMember }: FlightlogContentProps) {
  const [flightlogs, setFlightlogs] = useState<FlightlogWithTimes[]>([])
  const [filteredFlightlogs, setFilteredFlightlogs] = useState<FlightlogWithTimes[]>([])
  const [aircraft, setAircraft] = useState<{ id: string; tail_number: string; type: string } | null>(null)
  const [aircraftTotals, setAircraftTotals] = useState<{ total_flight_hours: number; total_landings: number; initial_flight_hours: number; initial_landings: number } | null>(null)
  const [users, setUsers] = useState<Array<{ id: string; name: string; surname: string; email: string }>>([])
  const [operationTypes, setOperationTypes] = useState<OperationType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPilot, setSelectedPilot] = useState<string>('all')

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<FlightlogWithTimes | undefined>()

  // Load data
  useEffect(() => {
    loadData()
  }, [aircraftId])

  // Filter flightlogs when pilot filter changes
  useEffect(() => {
    let filtered = flightlogs.filter(f => f.plane_id === aircraftId)

    if (selectedPilot !== 'all') {
      filtered = filtered.filter(f => f.pilot_id === selectedPilot)
    }

    setFilteredFlightlogs(filtered)
  }, [selectedPilot, flightlogs, aircraftId])

  const loadData = async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true)
    }

    const [flightlogsResult, aircraftResult, usersResult, operationTypesResult] = await Promise.all([
      getFlightlogs(),
      getActiveAircraftForFlightlog(),
      getAllUsers(),
      getOperationTypesForPlane(aircraftId),
    ])

    if (flightlogsResult.error) {
      toast.error('Failed to load flightlogs')
      console.error(flightlogsResult.error)
    } else {
      const filtered = (flightlogsResult.data || []).filter(f => f.plane_id === aircraftId)
      setFlightlogs(filtered)
      setFilteredFlightlogs(filtered)
    }

    if (aircraftResult.error) {
      toast.error('Failed to load aircraft')
      console.error(aircraftResult.error)
    } else {
      const currentAircraft = (aircraftResult.data || []).find(a => a.id === aircraftId)
      setAircraft(currentAircraft || null)
    }

    if (usersResult.error) {
      toast.error('Failed to load users')
      console.error(usersResult.error)
    } else {
      setUsers(usersResult.data || [])
    }

    if (operationTypesResult.error) {
      toast.error('Failed to load operation types')
      console.error(operationTypesResult.error)
    } else {
      setOperationTypes(operationTypesResult.data || [])
    }

    // Fetch aircraft totals from the view
    const supabase = createClient()
    const { data: totalsData, error: totalsError } = await supabase
      .from('aircraft_totals')
      .select('total_flight_hours, total_landings, initial_flight_hours, initial_landings')
      .eq('id', aircraftId)
      .single()

    if (totalsError) {
      console.error('Failed to load aircraft totals:', totalsError)
    } else {
      setAircraftTotals(totalsData)
    }

    if (showLoading) {
      setIsLoading(false)
    }
  }

  const handleSelectEntry = (entry: FlightlogWithTimes) => {
    if (entry.charged) {
      return toast.error('This entry is charged and cannot be edited. Please charge back to the user before editing.')
    }
    if (entry.locked && !isBoardMember) {
      return toast.error('This entry is locked and cannot be edited.')
    }
    else if ((entry.pilot_id !== userId) && (entry.copilot_id !== userId) && !isBoardMember) {
      return toast.error('Only the pilot(s) or board members can edit this entry.')
    }
    setSelectedEntry(entry)
    setDialogOpen(true)
  }

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setSelectedEntry(undefined)
      // Reload data when dialog closes without showing loading spinner
      loadData(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[600px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Get unique operation types from filtered flightlogs
  const uniqueOperationTypes = Array.from(
    new Map(
      filteredFlightlogs
        .filter(f => f.operation_type_id && f.operation_type_color)
        .map(f => [f.operation_type_id, { name: f.operation_type_name, color: f.operation_type_color }])
    ).values()
  )

  return (
    <div className="space-y-2">
      {/* Header with Aircraft Info */}
      <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
        <Link href="/flightlog">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-2 flex-1">
          <PlaneIcon className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <h2 className="font-semibold text-lg">{aircraft?.tail_number || 'Loading...'}</h2>
            <p className="text-xs text-muted-foreground">{aircraft?.type || ''}</p>
          </div>
          {aircraftTotals && (
            <div className="flex gap-4 ml-auto">
              <div className="flex items-center gap-1.5 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="font-mono font-medium">
                    {Math.floor(aircraftTotals.total_flight_hours)}:{((aircraftTotals.total_flight_hours % 1) * 60).toFixed(0).padStart(2, '0')}
                  </span>
                  <span className="text-xs text-muted-foreground">Total Hours</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <Target className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="font-mono font-medium">{aircraftTotals.total_landings}</span>
                  <span className="text-xs text-muted-foreground">Total Landings</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Operation Types Legend */}
      {uniqueOperationTypes.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border bg-card p-2 text-xs">
          <span className="text-muted-foreground font-medium">Operation Types:</span>
          <div className="flex gap-3">
            {uniqueOperationTypes.map((opType, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <div
                  className="h-3 w-1 rounded-full"
                  style={{ backgroundColor: opType.color || undefined }}
                />
                <span>{opType.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar with Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-lg border bg-card p-3">
        {/* Left side: Filters */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center flex-1">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedPilot} onValueChange={setSelectedPilot}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Pilots" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pilots</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} {user.surname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Info badges */}
          <div className="flex flex-wrap gap-2 items-center ml-auto lg:ml-0">
            <div className="text-xs text-muted-foreground">
              {filteredFlightlogs.length} {filteredFlightlogs.length === 1 ? 'entry' : 'entries'}
            </div>
          </div>
        </div>

        {/* Right side: Create Button */}
        <Button
          size="sm"
          onClick={() => {
            setSelectedEntry(undefined)
            setDialogOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Entry
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Date</TableHead>
              <TableHead className="hidden md:table-cell">Route</TableHead>
              <TableHead>Times / Landings</TableHead>
              <TableHead>Crew</TableHead>
              <TableHead className="text-right">
                <div className="flex flex-col items-end">
                  <span>Block Time</span>
                  <span className="text-xs font-normal text-muted-foreground">Flight Time</span>
                </div>
              </TableHead>
              <TableHead className="text-right hidden sm:table-cell">Fuel/Oil</TableHead>
              <TableHead className="text-right">Totals</TableHead>
              <TableHead className="text-center hidden sm:table-cell">M&B</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFlightlogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No flightlog entries found
                </TableCell>
              </TableRow>
            ) : (
              filteredFlightlogs.map((entry, index) => {
                // Calculate HH:MM format for durations
                const blockMinutes = Math.round((entry.block_time_hours || 0) * 60)
                const blockHours = Math.floor(blockMinutes / 60)
                const blockMins = blockMinutes % 60
                const blockTimeFormatted = `${blockHours}:${blockMins.toString().padStart(2, '0')}`

                const flightMinutes = Math.round((entry.flight_time_hours || 0) * 60)
                const flightHours = Math.floor(flightMinutes / 60)
                const flightMins = flightMinutes % 60
                const flightTimeFormatted = `${flightHours}:${flightMins.toString().padStart(2, '0')}`

                // Calculate running totals (sum all entries from the end up to and including current one)
                // Since filteredFlightlogs are in reverse chronological order (newest first),
                // we need to sum from this index to the end to get all older flights
                const entriesFromThisPointToOldest = filteredFlightlogs.slice(index)
                const totalFlightHours = (aircraftTotals?.initial_flight_hours || 0) + entriesFromThisPointToOldest.reduce((sum, e) => sum + (e.flight_time_hours || 0), 0)
                const totalLandings = (aircraftTotals?.initial_landings || 0) + entriesFromThisPointToOldest.reduce((sum, e) => sum + (e.landings || 0), 0)

                const totalFlightMinutes = Math.round(totalFlightHours * 60)
                const totalFlightHoursWhole = Math.floor(totalFlightMinutes / 60)
                const totalFlightMins = totalFlightMinutes % 60
                const totalFlightTimeFormatted = `${totalFlightHoursWhole}:${totalFlightMins.toString().padStart(2, '0')}`

                // Format crew
                const crewText = entry.copilot_name
                  ? `${entry.pilot_name} ${entry.pilot_surname} / ${entry.copilot_name} ${entry.copilot_surname}`
                  : `${entry.pilot_name} ${entry.pilot_surname}`

                return (
                  <TableRow
                    key={entry.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSelectEntry(entry)}
                  >
                    <TableCell className="font-medium text-sm">
                      <div className="flex items-center gap-2">
                        {entry.operation_type_color && (
                          <div
                            className="h-3 w-1 rounded-full flex-shrink-0"
                            style={{ backgroundColor: entry.operation_type_color }}
                            title={entry.operation_type_name || undefined}
                          />
                        )}
                        <div>
                          <span className="hidden sm:inline">{format(new Date(entry.block_off), 'MMM dd, yyyy')}</span>
                          <span className="sm:hidden">{format(new Date(entry.block_off), 'MMM dd')}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs hidden md:table-cell">
                      {entry.icao_departure && entry.icao_destination ? (
                        <span>{entry.icao_departure} → {entry.icao_destination}</span>
                      ) : entry.icao_departure ? (
                        <span>{entry.icao_departure} →</span>
                      ) : entry.icao_destination ? (
                        <span>→ {entry.icao_destination}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                          <span className="text-muted-foreground">
                            {format(new Date(entry.block_off), 'HH:mm')} / {format(new Date(entry.takeoff_time), 'HH:mm')}
                          </span>
                          <span className="text-muted-foreground">
                            {format(new Date(entry.landing_time), 'HH:mm')} / {format(new Date(entry.block_on), 'HH:mm')}
                          </span>
                        </div>
                        <div className="text-xs px-1.5 py-0.5 rounded bg-muted font-medium" title="Landings">
                          {entry.landings || 1}×
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {crewText}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      <div className="flex flex-col items-end">
                        <span title="Block Time">{blockTimeFormatted}</span>
                        <span title="Flight Time">{flightTimeFormatted}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs hidden sm:table-cell">
                      <div className="flex flex-col items-end">
                        <span title="Fuel">{entry.fuel ? `${entry.fuel.toFixed(1)}L` : '—'}</span>
                        <span title="Oil">{entry.oil ? `${entry.oil.toFixed(1)}L` : '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      <div className="flex flex-col items-end">
                        <span title="Total Flight Hours" className="font-medium">{totalFlightTimeFormatted}</span>
                        <span title="Total Landings" className="text-muted-foreground">{totalLandings} ldg</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center hidden sm:table-cell">
                      {entry.m_and_b_pdf_url ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.open(entry.m_and_b_pdf_url!, '_blank')
                          }}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {entry.needs_board_review && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="mr-1 h-2 w-2" />
                            <span className="hidden sm:inline">Review</span>
                            <span className="sm:hidden">!</span>
                          </Badge>
                        )}
                        {entry.locked && (
                          <Badge variant="secondary" className="text-xs">
                            <Lock className="mr-1 h-2 w-2" />
                            <span className="hidden sm:inline">Locked</span>
                          </Badge>
                        )}
                        {entry.charged && (
                          <Badge variant="default" className="text-xs">
                            <span className="hidden sm:inline">Charged</span>
                            <span className="sm:hidden">C</span>
                          </Badge>
                        )}
                        {!entry.locked && !entry.charged && !entry.needs_board_review && (
                          <Badge variant="outline" className="text-xs hidden sm:inline-flex">Editable</Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Flightlog Dialog */}
      {aircraft && (
        <FlightlogDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          aircraft={aircraft}
          aircraftId={aircraftId}
          users={users}
          operationTypes={operationTypes}
          existingEntry={selectedEntry}
          currentUserId={userId}
          isBoardMember={isBoardMember}
        />
      )}
    </div>
  )
}
