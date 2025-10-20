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
import { ReservationCalendar } from './components/reservation-calendar'
import { ReservationDialog } from './components/reservation-dialog'
import { getReservations, getActiveAircraft } from './actions'
import { createClient } from '@/lib/supabase/client'
import type { ActiveReservation, Plane } from '@/lib/database.types'
import { Plus, Filter, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ReservationsContentProps {
  userId: string
  isBoardMember: boolean
}

export function ReservationsContent({ userId, isBoardMember }: ReservationsContentProps) {
  const [reservations, setReservations] = useState<ActiveReservation[]>([])
  const [aircraft, setAircraft] = useState<Pick<Plane, 'id' | 'tail_number' | 'type' | 'color'>[]>([])
  const [filteredReservations, setFilteredReservations] = useState<ActiveReservation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedAircraft, setSelectedAircraft] = useState<string>('all')

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedSlotStart, setSelectedSlotStart] = useState<Date | undefined>()
  const [selectedSlotEnd, setSelectedSlotEnd] = useState<Date | undefined>()
  const [selectedReservation, setSelectedReservation] = useState<ActiveReservation | undefined>()

  // Load data
  useEffect(() => {
    loadData()
  }, [])

  // Real-time subscription for reservations table changes
  useEffect(() => {
    const supabase = createClient()

    console.log('Setting up reservations real-time subscription...')

    // Subscribe to all changes on reservations table
    const reservationsSubscription = supabase
      .channel('reservations-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'reservations',
        },
        (payload) => {
          console.log('Real-time reservation change detected:', payload.eventType, payload)
          // Refetch reservations when any change occurs
          loadData(false) // false = don't show loading spinner
        }
      )
      .subscribe((status) => {
        console.log('Reservations subscription status:', status)
      })

    // Cleanup subscription on unmount
    return () => {
      console.log('Cleaning up reservations subscription')
      reservationsSubscription.unsubscribe()
    }
  }, [])

  const loadData = async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true)
    }

    const [reservationsResult, aircraftResult] = await Promise.all([
      getReservations(),
      getActiveAircraft(),
    ])

    if (reservationsResult.error) {
      toast.error('Failed to load reservations')
      console.error(reservationsResult.error)
    } else {
      setReservations(reservationsResult.data || [])
    }

    if (aircraftResult.error) {
      toast.error('Failed to load aircraft')
      console.error(aircraftResult.error)
    } else {
      setAircraft(aircraftResult.data || [])
    }

    if (showLoading) {
      setIsLoading(false)
    }
  }

  // Filter reservations when aircraft filter changes
  useEffect(() => {
    if (selectedAircraft === 'all') {
      setFilteredReservations(reservations)
    } else {
      setFilteredReservations(reservations.filter(r => r.plane_id === selectedAircraft))
    }
  }, [selectedAircraft, reservations])

  const handleSelectSlot = (start: Date, end: Date) => {
    setSelectedSlotStart(start)
    setSelectedSlotEnd(end)
    setSelectedReservation(undefined)
    setDialogOpen(true)
  }

  const handleSelectEvent = (reservation: ActiveReservation) => {
    setSelectedReservation(reservation)
    setSelectedSlotStart(undefined)
    setSelectedSlotEnd(undefined)
    setDialogOpen(true)
  }

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
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
      {/* Toolbar with Filter and Legend */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-lg border bg-card p-3">
        {/* Left side: Filter and Legend */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center flex-1">
          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedAircraft} onValueChange={setSelectedAircraft}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by aircraft" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Aircraft</SelectItem>
                {aircraft.map((plane) => (
                  <SelectItem key={plane.id} value={plane.id}>
                    {plane.tail_number} - {plane.type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-blue-500" />
              <span className="text-xs text-muted-foreground">Active</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-amber-500 border border-dashed border-amber-600" style={{backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,.15) 3px, rgba(0,0,0,.15) 6px)'}} />
              <span className="text-xs text-muted-foreground">Standby</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-purple-500 border border-purple-400" />
              <span className="text-xs text-muted-foreground">Priority</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-gray-500 opacity-60" />
              <span className="text-xs text-muted-foreground">Cancelled</span>
            </div>
          </div>
        </div>

        {/* Right side: Create Button */}
        <Button
          size="sm"
          onClick={() => {
            setSelectedReservation(undefined)
            setSelectedSlotStart(undefined)
            setSelectedSlotEnd(undefined)
            setDialogOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Reservation
        </Button>
      </div>

      {/* Calendar */}
      <div className="rounded-lg border bg-card p-4">
        <ReservationCalendar
          reservations={filteredReservations}
          aircraft={aircraft}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
        />
      </div>

      {/* Reservation Dialog */}
      <ReservationDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        aircraft={aircraft}
        initialStartTime={selectedSlotStart}
        initialEndTime={selectedSlotEnd}
        existingReservation={selectedReservation}
        currentUserId={userId}
        isBoardMember={isBoardMember}
      />
    </div>
  )
}
