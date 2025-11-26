import { Suspense } from 'react'
import { BookingList } from './components/booking-list'
import { BookingFilters } from './components/booking-filters'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata = {
  title: 'Ticket Bookings | FlightHub',
  description: 'Manage tandem jump ticket bookings',
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ticket Bookings</h1>
          <p className="text-muted-foreground">
            Manage tandem jump bookings purchased through the store
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Bookings</CardTitle>
          <CardDescription>
            Search and filter bookings by status, operation day, or customer details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BookingFilters />
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
        <BookingList searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
