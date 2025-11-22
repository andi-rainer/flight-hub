'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { createCgLimit, updateCgLimit } from '@/lib/actions/weight-balance'
import { toast } from 'sonner'

interface CgLimit {
  id: string
  weight: number
  arm: number
  limit_type: 'forward' | 'aft'
  sort_order: number
  notes: string | null
}

interface CgLimitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cgLimit: CgLimit | null
  planeId: string
  massUnit?: 'kg' | 'lbs'
  onSuccess: () => void
}

export function CgLimitDialog({
  open,
  onOpenChange,
  cgLimit,
  planeId,
  massUnit = 'kg',
  onSuccess,
}: CgLimitDialogProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [weight, setWeight] = useState('')
  const [arm, setArm] = useState('')
  const [notes, setNotes] = useState('')

  const isEditing = cgLimit?.id !== ''

  // Reset form when dialog opens with new data
  useEffect(() => {
    if (open && cgLimit) {
      setWeight(cgLimit.weight?.toString() || '')
      setArm(cgLimit.arm?.toString() || '')
      setNotes(cgLimit.notes || '')
    }
  }, [open, cgLimit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    // Validate inputs
    const weightValue = parseFloat(weight)
    const armValue = parseFloat(arm)

    if (isNaN(weightValue) || weightValue < 0) {
      toast.error('Please enter a valid weight (must be >= 0)')
      setIsSaving(false)
      return
    }

    if (isNaN(armValue)) {
      toast.error('Please enter a valid arm value')
      setIsSaving(false)
      return
    }

    if (!cgLimit) {
      toast.error('Invalid CG limit data')
      setIsSaving(false)
      return
    }

    try {
      let result

      if (isEditing) {
        // Update existing CG limit
        result = await updateCgLimit({
          id: cgLimit.id,
          weight: weightValue,
          arm: armValue,
          notes: notes.trim() || undefined,
        })
      } else {
        // Create new CG limit
        result = await createCgLimit({
          plane_id: planeId,
          weight: weightValue,
          arm: armValue,
          limit_type: cgLimit.limit_type,
          sort_order: cgLimit.sort_order,
          notes: notes.trim() || undefined,
        })
      }

      if (result.success) {
        toast.success(isEditing ? 'CG limit updated' : 'CG limit created')
        onSuccess()
      } else {
        toast.error(result.error || 'Failed to save CG limit')
      }
    } catch (error) {
      console.error('Error saving CG limit:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit CG Limit Point' : 'Add CG Limit Point'}
            </DialogTitle>
            <DialogDescription>
              Define a {cgLimit?.limit_type} CG envelope boundary point.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Limit Type Badge */}
            <div className="flex items-center gap-2">
              <Label>Type</Label>
              <Badge variant={cgLimit?.limit_type === 'forward' ? 'default' : 'secondary'}>
                {cgLimit?.limit_type === 'forward' ? 'Forward' : 'Aft'} Limit
              </Badge>
            </div>

            {/* Weight */}
            <div className="grid gap-2">
              <Label htmlFor="weight">
                Weight ({massUnit}) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="weight"
                type="number"
                step="0.01"
                min="0"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g., 750"
                required
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">
                Aircraft weight at this CG limit point
              </p>
            </div>

            {/* Arm */}
            <div className="grid gap-2">
              <Label htmlFor="arm">
                Arm (position) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="arm"
                type="number"
                step="0.01"
                value={arm}
                onChange={(e) => setArm(e.target.value)}
                placeholder="e.g., 2.15"
                required
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">
                CG arm position from datum point
              </p>
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional information about this limit point..."
                rows={3}
                disabled={isSaving}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
