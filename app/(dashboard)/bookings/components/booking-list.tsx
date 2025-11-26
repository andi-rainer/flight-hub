import { getBookings } from '@/lib/actions/bookings'
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
import { BookingStatusBadge } from './booking-status-badge'
import { AssignBookingDialog } from './assign-booking-dialog'
import { CancelBookingDialog } from './cancel-booking-dialog'
import { formatCurrency } from '@/lib/format'
import { format } from 'date-fns'
import { FileText, User, Calendar, CreditCard, Clock, Plane } from 'lucide-react'

interface BookingListProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function BookingList({ searchParams }: BookingListProps) {
  const params = await searchParams
  const status = params.status as string | undefined
  const operationDayId = params.operationDayId as string | undefined
  const searchCode = params.searchCode as string | undefined
  const searchEmail = params.searchEmail as string | undefined
  const dateFrom = params.dateFrom as string | undefined
  const dateTo = params.dateTo as string | undefined

  const result = await getBookings({
    status,
    operationDayId,
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
            {result.error || 'Failed to load bookings'}
          </p>
        </CardContent>
      </Card>
    )
  }

  const bookings = result.data

  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            No bookings found. Try adjusting your filters.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bookings ({bookings.length})</CardTitle>
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
                <TableHead>Operation Day</TableHead>
                <TableHead>Timeframe</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking: any) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-mono font-medium">
                    {booking.booking_code}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>{booking.voucher_type?.name || 'Unknown'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <BookingStatusBadge status={booking.status} />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {booking.purchaser_name}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {booking.purchaser_email}
                      </div>
                      {booking.purchaser_phone && (
                        <div className="text-sm text-muted-foreground">
                          {booking.purchaser_phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {formatCurrency(Number(booking.price_paid_eur))}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {booking.operation_day ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(
                            new Date(booking.operation_day.operation_date),
                            'dd.MM.yyyy'
                          )}
                        </div>
                        {booking.operation_day.plane && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Plane className="h-3 w-3" />
                            {booking.operation_day.plane.tail_number}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {booking.timeframe ? (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {booking.timeframe.start_time.substring(0, 5)} -{' '}
                        {booking.timeframe.end_time.substring(0, 5)}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {booking.assigned_by_user ? (
                      <div className="text-sm">
                        Assigned by {booking.assigned_by_user.name}{' '}
                        {booking.assigned_by_user.surname}
                        <div className="text-xs text-muted-foreground">
                          {format(
                            new Date(booking.assigned_at),
                            'dd.MM.yyyy HH:mm'
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Not assigned</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {(booking.status === 'pending' ||
                        booking.status === 'confirmed') && (
                        <>
                          <AssignBookingDialog bookingId={booking.id} />
                          <CancelBookingDialog bookingId={booking.id} />
                        </>
                      )}
                    </div>
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
