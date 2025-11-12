'use client'

import { useState, useTransition, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, TrendingUp, TrendingDown, Edit3 } from 'lucide-react'
import { addCostCenterCredit, addCostCenterCharge, addCostCenterAdjustment } from '@/lib/actions/cost-centers'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface AddCostCenterTransactionDialogProps {
  costCenter: {
    id: string
    name: string
  }
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AddCostCenterTransactionDialog({
  costCenter,
  open,
  onOpenChange,
  onSuccess
}: AddCostCenterTransactionDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [transactionType, setTransactionType] = useState<'credit' | 'charge' | 'adjustment'>('charge')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [transactionDate, setTransactionDate] = useState('')

  // Initialize date to today at 12:00
  useEffect(() => {
    if (open) {
      const now = new Date()
      const dateStr = format(now, "yyyy-MM-dd'T'12:00")
      setTransactionDate(dateStr)
    }
  }, [open])

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
        costCenterId: costCenter.id,
        amount: Math.abs(amountNum),
        description: description.trim(),
        created_at: new Date(transactionDate).toISOString(),
      }

      if (transactionType === 'credit') {
        result = await addCostCenterCredit(data)
      } else if (transactionType === 'charge') {
        result = await addCostCenterCharge(data)
      } else {
        result = await addCostCenterAdjustment({ ...data, amount: amountNum })
      }

      if (result.success) {
        toast.success('Transaction added successfully')
        setAmount('')
        setDescription('')
        setTransactionType('charge')
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
            Add a manual transaction for {costCenter.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <Label>Transaction Type</Label>
            <RadioGroup value={transactionType} onValueChange={(value) => setTransactionType(value as 'credit' | 'charge' | 'adjustment')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="charge" id="charge-cc" />
                <Label htmlFor="charge-cc" className="font-normal cursor-pointer flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  Charge (Debit - costs/expenses)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="credit" id="credit-cc" />
                <Label htmlFor="credit-cc" className="font-normal cursor-pointer flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Credit (Income/refunds)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="adjustment" id="adjustment-cc" />
                <Label htmlFor="adjustment-cc" className="font-normal cursor-pointer flex items-center gap-2">
                  <Edit3 className="h-4 w-4 text-blue-600" />
                  Adjustment (Manual correction)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date-cc">Date & Time</Label>
            <Input
              id="date-cc"
              type="datetime-local"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount-cc">
              Amount (€)
              {transactionType === 'adjustment' && (
                <span className="text-sm text-muted-foreground ml-2">
                  (Use negative for debit, positive for credit)
                </span>
              )}
            </Label>
            <Input
              id="amount-cc"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description-cc">Description</Label>
            <Textarea
              id="description-cc"
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
