'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle } from 'lucide-react'
import { addPayment, addCharge, addAdjustment } from '@/lib/actions/accounts'

interface AddTransactionDialogProps {
  user: {
    id: string
    name: string
    surname: string
    email: string
  }
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AddTransactionDialog({ user, open, onOpenChange, onSuccess }: AddTransactionDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [transactionType, setTransactionType] = useState<'payment' | 'charge' | 'adjustment'>('payment')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum === 0) {
      setError('Please enter a valid amount')
      return
    }

    if (!description.trim()) {
      setError('Please enter a description')
      return
    }

    startTransition(async () => {
      let result

      const data = {
        userId: user.id,
        amount: Math.abs(amountNum),
        description: description.trim(),
      }

      if (transactionType === 'payment') {
        result = await addPayment(data)
      } else if (transactionType === 'charge') {
        result = await addCharge(data)
      } else {
        result = await addAdjustment({ ...data, amount: amountNum })
      }

      if (result.success) {
        setAmount('')
        setDescription('')
        setTransactionType('payment')
        onOpenChange(false)
        router.refresh()
        onSuccess?.()
      } else {
        setError(result.error || 'Failed to add transaction')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription>
            Add a manual transaction for {user.name} {user.surname}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <Label>Transaction Type</Label>
            <RadioGroup value={transactionType} onValueChange={(value) => setTransactionType(value as 'payment' | 'charge' | 'adjustment')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="payment" id="payment" />
                <Label htmlFor="payment" className="font-normal cursor-pointer">
                  Payment (Credit to user account)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="charge" id="charge" />
                <Label htmlFor="charge" className="font-normal cursor-pointer">
                  Charge (Debit from user account)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="adjustment" id="adjustment" />
                <Label htmlFor="adjustment" className="font-normal cursor-pointer">
                  Adjustment (Manual correction)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">
              Amount (€)
              {transactionType === 'adjustment' && (
                <span className="text-sm text-muted-foreground ml-2">
                  (Use negative for debit, positive for credit)
                </span>
              )}
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter transaction description"
              rows={2}
              required
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Transaction
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
