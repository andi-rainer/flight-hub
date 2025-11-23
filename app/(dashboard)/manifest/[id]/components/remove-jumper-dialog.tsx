'use client'

import { useState, ReactNode } from 'react'
import { Trash2 } from 'lucide-react'
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
import { removeJumper } from '@/lib/actions/manifest'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface RemoveJumperDialogProps {
  jumper: any
  flightStatus: string
  trigger?: ReactNode
}

export function RemoveJumperDialog({ jumper, flightStatus, trigger }: RemoveJumperDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  const canRemove = flightStatus !== 'completed' && flightStatus !== 'cancelled'

  const handleRemove = async () => {
    if (!canRemove) {
      toast.error('Cannot remove jumpers from completed or cancelled flights')
      return
    }

    setIsRemoving(true)
    try {
      const result = await removeJumper(jumper.id)

      if (result.success) {
        toast.success(
          jumper.jumper_type === 'sport'
            ? 'Sport jumper removed'
            : 'Tandem pair removed'
        )
        setOpen(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to remove jumper')
      }
    } catch (error) {
      console.error('Error removing jumper:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsRemoving(false)
    }
  }

  if (!canRemove) {
    return null
  }

  const jumperDescription =
    jumper.jumper_type === 'sport'
      ? `${jumper.sport_jumper?.name} ${jumper.sport_jumper?.surname} (Slot ${jumper.slot_number})`
      : `${jumper.tandem_master?.name} + ${jumper.passenger?.name} (Slots ${jumper.slot_number}-${jumper.slot_number + (jumper.slots_occupied || 2) - 1})`

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Jumper</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove this jumper from the flight?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="mt-2 p-3 bg-muted rounded-md">
          <strong>{jumperDescription}</strong>
        </div>
        {jumper.jumper_type === 'tandem' && (
          <p className="mt-2 text-sm text-muted-foreground">
            Note: This will remove the entire tandem pair and free up both slots.
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleRemove()
            }}
            disabled={isRemoving}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isRemoving ? 'Removing...' : 'Remove'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
