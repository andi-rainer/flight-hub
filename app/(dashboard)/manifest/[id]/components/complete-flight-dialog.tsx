'use client'

import { useState, ReactNode } from 'react'
import { CheckCircle, AlertTriangle } from 'lucide-react'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { markFlightCompleted } from '@/lib/actions/manifest'
import { useRouter } from 'next/navigation'

interface CompleteFlightDialogProps {
  flight: any
  trigger?: ReactNode
}

export function CompleteFlightDialog({ flight, trigger }: CompleteFlightDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const jumpers = flight.jumpers || []
  const tandemPairs = jumpers.filter((j: any) => j.jumper_type === 'tandem')
  const unpaidTandems = tandemPairs.filter((j: any) => !j.payment_received)

  const handleComplete = async () => {
    setIsSubmitting(true)

    try {
      const result = await markFlightCompleted(flight.id)

      if (result.success) {
        toast.success('Flight marked as completed')
        if (tandemPairs.length > 0) {
          toast.success(`${tandemPairs.length} tandem ${tandemPairs.length === 1 ? 'passenger' : 'passengers'} marked as completed`)
        }
        setOpen(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to complete flight')
      }
    } catch (error) {
      console.error('Error completing flight:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="default" size="sm">
            <CheckCircle className="mr-2 h-4 w-4" />
            Complete Flight
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Complete Flight</DialogTitle>
          <DialogDescription>
            Mark Load #{flight.flight_number} as completed
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm">
              This will mark the flight as completed and perform the following actions:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
              <li>Change flight status to "completed"</li>
              {tandemPairs.length > 0 && (
                <li>
                  Mark {tandemPairs.length} tandem {tandemPairs.length === 1 ? 'passenger' : 'passengers'} as having completed their jump
                </li>
              )}
              <li>Lock flight from further modifications</li>
            </ul>
          </div>

          {unpaidTandems.length > 0 && (
            <Alert variant="default" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-700 dark:text-yellow-200">
                <strong>Note:</strong> There {unpaidTandems.length === 1 ? 'is' : 'are'}{' '}
                {unpaidTandems.length} tandem {unpaidTandems.length === 1 ? 'passenger' : 'passengers'}{' '}
                with pending payment. The flight can still be completed, but you may want to
                collect payment first.
              </AlertDescription>
            </Alert>
          )}

          <div className="rounded-md bg-muted p-3 text-sm">
            <strong>Flight Summary:</strong>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li>Total jumpers: {jumpers.length}</li>
              <li>Sport jumpers: {jumpers.filter((j: any) => j.jumper_type === 'sport').length}</li>
              <li>Tandem pairs: {tandemPairs.length}</li>
              {tandemPairs.length > 0 && (
                <li>Paid tandems: {tandemPairs.length - unpaidTandems.length} / {tandemPairs.length}</li>
              )}
            </ul>
          </div>

          <p className="text-sm text-muted-foreground">
            Are you sure you want to complete this flight? This action cannot be undone.
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleComplete} disabled={isSubmitting}>
            {isSubmitting ? 'Completing...' : 'Complete Flight'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
