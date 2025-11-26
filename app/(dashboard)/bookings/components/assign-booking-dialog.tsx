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
import { toast } from 'sonner'
import { UserCheck } from 'lucide-react'
import { assignBookingToSlot } from '@/lib/actions/bookings'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface AssignBookingDialogProps {
  bookingId: string
}

export function AssignBookingDialog({ bookingId }: AssignBookingDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [flightJumperId, setFlightJumperId] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!flightJumperId.trim()) {
      toast.error('Please enter a flight jumper ID')
      return
    }

    startTransition(async () => {
      const result = await assignBookingToSlot({
        bookingId,
        flightJumperId,
      })

      if (result.success) {
        toast.success('Booking assigned successfully')
        setOpen(false)
        setFlightJumperId('')
        router.refresh()
      } else {
        toast.error('Failed to assign booking', {
          description: result.error,
        })
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          <UserCheck className="mr-2 h-4 w-4" />
          Assign
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Assign Booking to Flight Jumper</DialogTitle>
            <DialogDescription>
              Enter the flight jumper ID from the manifest to assign this
              booking. This will mark the booking as assigned and link it to the
              manifest entry.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="flightJumperId">
                Flight Jumper ID <span className="text-destructive">*</span>
              </Label>
              <Input
                id="flightJumperId"
                value={flightJumperId}
                onChange={(e) => setFlightJumperId(e.target.value)}
                placeholder="Enter flight jumper UUID..."
                required
              />
              <p className="text-xs text-muted-foreground">
                You can find the flight jumper ID in the manifest page when
                creating or viewing a flight jumper entry.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Assigning...' : 'Assign Booking'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
