'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { updateMaintenanceSchedule } from '../maintenance-actions'

interface UpdateMaintenanceScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  aircraftId: string
  currentNextDue: number | null
  currentInterval: number | null
}

export function UpdateMaintenanceScheduleDialog({
  open,
  onOpenChange,
  aircraftId,
  currentNextDue,
  currentInterval,
}: UpdateMaintenanceScheduleDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [nextDueHours, setNextDueHours] = useState('')
  const [intervalHours, setIntervalHours] = useState('')

  // Update form when dialog opens or props change
  useEffect(() => {
    if (open) {
      setNextDueHours(currentNextDue !== null ? currentNextDue.toString() : '')
      setIntervalHours(currentInterval !== null ? currentInterval.toString() : '50')
    }
  }, [open, currentNextDue, currentInterval])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setLoading(true)

    const result = await updateMaintenanceSchedule(
      aircraftId,
      nextDueHours ? parseFloat(nextDueHours) : null,
      intervalHours ? parseFloat(intervalHours) : null
    )

    setLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Maintenance schedule updated successfully')
      router.refresh()
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Update Maintenance Schedule</DialogTitle>
          <DialogDescription>
            Set when the next maintenance is due and the standard maintenance interval
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Next Due Hours */}
          <div className="space-y-2">
            <Label htmlFor="next-due-hours">
              Next Maintenance Due (Aircraft Hours)
            </Label>
            <Input
              id="next-due-hours"
              type="number"
              step="0.1"
              value={nextDueHours}
              onChange={(e) => setNextDueHours(e.target.value)}
              disabled={loading}
              placeholder="Leave empty to clear"
            />
            <p className="text-xs text-muted-foreground">
              Aircraft hours when next maintenance is due. Leave empty to clear the schedule.
            </p>
          </div>

          {/* Maintenance Interval */}
          <div className="space-y-2">
            <Label htmlFor="interval-hours">
              Standard Maintenance Interval (Hours)
            </Label>
            <Input
              id="interval-hours"
              type="number"
              step="0.1"
              value={intervalHours}
              onChange={(e) => setIntervalHours(e.target.value)}
              disabled={loading}
              placeholder="50"
            />
            <p className="text-xs text-muted-foreground">
              Standard interval between maintenance checks (e.g., 50, 100, 200 hours)
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Schedule'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
