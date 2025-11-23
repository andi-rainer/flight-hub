'use client'

import { useState, ReactNode } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { toast } from 'sonner'
import { deleteFlight } from '@/lib/actions/manifest'
import { useRouter } from 'next/navigation'

interface DeleteFlightDialogProps {
  flight: any
  trigger?: ReactNode
}

export function DeleteFlightDialog({ flight, trigger }: DeleteFlightDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      const result = await deleteFlight(flight.id)

      if (result.success) {
        toast.success('Flight deleted successfully')
        setOpen(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to delete flight')
      }
    } catch (error) {
      console.error('Error deleting flight:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsDeleting(false)
    }
  }

  // Don't allow deletion if flight has jumpers or is completed
  const canDelete = flight.status !== 'completed' && flight.status !== 'cancelled'

  if (!canDelete) {
    return null
  }

  const hasJumpers =
    (flight.sport_jumpers && flight.sport_jumpers.length > 0) ||
    (flight.tandem_pairs && flight.tandem_pairs.length > 0)

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Flight #{flight.flight_number}?</AlertDialogTitle>
          <AlertDialogDescription>
            {hasJumpers ? (
              <span className="text-destructive font-medium">
                This flight has jumpers assigned. You must remove all jumpers before deleting the
                flight.
              </span>
            ) : (
              <>
                This action cannot be undone. This will permanently delete the flight scheduled for{' '}
                {flight.scheduled_time}.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting || hasJumpers}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete Flight'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
