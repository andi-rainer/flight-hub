'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'

type CustomView = 'day' | 'month'

interface CalendarToolbarProps {
  date: Date
  view: CustomView
  onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void
  onViewChange: (view: CustomView) => void
  onDateSelect: (date: Date) => void
  dateRange: { start: Date; end: Date }
}

export function CalendarToolbar({ date, view, onNavigate, onViewChange, onDateSelect, dateRange }: CalendarToolbarProps) {
  const getDateLabel = () => {
    if (view === 'month') {
      return format(date, 'MMMM yyyy')
    } else {
      return format(date, 'EEEE, MMMM dd, yyyy')
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-2 p-3 border rounded-lg bg-card">
      {/* Navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate('PREV')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate('TODAY')}
        >
          Today
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate('NEXT')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Date Selector */}
        <Input
          type="date"
          value={format(date, 'yyyy-MM-dd')}
          onChange={(e) => {
            if (e.target.value) {
              const selectedDate = new Date(e.target.value)
              onDateSelect(selectedDate)
            }
          }}
          min={format(new Date(), 'yyyy-MM-dd')}
          className="w-[140px] h-9 text-xs"
        />
      </div>

      {/* Date Label */}
      <div className="text-base font-semibold text-center">
        {getDateLabel()}
      </div>

      {/* View Switcher */}
      <div className="flex gap-1">
        <Button
          variant={view === 'day' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewChange('day')}
        >
          Day
        </Button>
        <Button
          variant={view === 'month' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewChange('month')}
        >
          Month
        </Button>
      </div>
    </div>
  )
}
