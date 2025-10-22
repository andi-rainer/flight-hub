'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, Trash2 } from 'lucide-react'
import { updateCostCenter, deleteCostCenter, toggleCostCenterActive } from '@/lib/actions/cost-centers'
import type { CostCenter } from '@/lib/database.types'

interface EditCostCenterDialogProps {
  costCenter: CostCenter
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditCostCenterDialog({ costCenter, open, onOpenChange }: EditCostCenterDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(costCenter.name)
  const [description, setDescription] = useState(costCenter.description || '')
  const [active, setActive] = useState(costCenter.active)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Please enter a name')
      return
    }

    startTransition(async () => {
      const result = await updateCostCenter(costCenter.id, {
        name: name.trim(),
        description: description.trim() || null,
        active,
      })

      if (result.success) {
        onOpenChange(false)
        router.refresh()
      } else {
        setError(result.error || 'Failed to update cost center')
      }
    })
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this cost center? This action cannot be undone.')) {
      return
    }

    setError(null)

    startTransition(async () => {
      const result = await deleteCostCenter(costCenter.id)

      if (result.success) {
        onOpenChange(false)
        router.refresh()
      } else {
        setError(result.error || 'Failed to delete cost center')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Cost Center</DialogTitle>
          <DialogDescription>
            Update cost center details or deactivate it
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Skydive Operations"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="active">Active</Label>
              <p className="text-sm text-muted-foreground">
                Inactive cost centers cannot be used for new charges
              </p>
            </div>
            <Switch
              id="active"
              checked={active}
              onCheckedChange={setActive}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="flex justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
