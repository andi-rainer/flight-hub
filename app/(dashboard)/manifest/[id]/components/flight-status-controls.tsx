'use client'

import { useState } from 'react'
import { ChevronRight, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { updateFlight } from '@/lib/actions/manifest'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface FlightStatusControlsProps {
  flight: any
  canManage: boolean
  variant?: 'default' | 'compact'
}

type FlightStatus = 'planned' | 'ready' | 'boarding' | 'in_air' | 'completed' | 'cancelled'

const STATUS_PROGRESSION: Record<FlightStatus, FlightStatus | null> = {
  planned: 'ready',
  ready: 'boarding',
  boarding: 'in_air',
  in_air: 'completed',
  completed: null,
  cancelled: null,
}

const STATUS_LABELS: Record<FlightStatus, string> = {
  planned: 'Planned',
  ready: 'Ready',
  boarding: 'Boarding',
  in_air: 'In Air',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const STATUS_ACTIONS: Record<FlightStatus, string> = {
  planned: 'Mark Ready',
  ready: 'Start Boarding',
  boarding: 'Mark In Air',
  in_air: 'Complete',
  completed: '',
  cancelled: '',
}

export function FlightStatusControls({
  flight,
  canManage,
  variant = 'default',
}: FlightStatusControlsProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)

  const currentStatus = flight.status as FlightStatus
  const nextStatus = STATUS_PROGRESSION[currentStatus]

  const handleProgressStatus = async () => {
    if (!nextStatus) return

    setIsUpdating(true)
    try {
      const result = await updateFlight(flight.id, { status: nextStatus })

      if (result.success) {
        toast.success(`Flight status updated to ${STATUS_LABELS[nextStatus]}`)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to update flight status')
      }
    } catch (error) {
      console.error('Error updating flight status:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleUncancel = async () => {
    setIsUpdating(true)
    try {
      const result = await updateFlight(flight.id, { status: 'planned' })

      if (result.success) {
        toast.success('Flight reactivated and set to planned status')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to reactivate flight')
      }
    } catch (error) {
      console.error('Error reactivating flight:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsUpdating(false)
    }
  }

  if (!canManage || currentStatus === 'completed') {
    return null
  }

  // Show un-cancel button for cancelled flights
  if (currentStatus === 'cancelled') {
    return (
      <Button
        onClick={handleUncancel}
        disabled={isUpdating}
        size="sm"
        variant="outline"
        className={variant === 'compact' ? 'w-full' : ''}
      >
        <RotateCcw className="mr-2 h-4 w-4" />
        Reactivate Flight
      </Button>
    )
  }

  if (variant === 'compact') {
    return nextStatus ? (
      <Button
        onClick={handleProgressStatus}
        disabled={isUpdating}
        size="sm"
        className="w-full"
      >
        <ChevronRight className="mr-2 h-4 w-4" />
        {STATUS_ACTIONS[currentStatus]}
      </Button>
    ) : null
  }

  return nextStatus ? (
    <Button
      onClick={handleProgressStatus}
      disabled={isUpdating}
      size="sm"
      variant="default"
    >
      <ChevronRight className="mr-2 h-4 w-4" />
      {STATUS_ACTIONS[currentStatus]}
    </Button>
  ) : null
}
