'use client'

import { useState, useTransition, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, TrendingUp, TrendingDown, Edit3 } from 'lucide-react'
import { addPayment, addCharge, addAdjustment } from '@/lib/actions/accounts'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface AddUserTransactionDialogProps {
  user: {
    user_id: string
    name: string
    surname: string
    email: string
  }
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AddUserTransactionDialog({
  user,
  open,
  onOpenChange,
  onSuccess
}: AddUserTransactionDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [transactionType, setTransactionType] = useState<'payment' | 'charge' | 'adjustment'>('payment')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [transactionDate, setTransactionDate] = useState('')
  const [isBankPayment, setIsBankPayment] = useState(true)

  // Initialize date to today at 12:00
  useEffect(() => {
    if (open) {
      const now = new Date()
      const dateStr = format(now, "yyyy-MM-dd'T'12:00")
      setTransactionDate(dateStr)
    }
  }, [open])

  // Update description when bank payment checkbox or date changes
  useEffect(() => {
    if (transactionType === 'payment' && isBankPayment && transactionDate) {
      const date = new Date(transactionDate)
      const formattedDate = format(date, 'dd.MM.yy')
      setDescription(`Einzahlung vom ${formattedDate}`)
    }
  }, [transactionType, isBankPayment, transactionDate])

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
        userId: user.user_id,
        amount: Math.abs(amountNum),
        description: description.trim(),
        created_at: new Date(transactionDate).toISOString(),
      }

      if (transactionType === 'payment') {
        result = await addPayment(data)
      } else if (transactionType === 'charge') {
        result = await addCharge(data)
      } else {
        result = await addAdjustment({ ...data, amount: amountNum })
      }

      if (result.success) {
        toast.success('Transaction added successfully')
        setAmount('')
        setDescription('')
        setTransactionType('payment')
        setIsBankPayment(true)
        onOpenChange(false)
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
            <RadioGroup value={transactionType} onValueChange={(value) => setTransactionType(value as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="payment" id="payment" />
                <Label htmlFor="payment" className="font-normal cursor-pointer flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Payment (Credit to user account)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="charge" id="charge" />
                <Label htmlFor="charge" className="font-normal cursor-pointer flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  Charge (Debit from user account)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="adjustment" id="adjustment" />
                <Label htmlFor="adjustment" className="font-normal cursor-pointer flex items-center gap-2">
                  <Edit3 className="h-4 w-4 text-blue-600" />
                  Adjustment (Manual correction)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date & Time</Label>
            <Input
              id="date"
              type="datetime-local"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              required
            />
          </div>

          {transactionType === 'payment' && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="bank-payment"
                checked={isBankPayment}
                onCheckedChange={(checked) => setIsBankPayment(checked as boolean)}
              />
              <Label
                htmlFor="bank-payment"
                className="font-normal cursor-pointer text-sm"
              >
                Bank transfer (wire) - auto-fills description
              </Label>
            </div>
          )}

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
              disabled={transactionType === 'payment' && isBankPayment}
            />
            {transactionType === 'payment' && isBankPayment && (
              <p className="text-xs text-muted-foreground">
                Description is auto-filled for bank payments
              </p>
            )}
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
