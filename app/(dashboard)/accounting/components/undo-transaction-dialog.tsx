'use client'

import { useState, useTransition } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle } from 'lucide-react'
import { reverseUserTransaction, reverseCostCenterTransaction } from '@/lib/actions/accounting'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface UndoTransactionDialogProps {
  transaction: {
    id: string
    description: string
    created_at: string
    amount: number
  }
  type: 'user' | 'cost_center'
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function UndoTransactionDialog({
  transaction,
  type,
  open,
  onOpenChange,
  onSuccess
}: UndoTransactionDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = () => {
    setError(null)

    startTransition(async () => {
      const result = type === 'user'
        ? await reverseUserTransaction(transaction.id)
        : await reverseCostCenterTransaction(transaction.id)

      if (result.success) {
        toast.success('Transaction reversed successfully')
        onOpenChange(false)
        onSuccess?.()
      } else {
        setError(result.error || 'Failed to reverse transaction')
      }
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reverse Transaction?</AlertDialogTitle>
          <AlertDialogDescription>
            This will create a reversal transaction to undo this transaction. The original transaction will be marked as reversed but will remain visible in the history.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Transaction Details */}
          <div className="rounded-lg border p-4 bg-muted/50 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Date:</span>
              <span className="font-medium">
                {format(new Date(transaction.created_at), 'dd.MM.yyyy HH:mm')}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Description:</span>
              <span className="font-medium max-w-[200px] truncate">
                {transaction.description}
              </span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span className="text-muted-foreground">Amount:</span>
              <span className={`font-semibold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(transaction.amount)}
              </span>
            </div>
          </div>

          {/* Reversal Preview */}
          <div className="rounded-lg border p-4 bg-primary/5 space-y-2">
            <p className="text-sm font-medium">Reversal transaction will be created:</p>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Description:</span>
              <span className="font-medium">REVERSAL: {transaction.description}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount:</span>
              <span className={`font-semibold ${transaction.amount < 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(-transaction.amount)}
              </span>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleConfirm()
            }}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reverse Transaction
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
