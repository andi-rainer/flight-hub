import { getVouchers } from '@/lib/actions/vouchers'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { VoucherStatusBadge } from './voucher-status-badge'
import { CancelVoucherDialog } from './cancel-voucher-dialog'
import { formatCurrency } from '@/lib/format'
import { format } from 'date-fns'
import { FileText, User, Calendar, CreditCard } from 'lucide-react'

interface VoucherListProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function VoucherList({ searchParams }: VoucherListProps) {
  const params = await searchParams
  const status = params.status as string | undefined
  const voucherTypeId = params.voucherTypeId as string | undefined
  const searchCode = params.searchCode as string | undefined
  const searchEmail = params.searchEmail as string | undefined
  const dateFrom = params.dateFrom as string | undefined
  const dateTo = params.dateTo as string | undefined

  const result = await getVouchers({
    status,
    voucherTypeId,
    searchCode,
    searchEmail,
    dateFrom,
    dateTo,
  })

  if (!result.success || !result.data) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            {result.error || 'Failed to load vouchers'}
          </p>
        </CardContent>
      </Card>
    )
  }

  const vouchers = result.data

  if (vouchers.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            No vouchers found. Try adjusting your filters.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vouchers ({vouchers.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Purchaser</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Purchase Date</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead>Redeemed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vouchers.map((voucher: any) => (
                <TableRow key={voucher.id}>
                  <TableCell className="font-mono font-medium">
                    {voucher.voucher_code}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>{voucher.voucher_type?.name || 'Unknown'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <VoucherStatusBadge status={voucher.status} />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {voucher.purchaser_name}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {voucher.purchaser_email}
                      </div>
                      {voucher.purchaser_phone && (
                        <div className="text-sm text-muted-foreground">
                          {voucher.purchaser_phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {formatCurrency(Number(voucher.price_paid_eur))}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(
                        new Date(voucher.purchase_date),
                        'dd.MM.yyyy HH:mm'
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {voucher.valid_until ? (
                      <div className="text-sm">
                        {format(new Date(voucher.valid_until), 'dd.MM.yyyy')}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No expiry</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {voucher.status === 'redeemed' && voucher.redeemed_at ? (
                      <div className="space-y-1">
                        <div className="text-sm">
                          {format(
                            new Date(voucher.redeemed_at),
                            'dd.MM.yyyy HH:mm'
                          )}
                        </div>
                        {voucher.redeemed_for_user && (
                          <div className="text-xs text-muted-foreground">
                            {voucher.redeemed_for_user.name}{' '}
                            {voucher.redeemed_for_user.surname}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {voucher.status === 'active' && (
                      <CancelVoucherDialog voucherId={voucher.id} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
