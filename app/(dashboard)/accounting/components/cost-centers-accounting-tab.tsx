'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowLeft, Edit, Undo2, Plus, RotateCcw } from 'lucide-react'
import { getCostCentersWithTotals, getCostCenterTransactions } from '@/lib/actions/accounting'
import { format } from 'date-fns'
import { AddCostCenterTransactionDialog } from './add-cost-center-transaction-dialog'
import { EditTransactionDialog } from './edit-transaction-dialog'
import { UndoTransactionDialog } from './undo-transaction-dialog'
import { ReverseChargeDialog } from './reverse-charge-dialog'
import { toast } from 'sonner'

type CostCenterWithTotal = {
  id: string
  name: string
  description: string | null
  active: boolean
  total_amount: number
}

type CostCenterTransaction = {
  id: string
  cost_center_id: string
  flightlog_id: string
  amount: number
  description: string
  created_at: string
  reversed_at: string | null
  reversed_by: string | null
  reversal_transaction_id: string | null
  reverses_transaction_id: string | null
  created_by_user: { id: string; name: string; surname: string } | null
  flightlog: { id: string; block_off: string; block_on: string; plane?: { tail_number: string } } | null
  reversal_transaction: { id: string; amount: number; created_at: string } | null
  reverses_transaction: { id: string; amount: number; created_at: string } | null
}

export function CostCentersAccountingTab() {
  const [costCenters, setCostCenters] = useState<CostCenterWithTotal[]>([])
  const [selectedCostCenter, setSelectedCostCenter] = useState<CostCenterWithTotal | null>(null)
  const [transactions, setTransactions] = useState<CostCenterTransaction[]>([])
  const [loadingCostCenters, setLoadingCostCenters] = useState(true)
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [showMobileList, setShowMobileList] = useState(true)

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [undoDialogOpen, setUndoDialogOpen] = useState(false)
  const [reverseChargeDialogOpen, setReverseChargeDialogOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<CostCenterTransaction | null>(null)

  // Load cost centers on mount
  useEffect(() => {
    loadCostCenters()
  }, [])

  // Load transactions when cost center is selected
  useEffect(() => {
    if (selectedCostCenter) {
      loadTransactions(selectedCostCenter.id)
      setShowMobileList(false)
    }
  }, [selectedCostCenter])

  const loadCostCenters = async () => {
    setLoadingCostCenters(true)
    const result = await getCostCentersWithTotals()
    if (result.success && result.data) {
      setCostCenters(result.data)
    } else {
      toast.error(result.error || 'Failed to load cost centers')
    }
    setLoadingCostCenters(false)
  }

  const loadTransactions = async (costCenterId: string) => {
    setLoadingTransactions(true)
    const result = await getCostCenterTransactions(costCenterId)
    if (result.success && result.data) {
      setTransactions(result.data)
    } else {
      toast.error(result.error || 'Failed to load transactions')
    }
    setLoadingTransactions(false)
  }

  const handleSelectCostCenter = (costCenter: CostCenterWithTotal) => {
    setSelectedCostCenter(costCenter)
  }

  const handleBackToList = () => {
    setShowMobileList(true)
  }

  const handleEditClick = (transaction: CostCenterTransaction) => {
    setSelectedTransaction(transaction)
    setEditDialogOpen(true)
  }

  const handleUndoClick = (transaction: CostCenterTransaction) => {
    setSelectedTransaction(transaction)
    setUndoDialogOpen(true)
  }

  const handleReverseChargeClick = (transaction: CostCenterTransaction) => {
    setSelectedTransaction(transaction)
    setReverseChargeDialogOpen(true)
  }

  const handleSuccess = () => {
    // Reload both cost centers (for total update) and transactions
    loadCostCenters()
    if (selectedCostCenter) {
      loadTransactions(selectedCostCenter.id)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const getTransactionType = (transaction: CostCenterTransaction) => {
    if (transaction.reverses_transaction_id) return 'reversal'
    if (transaction.amount > 0) return 'credit'
    return 'charge'
  }

  const calculateRunningTotal = (index: number) => {
    // Calculate running total from newest to oldest
    const reversedTransactions = [...transactions].reverse()
    let total = 0
    for (let i = 0; i <= reversedTransactions.length - 1 - index; i++) {
      const tx = reversedTransactions[i]
      if (!tx.reversed_at) {
        total += tx.amount
      }
    }
    return total
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Left Panel - Cost Center List */}
      <div className={`${showMobileList ? 'block' : 'hidden md:block'}`}>
        <Card>
          <CardHeader>
            <CardTitle>Cost Centers</CardTitle>
            <CardDescription>Select a cost center to view its transaction history</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingCostCenters ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2">
                {costCenters.map((costCenter) => (
                  <div
                    key={costCenter.id}
                    onClick={() => handleSelectCostCenter(costCenter)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent ${
                      selectedCostCenter?.id === costCenter.id ? 'bg-accent border-primary' : 'border-border'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{costCenter.name}</div>
                          {!costCenter.active && (
                            <Badge variant="secondary" className="text-xs">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        {costCenter.description && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {costCenter.description}
                          </div>
                        )}
                      </div>
                      <div className="font-semibold text-right ml-2">
                        {formatCurrency(costCenter.total_amount || 0)}
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
                    {selectedCostCenter ? selectedCostCenter.name : 'Transaction History'}
                  </CardTitle>
                </div>
                {selectedCostCenter && (
                  <CardDescription>
                    Total Amount: {formatCurrency(selectedCostCenter.total_amount || 0)}
                  </CardDescription>
                )}
              </div>
              {selectedCostCenter && (
                <Button onClick={() => setAddDialogOpen(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Transaction
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedCostCenter ? (
              <div className="text-center py-12 text-muted-foreground">
                Select a cost center to view its transactions
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
                      <TableHead className="text-right">Running Total</TableHead>
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
                          <Badge variant={getTransactionType(transaction) === 'charge' ? 'default' : 'secondary'}>
                            {getTransactionType(transaction)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <div className="truncate">{transaction.description}</div>
                            {transaction.flightlog && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Flight: {format(new Date(transaction.flightlog.block_off), 'dd.MM.yyyy HH:mm')}
                              </div>
                            )}
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
                        <TableCell className="text-right font-medium">
                          {formatCurrency(calculateRunningTotal(index))}
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
      {selectedCostCenter && (
        <>
          <AddCostCenterTransactionDialog
            costCenter={selectedCostCenter}
            open={addDialogOpen}
            onOpenChange={setAddDialogOpen}
            onSuccess={handleSuccess}
          />
          {selectedTransaction && (
            <>
              <EditTransactionDialog
                transaction={selectedTransaction}
                type="cost_center"
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                onSuccess={handleSuccess}
              />
              <UndoTransactionDialog
                transaction={selectedTransaction}
                type="cost_center"
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
                type="cost-center"
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
