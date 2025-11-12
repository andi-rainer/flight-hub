'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { getAccountTransactions, getUserBalance } from '@/lib/actions/accounts'
import { AddTransactionDialog } from './add-transaction-dialog'

interface UserAccountDetailsDialogProps {
  userId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Transaction {
  id: string
  created_at: string
  description: string
  amount: number
  reversed?: boolean
}

interface UserBalance {
  name: string
  surname: string
  email: string
  balance: number
}

export function UserAccountDetailsDialog({ userId, open, onOpenChange }: UserAccountDetailsDialogProps) {
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [balance, setBalance] = useState<UserBalance | null>(null)
  const [addTransactionOpen, setAddTransactionOpen] = useState(false)

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open, userId])

  const loadData = async () => {
    setLoading(true)
    const [txResult, balanceResult] = await Promise.all([
      getAccountTransactions(userId),
      getUserBalance(userId),
    ])

    if (txResult.success) {
      setTransactions(txResult.data || [])
    }
    if (balanceResult.success) {
      setBalance(balanceResult.data)
    }
    setLoading(false)
  }

  const handleTransactionAdded = () => {
    setAddTransactionOpen(false)
    loadData()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Account Details</DialogTitle>
            <DialogDescription>
              {balance && `${balance.name} ${balance.surname} - ${balance.email}`}
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Balance Summary */}
              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                <div>
                  <p className="text-sm text-muted-foreground">Current Balance</p>
                  <p className="text-2xl font-bold">
                    € {(balance?.balance || 0).toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Transactions</p>
                  <p className="text-2xl font-bold">{balance?.transaction_count || 0}</p>
                </div>
              </div>

              {/* Add Transaction Button */}
              <div className="flex justify-end">
                <Button onClick={() => setAddTransactionOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Transaction
                </Button>
              </div>

              {/* Transactions Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Created By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No transactions
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="text-sm">
                            {format(new Date(tx.created_at), 'dd.MM.yyyy HH:mm')}
                          </TableCell>
                          <TableCell>{tx.description}</TableCell>
                          <TableCell className="text-right font-medium">
                            {tx.amount > 0 ? (
                              <span className="text-green-600">+€ {tx.amount.toFixed(2)}</span>
                            ) : (
                              <span className="text-red-600">€ {tx.amount.toFixed(2)}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {tx.amount > 0 ? (
                              <Badge className="bg-green-500 hover:bg-green-600">Credit</Badge>
                            ) : (
                              <Badge variant="destructive">Debit</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {tx.created_by_user?.name} {tx.created_by_user?.surname}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {balance && (
        <AddTransactionDialog
          user={{ id: userId, name: balance.name, surname: balance.surname, email: balance.email }}
          open={addTransactionOpen}
          onOpenChange={setAddTransactionOpen}
          onSuccess={handleTransactionAdded}
        />
      )}
    </>
  )
}
