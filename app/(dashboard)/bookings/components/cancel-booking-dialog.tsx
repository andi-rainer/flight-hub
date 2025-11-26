'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Ban } from 'lucide-react'
import { cancelBooking } from '@/lib/actions/bookings'

interface CancelBookingDialogProps {
  bookingId: string
}

export function CancelBookingDialog({ bookingId }: CancelBookingDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [reason, setReason] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!reason.trim()) {
      toast.error('Please provide a cancellation reason')
      return
    }

    startTransition(async () => {
      const result = await cancelBooking(bookingId, reason)

      if (result.success) {
        toast.success('Booking cancelled successfully')
        setOpen(false)
        setReason('')
        router.refresh()
      } else {
        toast.error('Failed to cancel booking', {
          description: result.error,
        })
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Ban className="mr-2 h-4 w-4" />
          Cancel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              This will permanently cancel the booking and free up the slot. The
              customer will not be able to use this booking.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">
                Cancellation Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Customer requested cancellation, No-show, Weather, etc."
                rows={4}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Close
            </Button>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? 'Cancelling...' : 'Cancel Booking'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
