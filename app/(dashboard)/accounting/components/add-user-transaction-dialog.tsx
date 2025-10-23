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
import { Loader2, AlertCircle, TrendingUp, TrendingDown, Edit3, Check, ChevronsUpDown } from 'lucide-react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { addPayment, addCharge, addAdjustment } from '@/lib/actions/accounts'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface AddUserTransactionDialogProps {
  user?: {
    user_id: string
    name: string
    surname: string
    email: string
    balance?: number
  } | null
  users?: Array<{
    user_id: string
    name: string
    surname: string
    email: string
    balance?: number
  }>
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (userId?: string) => void
}

type TransactionType = 'payment' | 'charge' | 'adjustment';

export function AddUserTransactionDialog({
  user: preSelectedUser,
  users = [],
  open,
  onOpenChange,
  onSuccess
}: AddUserTransactionDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)


  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [userSelectorOpen, setUserSelectorOpen] = useState(false)
  const [transactionType, setTransactionType] = useState<TransactionType>('payment')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [transactionDate, setTransactionDate] = useState('')
  const [isBankPayment, setIsBankPayment] = useState(true)

  // If user is preselected, use their ID
  useEffect(() => {
    if (preSelectedUser) {
      setSelectedUserId(preSelectedUser.user_id)
    } else {
      setSelectedUserId('')
    }
  }, [preSelectedUser, open])

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

    if (!selectedUserId) {
      setError('Please select a user')
      return
    }

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
        userId: selectedUserId,
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
        onSuccess?.(selectedUserId)
      } else {
        setError(result.error || 'Failed to add transaction')
      }
    })
  }

  const selectedUser = preSelectedUser || users.find(u => u.user_id === selectedUserId)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription>
            {selectedUser ? `Add a manual transaction for ${selectedUser.name} ${selectedUser.surname}` : 'Add a manual transaction'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!preSelectedUser && (
            <div className="space-y-2">
              <Label>User *</Label>
              <Popover open={userSelectorOpen} onOpenChange={setUserSelectorOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={userSelectorOpen}
                    className="w-full justify-between"
                  >
                    {selectedUser ? (
                      <span className="flex items-center justify-between w-full">
                        <span>{selectedUser.surname}, {selectedUser.name}</span>
                        {selectedUser.balance !== undefined && (
                          <span className={`text-xs ml-2 ${selectedUser.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(selectedUser.balance)}
                          </span>
                        )}
                      </span>
                    ) : (
                      "Select user..."
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Search users..." />
                    <CommandList>
                      <CommandEmpty>No user found.</CommandEmpty>
                      <CommandGroup>
                        {users.map((user) => (
                          <CommandItem
                            key={user.user_id}
                            value={`${user.surname} ${user.name} ${user.email}`}
                            onSelect={() => {
                              setSelectedUserId(user.user_id)
                              setUserSelectorOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedUserId === user.user_id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex items-center justify-between w-full">
                              <div className="flex flex-col">
                                <span>{user.surname}, {user.name}</span>
                                <span className="text-xs text-muted-foreground">{user.email}</span>
                              </div>
                              {user.balance !== undefined && (
                                <span className={`text-xs ml-2 ${user.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatCurrency(user.balance)}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedUser && (
                <p className="text-xs text-muted-foreground">
                  Current balance: <span className={selectedUser.balance && selectedUser.balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(selectedUser.balance || 0)}
                  </span>
                </p>
              )}
            </div>
          )}

          <div className="space-y-3">
            <Label>X - Transaction Type</Label>
            <RadioGroup value={transactionType} onValueChange={(value) => setTransactionType(value as TransactionType)}>
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
