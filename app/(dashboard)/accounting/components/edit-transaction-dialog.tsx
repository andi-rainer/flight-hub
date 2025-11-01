'use client'

import { useState, useTransition } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, Clock } from 'lucide-react'
import { editUserTransaction, editCostCenterTransaction } from '@/lib/actions/accounting'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface EditTransactionDialogProps {
  transaction: {
    id: string
    description: string
    created_at: string
    inserted_at: string
    amount: number
  }
  type: 'user' | 'cost_center'
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function EditTransactionDialog({
  transaction,
  type,
  open,
  onOpenChange,
  onSuccess
}: EditTransactionDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [description, setDescription] = useState(transaction.description)
  const [date, setDate] = useState(format(new Date(transaction.created_at), "yyyy-MM-dd'T'HH:mm"))
  const [error, setError] = useState<string | null>(null)

  // Check if date editing is allowed (within 1 hour of insertion)
  const insertedAt = new Date(transaction.inserted_at)
  const now = new Date()
  const hoursSinceInsertion = (now.getTime() - insertedAt.getTime()) / (1000 * 60 * 60)
  const canEditDate = hoursSinceInsertion < 1

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!description.trim()) {
      setError('Description cannot be empty')
      return
    }

    startTransition(async () => {
      const updates: { description?: string; created_at?: string } = {
        description: description.trim()
      }

      // Only include date if it was changed and is editable
      if (canEditDate && date !== format(new Date(transaction.created_at), "yyyy-MM-dd'T'HH:mm")) {
        updates.created_at = new Date(date).toISOString()
      }

      const result = type === 'user'
        ? await editUserTransaction(transaction.id, updates)
        : await editCostCenterTransaction(transaction.id, updates)

      if (result.success) {
        toast.success('Transaction updated successfully')
        onOpenChange(false)
        onSuccess?.()
      } else {
        setError(result.error || 'Failed to update transaction')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
          <DialogDescription>
            Modify the transaction details. Amount cannot be changed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Transaction description"
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">
              Date & Time
              {!canEditDate && (
                <span className="text-xs text-muted-foreground ml-2">
                  (Cannot edit after 1 hour)
                </span>
              )}
            </Label>
            <Input
              id="date"
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={!canEditDate || isPending}
              required
            />
            {!canEditDate && (
              <div className="flex items-start gap-2 p-2 rounded-md bg-muted">
                <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Transaction date can only be edited within 1 hour of creation.
                  Created {format(insertedAt, 'dd.MM.yyyy HH:mm')}.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-lg border p-3 bg-muted/50">
            <p className="text-sm font-medium mb-1">Amount (Cannot be changed)</p>
            <p className="text-lg font-semibold">
              € {transaction.amount.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              To change the amount, reverse this transaction and create a new one
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
