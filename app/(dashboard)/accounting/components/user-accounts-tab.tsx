'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Loader2, ArrowLeft, Edit, Undo2, Plus, Search, RotateCcw } from 'lucide-react'
import { getUserBalances, getUserTransactions } from '@/lib/actions/accounting'
import { format } from 'date-fns'
import { AddUserTransactionDialog } from './add-user-transaction-dialog'
import { EditTransactionDialog } from './edit-transaction-dialog'
import { UndoTransactionDialog } from './undo-transaction-dialog'
import { ReverseChargeDialog } from './reverse-charge-dialog'
import { toast } from 'sonner'

type UserBalance = {
  user_id: string
  name: string
  surname: string
  email: string
  balance: number
}

type UserTransaction = {
  id: string
  user_id: string
  amount: number
  description: string
  created_at: string
  reversed_at: string | null
  reversed_by: string | null
  reversal_transaction_id: string | null
  reverses_transaction_id: string | null
  flightlog_id: string | null
  created_by_user: { id: string; name: string; surname: string } | null
  reversal_transaction: { id: string; amount: number; created_at: string } | null
  reverses_transaction: { id: string; amount: number; created_at: string } | null
  flightlog: { id: string; block_off: string; block_on: string; plane?: { tail_number: string } } | null
}

export function UserAccountsTab() {
  const [users, setUsers] = useState<UserBalance[]>([])
  const [selectedUser, setSelectedUser] = useState<UserBalance | null>(null)
  const [transactions, setTransactions] = useState<UserTransaction[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [showMobileList, setShowMobileList] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [undoDialogOpen, setUndoDialogOpen] = useState(false)
  const [reverseChargeDialogOpen, setReverseChargeDialogOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<UserTransaction | null>(null)

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users

    const query = searchQuery.toLowerCase()
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.surname.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        `${user.name} ${user.surname}`.toLowerCase().includes(query)
    )
  }, [users, searchQuery])

  // Load users on mount
  useEffect(() => {
    loadUsers()
  }, [])

  // Load transactions when user is selected
  useEffect(() => {
    if (selectedUser) {
      loadTransactions(selectedUser.user_id)
      setShowMobileList(false)
    }
  }, [selectedUser])

  const loadUsers = async () => {
    setLoadingUsers(true)
    const result = await getUserBalances()
    if (result.success && result.data) {
      setUsers(result.data)
    } else {
      toast.error(result.error || 'Failed to load users')
    }
    setLoadingUsers(false)
  }

  const loadTransactions = async (userId: string) => {
    setLoadingTransactions(true)
    const result = await getUserTransactions(userId)
    if (result.success && result.data) {
      setTransactions(result.data)
    } else {
      toast.error(result.error || 'Failed to load transactions')
    }
    setLoadingTransactions(false)
  }

  const handleSelectUser = (user: UserBalance) => {
    setSelectedUser(user)
  }

  const handleBackToList = () => {
    setShowMobileList(true)
  }

  const handleEditClick = (transaction: UserTransaction) => {
    setSelectedTransaction(transaction)
    setEditDialogOpen(true)
  }

  const handleUndoClick = (transaction: UserTransaction) => {
    setSelectedTransaction(transaction)
    setUndoDialogOpen(true)
  }

  const handleReverseChargeClick = (transaction: UserTransaction) => {
    setSelectedTransaction(transaction)
    setReverseChargeDialogOpen(true)
  }

  const handleSuccess = () => {
    // Reload both users (for balance update) and transactions
    loadUsers()
    if (selectedUser) {
      loadTransactions(selectedUser.user_id)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'text-green-600'
    if (balance < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const getTransactionType = (transaction: UserTransaction) => {
    if (transaction.reverses_transaction_id) return 'reversal'
    if (transaction.amount > 0) return 'payment'
    return 'charge'
  }

  const calculateRunningBalance = (index: number) => {
    // Calculate running balance from newest to oldest
    const reversedTransactions = [...transactions].reverse()
    let balance = 0
    for (let i = 0; i <= reversedTransactions.length - 1 - index; i++) {
      const tx = reversedTransactions[i]
      if (!tx.reversed_at) {
        balance += tx.amount
      }
    }
    return balance
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Left Panel - User List */}
      <div className={`${showMobileList ? 'block' : 'hidden md:block'}`}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Users</CardTitle>
            <CardDescription>Select a user to view their transaction history</CardDescription>
            <div className="relative mt-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'No users found matching your search' : 'No users found'}
              </div>
            ) : (
              <div className="space-y-1 max-h-[600px] overflow-y-auto">
                {filteredUsers.map((user) => (
                  <div
                    key={user.user_id}
                    onClick={() => handleSelectUser(user)}
                    className={`p-2 rounded-md border cursor-pointer transition-colors hover:bg-accent ${
                      selectedUser?.user_id === user.user_id ? 'bg-accent border-primary' : 'border-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">
                          {user.surname}, {user.name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                      </div>
                      <div className={`font-semibold text-sm tabular-nums ${getBalanceColor(user.balance || 0)}`}>
                        {formatCurrency(user.balance || 0)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Transaction History */}
      <div className={`${showMobileList ? 'hidden md:block' : 'block'}`}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToList}
                    className="md:hidden -ml-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <CardTitle>
                    {selectedUser ? `${selectedUser.name} ${selectedUser.surname}` : 'Transaction History'}
                  </CardTitle>
                </div>
                {selectedUser && (
                  <CardDescription>
                    {selectedUser.email} • Balance:{' '}
                    <span className={getBalanceColor(selectedUser.balance || 0)}>
                      {formatCurrency(selectedUser.balance || 0)}
                    </span>
                  </CardDescription>
                )}
              </div>
              {selectedUser && (
                <Button onClick={() => setAddDialogOpen(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Transaction
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedUser ? (
              <div className="text-center py-12 text-muted-foreground">
                Select a user to view their transactions
              </div>
            ) : loadingTransactions ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No transactions found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction, index) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(transaction.created_at), 'dd.MM.yyyy HH:mm')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getTransactionType(transaction) === 'payment' ? 'default' : 'secondary'}>
                            {getTransactionType(transaction)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate">
                            {transaction.description}
                          </div>
                          {transaction.reversed_at && (
                            <Badge variant="destructive" className="mt-1">
                              Reversed
                            </Badge>
                          )}
                          {transaction.reversal_transaction && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Reversed by transaction on{' '}
                              {format(new Date(transaction.reversal_transaction.created_at), 'dd.MM.yyyy HH:mm')}
                            </div>
                          )}
                          {transaction.reverses_transaction && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Reverses transaction from{' '}
                              {format(new Date(transaction.reverses_transaction.created_at), 'dd.MM.yyyy HH:mm')}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className={`text-right ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(transaction.amount)}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${getBalanceColor(calculateRunningBalance(index))}`}>
                          {formatCurrency(calculateRunningBalance(index))}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {transaction.flightlog_id && !transaction.reversed_at && !transaction.reverses_transaction_id ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReverseChargeClick(transaction)}
                                title="Reverse flight charge and unlock flight"
                              >
                                <RotateCcw className="h-4 w-4 text-orange-600" />
                              </Button>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditClick(transaction)}
                                  disabled={!!transaction.reversed_at}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUndoClick(transaction)}
                                  disabled={!!transaction.reversed_at || !!transaction.reverses_transaction_id}
                                >
                                  <Undo2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      {selectedUser && (
        <>
          <AddUserTransactionDialog
            user={selectedUser}
            open={addDialogOpen}
            onOpenChange={setAddDialogOpen}
            onSuccess={handleSuccess}
          />
          {selectedTransaction && (
            <>
              <EditTransactionDialog
                transaction={selectedTransaction}
                type="user"
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                onSuccess={handleSuccess}
              />
              <UndoTransactionDialog
                transaction={selectedTransaction}
                type="user"
                open={undoDialogOpen}
                onOpenChange={setUndoDialogOpen}
                onSuccess={handleSuccess}
              />
              <ReverseChargeDialog
                transaction={{
                  id: selectedTransaction.id,
                  amount: selectedTransaction.amount,
                  description: selectedTransaction.description,
                  created_at: selectedTransaction.created_at,
                  flightlog_id: selectedTransaction.flightlog_id,
                  flight: selectedTransaction.flightlog,
                }}
                type="user"
                open={reverseChargeDialogOpen}
                onOpenChange={setReverseChargeDialogOpen}
                onSuccess={handleSuccess}
              />
            </>
          )}
        </>
      )}
    </div>
  )
}
