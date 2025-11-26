import { Suspense } from 'react'
import { VoucherList } from './components/voucher-list'
import { VoucherFilters } from './components/voucher-filters'
import { CreateVoucherDialog } from './components/create-voucher-dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata = {
  title: 'Vouchers | FlightHub',
  description: 'Manage tandem jump vouchers',
}

export default async function VouchersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vouchers</h1>
          <p className="text-muted-foreground">
            Manage tandem jump vouchers purchased through the store
          </p>
        </div>
        <CreateVoucherDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Vouchers</CardTitle>
          <CardDescription>
            Search and filter vouchers by status, type, or customer details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VoucherFilters />
        </CardContent>
      </Card>

      <Suspense
        fallback={
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        }
      >
        <VoucherList searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
