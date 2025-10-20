'use client'

import {Calendar, dateFnsLocalizer} from 'react-big-calendar'
import {addDays, addMonths, format, isBefore, parse, startOfDay, startOfWeek, startOfMonth, getDay} from 'date-fns'
import {enUS} from 'date-fns/locale'
import {useMemo, useState} from 'react'
import type {ActiveReservation} from '@/lib/database.types'
import {CalendarToolbar} from './calendar-toolbar'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import './calendar-styles.css'

type CustomView = 'day' | 'month'

interface Resource {
  id: string
  title: string
  color?: string | null
}

const locales = {
  'en-US': enUS,
}

// IMPORTANT: start of week, getDay are needed(!) for date-fns localizer to work properly in month view
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

interface ReservationCalendarProps {
  reservations: ActiveReservation[]
  aircraft: { id: string; tail_number: string; type: string; color: string | null }[]
  onSelectSlot: (start: Date, end: Date, aircraftId?: string) => void
  onSelectEvent: (reservation: ActiveReservation) => void
}

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: ActiveReservation
}

export function ReservationCalendar({
  reservations,
  aircraft,
  onSelectSlot,
  onSelectEvent,
}: ReservationCalendarProps) {
  const [customView, setCustomView] = useState<CustomView>('day')
  const [date, setDate] = useState(new Date())

  // Calculate the date range based on custom view
  const dateRange = useMemo(() => {
    const start = startOfDay(date)
    if (customView === 'month') {
      const monthStart = startOfMonth(date)
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)
      return {
        start: monthStart,
        end: monthEnd
      }
    }
    return {
      start,
      end: start
    }
  }, [date, customView])

  // Handle navigation with past date restriction
  const handleNavigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
    let newDate: Date

    if (action === 'TODAY') {
      newDate = new Date()
    } else if (action === 'NEXT') {
      if (customView === 'month') {
        newDate = addMonths(date, 1)
      } else {
        newDate = addDays(date, 1)
      }
    } else {
      // PREV
      if (customView === 'month') {
        newDate = addMonths(date, -1)
      } else {
        newDate = addDays(date, -1)
      }
    }

    // Check if new date is in the past
    if (isBefore(newDate, startOfDay(new Date()))) {
      return // Don't allow navigation to past
    }

    setDate(newDate)
  }

  // Handle date selector
  const handleDateSelect = (newDate: Date) => {
    // Check if new date is in the past
    if (isBefore(startOfDay(newDate), startOfDay(new Date()))) {
      return // Don't allow navigation to past
    }
    setDate(newDate)
  }

  // Use all active aircraft as resources (not just those with reservations)
  const resources = useMemo<Resource[]>(() => {
    return aircraft.map(plane => ({
      id: plane.id,
      title: `✈️ ${plane.tail_number}`,
      color: plane.color,
    }))
  }, [aircraft])

  // Transform reservations into calendar events
  const events = useMemo<CalendarEvent[]>(() => {
    // Filter out cancelled reservations entirely - we don't show them anymore
    const filteredReservations = reservations.filter(r => r.status !== 'cancelled')

    return filteredReservations.map(reservation => {
      // Format title based on view
      let title: string

      if (customView === 'month') {
        // Month view: show time and tail number
        const startTime = format(new Date(reservation.start_time), 'HH:mm')
        const priorityIndicator = reservation.priority ? '⭐ ' : ''
        title = `${priorityIndicator}${startTime} ${reservation.tail_number}`
      } else {
        // Day/3-day view: show user name and status
        const statusIndicator = reservation.status === 'standby' ? ' [STANDBY]' :
                               reservation.status === 'cancelled' ? ' [CANCELLED]' : ''
        const priorityIndicator = reservation.priority ? '⭐ ' : ''
        title = `${priorityIndicator}${reservation.user_name} ${reservation.user_surname}${statusIndicator}`
      }

      // Parse the ISO string timestamps correctly
      // If the string doesn't end with 'Z', it's stored without timezone
      // and should be treated as local time, not UTC
      let startTimeStr = reservation.start_time
      let endTimeStr = reservation.end_time

      // If timestamps don't have timezone info, treat them as local
      if (!startTimeStr.endsWith('Z') && !startTimeStr.includes('+') && !startTimeStr.includes('-', 10)) {
        // No timezone info - treat as local time by removing any timezone conversion
        startTimeStr = startTimeStr.replace('T', ' ').replace(/\.\d+$/, '')
        const [datePart, timePart] = startTimeStr.split(' ')
        const [year, month, day] = datePart.split('-').map(Number)
        const [hour, minute, second = 0] = timePart.split(':').map(Number)
        var startDate = new Date(year, month - 1, day, hour, minute, second)
      } else {
        var startDate = new Date(startTimeStr)
      }

      if (!endTimeStr.endsWith('Z') && !endTimeStr.includes('+') && !endTimeStr.includes('-', 10)) {
        endTimeStr = endTimeStr.replace('T', ' ').replace(/\.\d+$/, '')
        const [datePart, timePart] = endTimeStr.split(' ')
        const [year, month, day] = datePart.split('-').map(Number)
        const [hour, minute, second = 0] = timePart.split(':').map(Number)
        var endDate = new Date(year, month - 1, day, hour, minute, second)
      } else {
        var endDate = new Date(endTimeStr)
      }

      return {
        id: reservation.id,
        title,
        start: startDate,
        end: endDate,
        resource: reservation,
        resourceId: reservation.plane_id, // Link event to aircraft resource
      }
    })
  }, [reservations, customView])

  // Custom event style getter
  const eventStyleGetter = (event: CalendarEvent) => {
    const reservation = event.resource
    let backgroundColor = '#3b82f6' // blue for active
    let border = '0px'
    let opacity = 0.9
    let backgroundImage = 'none'
    let width = '85%' // Default for active (wider than standby)
    let marginLeft = '0'
    let position = 'absolute' as const
    let left = '2px' // Small offset from left edge
    let maxWidth = '85%'
    let zIndex = 1

    if (reservation.status === 'standby') {
      backgroundColor = '#f59e0b' // amber for standby
      // Add striped pattern for standby
      backgroundImage = 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,.1) 10px, rgba(0,0,0,.1) 20px)'
      border = '2px dashed rgba(245, 158, 11, 0.8)'
      opacity = 0.9
      // Standby: 40% width, positioned to the right, overlaying active
      width = '40%'
      maxWidth = '40%'
      marginLeft = '0'
      position = 'absolute'
      left = '58%' // Position more to the right, overlaying the right portion of active
      zIndex = 2 // Above active
    } else {
      // Active: 85% width (clearly wider than standby), positioned at left
      width = '85%'
      maxWidth = '85%'
      marginLeft = '0'
      position = 'absolute'
      left = '2px'
      zIndex = 1 // Base layer
    }

    if (reservation.priority && reservation.status === 'active') {
      backgroundColor = '#8b5cf6' // purple for priority
      border = '2px solid #a78bfa'
    }

    return {
      style: {
        backgroundColor,
        backgroundImage,
        borderRadius: '2px',
        opacity,
        color: 'white',
        border,
        display: 'block',
        fontSize: customView === 'month' ? '0.6rem' : '0.65rem',
        padding: customView === 'month' ? '0px 2px' : '1px 2px',
        lineHeight: '1',
        fontWeight: reservation.status === 'standby' ? '600' : '500',
        whiteSpace: 'nowrap' as const,
        overflow: 'hidden' as const,
        textOverflow: 'ellipsis' as const,
        width,
        maxWidth,
        marginLeft,
        position,
        left,
        zIndex,
      },
    }
  }

  return (
    <div className="space-y-4">
      {/* Custom Toolbar */}
      <CalendarToolbar
        date={date}
        view={customView}
        onNavigate={handleNavigate}
        onViewChange={setCustomView}
        onDateSelect={handleDateSelect}
        dateRange={dateRange}
      />

      {/* Calendar */}
      <div className={`h-[800px] calendar-view-${customView}`}>
        <Calendar
          localizer={localizer}
          events={events}
          resources={resources}
          resourceIdAccessor="id"
          resourceTitleAccessor="title"
          startAccessor="start"
          endAccessor="end"
          view={customView === 'day' ? 'day' : 'month'}
          onView={() => {}} // Disable built-in view change
          date={date}
          onNavigate={() => {}} // Disable built-in navigation
          onSelectSlot={(slotInfo) => {
            // When clicking on a specific aircraft row, pass the resource ID (aircraft ID)
            const aircraftId = slotInfo.resourceId as string | undefined
            onSelectSlot(slotInfo.start, slotInfo.end, aircraftId)
          }}
          onSelectEvent={(event) => onSelectEvent(event.resource)}
          selectable
          eventPropGetter={eventStyleGetter}
          views={['day', 'week', 'month']}
          step={30}
          timeslots={2}
          min={new Date(2025, 0, 1, 6, 0, 0)} // 6:00 AM
          max={new Date(2025, 0, 1, 22, 0, 0)} // 10:00 PM
          showMultiDayTimes
          defaultView="day"
          toolbar={false} // Hide default toolbar
          style={{ height: '100%' }}
          popup
          popupOffset={5}
          messages={{
            showMore: (total) => `+${total} more`,
          }}
        />
      </div>
    </div>
  )
}
