'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ManageTimeframesDialog } from '../../components/manage-timeframes-dialog'
import { getOperationDayTimeframes } from '@/lib/actions/manifest'
import { toast } from 'sonner'

interface Timeframe {
  id: string
  start_time: string
  end_time: string
  max_bookings: number
  overbooking_allowed: number
  current_bookings: number
  active: boolean
}

interface BookingTimeframesSectionProps {
  operationDayId: string
  operationDate: string
  canManage: boolean
}

export function BookingTimeframesSection({
  operationDayId,
  operationDate,
  canManage,
}: BookingTimeframesSectionProps) {
  const [timeframes, setTimeframes] = useState<Timeframe[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadTimeframes = async () => {
    setIsLoading(true)
    const result = await getOperationDayTimeframes(operationDayId)
    if (result.success && result.data) {
      setTimeframes(result.data)
    } else {
      toast.error('Failed to load timeframes')
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadTimeframes()
  }, [operationDayId])

  const totalCapacity = timeframes.reduce((sum, tf) => sum + tf.max_bookings + tf.overbooking_allowed, 0)
  const totalBookings = timeframes.reduce((sum, tf) => sum + tf.current_bookings, 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Customer Booking Slots
            </CardTitle>
            <CardDescription>
              Time slots available for online bookings via the store
            </CardDescription>
          </div>
          {canManage && (
            <ManageTimeframesDialog
              operationDayId={operationDayId}
              operationDate={operationDate}
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : timeframes.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">No booking timeframes configured yet</p>
            {canManage && (
              <p className="text-sm text-muted-foreground">
                Click "Booking Slots" above to configure time slots for customer bookings
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">Total Capacity: </span>
                <span className="font-medium">{totalCapacity} slots</span>
              </div>
              <div>
                <span className="text-muted-foreground">Current Bookings: </span>
                <span className="font-medium">{totalBookings} / {totalCapacity}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Available: </span>
                <span className="font-medium text-green-600">
                  {totalCapacity - totalBookings} slots
                </span>
              </div>
            </div>

            {/* Timeframes Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time Slot</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Overbooking</TableHead>
                    <TableHead>Bookings</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeframes.map((timeframe) => {
                    const available =
                      timeframe.max_bookings +
                      timeframe.overbooking_allowed -
                      timeframe.current_bookings
                    const isFull = available <= 0
                    const isAlmostFull =
                      timeframe.current_bookings >=
                      timeframe.max_bookings * 0.8

                    return (
                      <TableRow key={timeframe.id}>
                        <TableCell className="font-medium">
                          {timeframe.start_time} - {timeframe.end_time}
                        </TableCell>
                        <TableCell>{timeframe.max_bookings}</TableCell>
                        <TableCell>+{timeframe.overbooking_allowed}</TableCell>
                        <TableCell>
                          <span
                            className={
                              isFull
                                ? 'text-red-600 font-medium'
                                : isAlmostFull
                                  ? 'text-orange-600 font-medium'
                                  : ''
                            }
                          >
                            {timeframe.current_bookings}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              isFull
                                ? 'text-red-600 font-medium'
                                : isAlmostFull
                                  ? 'text-orange-600'
                                  : 'text-green-600'
                            }
                          >
                            {available}
                          </span>
                        </TableCell>
                        <TableCell>
                          {timeframe.active ? (
                            isFull ? (
                              <Badge variant="destructive">Full</Badge>
                            ) : isAlmostFull ? (
                              <Badge variant="secondary">Almost Full</Badge>
                            ) : (
                              <Badge variant="default">Available</Badge>
                            )
                          ) : (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
