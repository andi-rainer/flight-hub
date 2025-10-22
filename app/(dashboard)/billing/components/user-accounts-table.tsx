'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users } from 'lucide-react'
import { UserAccountDetailsDialog } from './user-account-details-dialog'
import type { UserBalance } from '@/lib/database.types'

interface UserAccountsTableProps {
  balances: UserBalance[]
}

export function UserAccountsTable({ balances }: UserAccountsTableProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)

  const handleViewDetails = (userId: string) => {
    setSelectedUserId(userId)
    setDetailsDialogOpen(true)
  }

  const getBalanceBadge = (balance: number | null) => {
    if (balance === null || balance === 0) {
      return <Badge variant="outline">€ 0.00</Badge>
    }
    if (balance > 0) {
      return <Badge className="bg-green-500 hover:bg-green-600">€ {balance.toFixed(2)}</Badge>
    }
    return <Badge variant="destructive">€ {balance.toFixed(2)}</Badge>
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>User Accounts</CardTitle>
          <CardDescription>
            {balances.length} {balances.length === 1 ? 'user' : 'users'} with account activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          {balances.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No user accounts</p>
              <p className="text-sm">User accounts will appear here once transactions are created</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-center">Transactions</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balances.map((balance) => (
                    <TableRow key={balance.user_id}>
                      <TableCell className="font-medium">
                        {balance.name} {balance.surname}
                      </TableCell>
                      <TableCell>{balance.email}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          {balance.transaction_count || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {getBalanceBadge(balance.balance)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => balance.user_id && handleViewDetails(balance.user_id)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedUserId && (
        <UserAccountDetailsDialog
          userId={selectedUserId}
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
        />
      )}
    </>
  )
}
