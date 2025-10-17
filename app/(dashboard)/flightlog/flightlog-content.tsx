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
import { getFlightlogs, getAllUsers, getActiveAircraftForFlightlog } from './actions'
import type { FlightlogWithTimes } from '@/lib/database.types'
import { Plus, Filter, Loader2, Lock, ExternalLink, Plane as PlaneIcon } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface FlightlogContentProps {
  userId: string
  isBoardMember: boolean
}

export function FlightlogContent({ userId, isBoardMember }: FlightlogContentProps) {
  const [flightlogs, setFlightlogs] = useState<FlightlogWithTimes[]>([])
  const [filteredFlightlogs, setFilteredFlightlogs] = useState<FlightlogWithTimes[]>([])
  const [aircraft, setAircraft] = useState<Array<{ id: string; tail_number: string; type: string }>>([])
  const [users, setUsers] = useState<Array<{ id: string; name: string; surname: string; email: string }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedAircraft, setSelectedAircraft] = useState<string>('all')
  const [selectedPilot, setSelectedPilot] = useState<string>('all')

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<FlightlogWithTimes | undefined>()

  // Load data
  useEffect(() => {
    loadData()
  }, [])

  // Filter flightlogs when filters change
  useEffect(() => {
    let filtered = flightlogs

    if (selectedAircraft !== 'all') {
      filtered = filtered.filter(f => f.plane_id === selectedAircraft)
    }

    if (selectedPilot !== 'all') {
      filtered = filtered.filter(f => f.pilot_id === selectedPilot)
    }

    setFilteredFlightlogs(filtered)
  }, [selectedAircraft, selectedPilot, flightlogs])

  const loadData = async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true)
    }

    const [flightlogsResult, aircraftResult, usersResult] = await Promise.all([
      getFlightlogs(),
      getActiveAircraftForFlightlog(),
      getAllUsers(),
    ])

    if (flightlogsResult.error) {
      toast.error('Failed to load flightlogs')
      console.error(flightlogsResult.error)
    } else {
      setFlightlogs(flightlogsResult.data || [])
      setFilteredFlightlogs(flightlogsResult.data || [])
    }

    if (aircraftResult.error) {
      toast.error('Failed to load aircraft')
      console.error(aircraftResult.error)
    } else {
      setAircraft(aircraftResult.data || [])
    }

    if (usersResult.error) {
      toast.error('Failed to load users')
      console.error(usersResult.error)
    } else {
      setUsers(usersResult.data || [])
    }

    if (showLoading) {
      setIsLoading(false)
    }
  }

  const handleSelectEntry = (entry: FlightlogWithTimes) => {
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

  return (
    <div className="space-y-2">
      {/* Toolbar with Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-lg border bg-card p-3">
        {/* Left side: Filters */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center flex-1">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedAircraft} onValueChange={setSelectedAircraft}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Aircraft" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Aircraft</SelectItem>
                {aircraft.map((plane) => (
                  <SelectItem key={plane.id} value={plane.id}>
                    {plane.tail_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
              <TableHead>Aircraft</TableHead>
              <TableHead>Pilot</TableHead>
              <TableHead>Copilot</TableHead>
              <TableHead className="text-right">Block Time</TableHead>
              <TableHead className="text-right">Flight Time</TableHead>
              <TableHead className="text-center">M&B</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFlightlogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No flightlog entries found
                </TableCell>
              </TableRow>
            ) : (
              filteredFlightlogs.map((entry) => (
                <TableRow
                  key={entry.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSelectEntry(entry)}
                >
                  <TableCell className="font-medium">
                    {format(new Date(entry.block_on), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <PlaneIcon className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{entry.tail_number}</span>
                      <span className="text-xs text-muted-foreground">({entry.plane_type})</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {entry.pilot_name} {entry.pilot_surname}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {entry.copilot_name ? `${entry.copilot_name} ${entry.copilot_surname}` : '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {entry.block_time_hours?.toFixed(2)} hrs
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {entry.flight_time_hours?.toFixed(2)} hrs
                  </TableCell>
                  <TableCell className="text-center">
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
                    <div className="flex gap-1">
                      {entry.locked && (
                        <Badge variant="secondary" className="text-xs">
                          <Lock className="mr-1 h-2 w-2" />
                          Locked
                        </Badge>
                      )}
                      {entry.charged && (
                        <Badge variant="default" className="text-xs">Charged</Badge>
                      )}
                      {!entry.locked && !entry.charged && (
                        <Badge variant="outline" className="text-xs">Editable</Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Flightlog Dialog */}
      <FlightlogDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        aircraft={aircraft}
        users={users}
        existingEntry={selectedEntry}
        currentUserId={userId}
        isBoardMember={isBoardMember}
      />
    </div>
  )
}
