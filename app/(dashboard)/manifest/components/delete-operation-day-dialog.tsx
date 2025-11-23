'use client'

import { useState } from 'react'
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
import { deleteOperationDay } from '@/lib/actions/manifest'
import { useRouter } from 'next/navigation'

interface OperationDay {
  id: string
  operation_date: string
}

interface DeleteOperationDayDialogProps {
  operationDay: OperationDay
}

export function DeleteOperationDayDialog({ operationDay }: DeleteOperationDayDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      const result = await deleteOperationDay(operationDay.id)

      if (result.success) {
        toast.success('Operation day deleted successfully')
        setOpen(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to delete operation day')
      }
    } catch (error) {
      console.error('Error deleting operation day:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Operation Day?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the operation day scheduled for{' '}
            <strong>{new Date(operationDay.operation_date).toLocaleDateString()}</strong>.
            This action cannot be undone.
            <br />
            <br />
            Note: You can only delete operation days with no scheduled flights.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleDelete()
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete Operation Day'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
