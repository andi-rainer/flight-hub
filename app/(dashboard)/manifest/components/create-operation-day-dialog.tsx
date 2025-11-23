'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { createOperationDay } from '@/lib/actions/manifest'
import { useRouter } from 'next/navigation'

interface Plane {
  id: string
  tail_number: string
  type: string
}

interface CreateOperationDayDialogProps {
  availablePlanes: Plane[]
}

export function CreateOperationDayDialog({ availablePlanes }: CreateOperationDayDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    operation_date: '',
    plane_id: '',
    notes: '',
  })

  // Check if there are no available planes
  const hasPlanes = availablePlanes && availablePlanes.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const result = await createOperationDay(formData)

      if (result.success) {
        toast.success('Operation day created successfully')
        setOpen(false)
        setFormData({
          operation_date: '',
          plane_id: '',
          notes: '',
        })
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to create operation day')
      }
    } catch (error) {
      console.error('Error creating operation day:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Operation Day
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Operation Day</DialogTitle>
            <DialogDescription>
              Plan a new skydive operation day with an aircraft. A priority reservation will be
              automatically created. Each flight can have both tandem and sport jumpers.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="operation_date">Operation Date</Label>
              <Input
                id="operation_date"
                type="date"
                value={formData.operation_date}
                onChange={(e) =>
                  setFormData({ ...formData, operation_date: e.target.value })
                }
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="plane_id">Aircraft</Label>
              <Select
                value={formData.plane_id}
                onValueChange={(value) => setFormData({ ...formData, plane_id: value })}
                required
                disabled={!hasPlanes}
              >
                <SelectTrigger>
                  <SelectValue placeholder={hasPlanes ? "Select aircraft" : "No active aircraft available"} />
                </SelectTrigger>
                <SelectContent>
                  {hasPlanes ? (
                    availablePlanes.map((plane) => (
                      <SelectItem key={plane.id} value={plane.id}>
                        {plane.tail_number} - {plane.type}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                      No active aircraft available
                    </div>
                  )}
                </SelectContent>
              </Select>
              {!hasPlanes && (
                <p className="text-xs text-muted-foreground">
                  Please add and activate at least one aircraft before creating an operation day.
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any special notes or instructions for this operation day"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
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
            <Button type="submit" disabled={isSubmitting || !hasPlanes || !formData.plane_id}>
              {isSubmitting ? 'Creating...' : 'Create Operation Day'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
