'use client'

import { useState, ReactNode } from 'react'
import { XCircle, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { updateFlight, deleteFlight } from '@/lib/actions/manifest'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface CancelOrDeleteFlightDialogProps {
  flight: any
  trigger?: ReactNode
}

export function CancelOrDeleteFlightDialog({ flight, trigger }: CancelOrDeleteFlightDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const canCancel = flight.status !== 'completed'
  const canDelete = flight.status !== 'completed' && flight.status !== 'cancelled'
  const hasJumpers = (flight.sport_jumpers?.length > 0) || (flight.tandem_pairs?.length > 0)

  const handleCancel = async () => {
    setIsProcessing(true)
    try {
      const result = await updateFlight(flight.id, { status: 'cancelled' })

      if (result.success) {
        toast.success('Flight cancelled (can be reactivated later)')
        setOpen(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to cancel flight')
      }
    } catch (error) {
      console.error('Error cancelling flight:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDelete = async () => {
    setIsProcessing(true)
    try {
      const result = await deleteFlight(flight.id)

      if (result.success) {
        toast.success('Flight deleted permanently')
        setOpen(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to delete flight')
      }
    } catch (error) {
      console.error('Error deleting flight:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  if (!canCancel && !canDelete) {
    return null
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <XCircle className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel or Delete Flight</AlertDialogTitle>
          <AlertDialogDescription>
            What would you like to do with Load #{flight.flight_number}?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="mt-2 p-3 bg-muted rounded-md">
          <div className="text-sm">
            <strong>Time:</strong> {flight.scheduled_time}
          </div>
          {flight.pilot && (
            <div className="text-sm">
              <strong>Pilot:</strong> {flight.pilot.name} {flight.pilot.surname}
            </div>
          )}
          {hasJumpers && (
            <div className="text-sm">
              <strong>Jumpers:</strong> {(flight.sport_jumpers?.length || 0) + (flight.tandem_pairs?.length || 0)} assigned
            </div>
          )}
          <div className="text-sm">
            <strong>Status:</strong> {flight.status}
          </div>
        </div>

        {hasJumpers && canDelete && (
          <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Warning:</strong> This flight has jumpers assigned. You must remove all jumpers before deleting the flight.
            </p>
          </div>
        )}

        <div className="mt-4 space-y-2">
          <div className="text-sm">
            <strong>Cancel:</strong> Mark as cancelled (can be reactivated later)
          </div>
          <div className="text-sm">
            <strong>Delete:</strong> Permanently remove this flight (cannot be undone)
          </div>
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel disabled={isProcessing}>Keep Flight</AlertDialogCancel>
          {canCancel && (
            <Button
              onClick={(e) => {
                e.preventDefault()
                handleCancel()
              }}
              disabled={isProcessing}
              variant="outline"
              size="sm"
            >
              <XCircle className="mr-2 h-4 w-4" />
              {isProcessing ? 'Cancelling...' : 'Cancel Flight'}
            </Button>
          )}
          {canDelete && (
            <Button
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={isProcessing || hasJumpers}
              variant="destructive"
              size="sm"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isProcessing ? 'Deleting...' : 'Delete Forever'}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
