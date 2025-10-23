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
import { Loader2, AlertCircle, Undo2 } from 'lucide-react'
import { reverseFlightCharge } from '@/lib/actions/accounts'
import { reverseCostCenterFlightCharge } from '@/lib/actions/cost-centers'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface ReverseChargeDialogProps {
  transaction: {
    id: string
    amount: number
    description: string
    created_at: string
    flightlog_id: string | null
    flight?: {
      block_off: string
      block_on: string
      plane?: {
        tail_number: string
      }
    } | null
  }
  type: 'user' | 'cost-center'
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function ReverseChargeDialog({
  transaction,
  type,
  open,
  onOpenChange,
  onSuccess
}: ReverseChargeDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleReverse = async () => {
    setError(null)

    startTransition(async () => {
      let result

      if (type === 'user') {
        result = await reverseFlightCharge(transaction.id)
      } else {
        result = await reverseCostCenterFlightCharge(transaction.id)
      }

      if (result.success) {
        toast.success('Flight charge reversed successfully')
        onOpenChange(false)
        onSuccess?.()
      } else {
        setError(result.error || 'Failed to reverse charge')
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Undo2 className="h-5 w-5 text-orange-600" />
            Reverse Flight Charge
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will reverse the following flight charge.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <div className="bg-muted p-3 rounded-md text-sm space-y-1">
            <div className="font-medium">{transaction.description}</div>
            <div className="text-muted-foreground">
              Amount: €{Math.abs(transaction.amount).toFixed(2)}
            </div>
            {transaction.flight && (
              <>
                <div className="text-muted-foreground">
                  Aircraft: {transaction.flight.plane?.tail_number}
                </div>
                <div className="text-muted-foreground">
                  Flight: {format(new Date(transaction.flight.block_off), 'dd.MM.yyyy HH:mm')} - {format(new Date(transaction.flight.block_on), 'HH:mm')}
                </div>
              </>
            )}
          </div>

          <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded-md border border-orange-200 dark:border-orange-900">
            <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
              What happens when you reverse:
            </p>
            <ul className="text-sm text-orange-800 dark:text-orange-200 mt-2 space-y-1 list-disc list-inside">
              <li>A reverse transaction will be created with opposite amount</li>
              <li>The flight will be unlocked and marked as not charged</li>
              <li>The flight will appear in billing again</li>
              <li>You can then charge it correctly (to different user/cost center if needed)</li>
            </ul>
          </div>

          <p className="text-sm text-muted-foreground">
            This action creates an audit trail - the original transaction remains visible with a reversal.
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleReverse()
            }}
            disabled={isPending}
            className="bg-orange-600 hover:bg-orange-700 focus:ring-orange-600"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reverse Charge
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
