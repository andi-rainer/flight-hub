'use client'

import { format } from 'date-fns'
import { Calendar, Plane, User, StickyNote } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { updateOperationDay } from '@/lib/actions/manifest'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type OperationDayStatus = 'planned' | 'active' | 'completed' | 'cancelled'

interface OperationDayHeaderProps {
  operationDay: {
    id: string
    operation_date: string
    status: OperationDayStatus
    notes?: string | null
    plane: {
      tail_number: string
      type: string
      max_jumpers?: number | null
    }
    created_by_user?: {
      name: string
      surname: string
    } | null
    flights?: any[]
  }
  canManage: boolean
}

function getStatusBadgeVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
      return 'default'
    case 'planned':
      return 'secondary'
    case 'completed':
      return 'outline'
    case 'cancelled':
      return 'destructive'
    default:
      return 'outline'
  }
}

export function OperationDayHeader({ operationDay, canManage }: OperationDayHeaderProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)

  const handleStatusChange = async (newStatus: OperationDayStatus) => {
    setIsUpdating(true)
    try {
      const result = await updateOperationDay(operationDay.id, { status: newStatus })

      if (result.success) {
        toast.success(`Operation day status updated to ${newStatus}`)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to update status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsUpdating(false)
    }
  }

  const totalFlights = operationDay.flights?.length || 0
  const completedFlights =
    operationDay.flights?.filter((f) => f.status === 'completed').length || 0

  return (
    <div className="space-y-4">
      {/* Title and Status */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Operation Day
            </h1>
            <Badge variant={getStatusBadgeVariant(operationDay.status)} className="text-sm">
              {operationDay.status.toUpperCase()}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {format(new Date(operationDay.operation_date), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>

        {canManage && operationDay.status !== 'completed' && operationDay.status !== 'cancelled' && (
          <div className="flex items-center gap-2">
            <Select
              value={operationDay.status}
              onValueChange={handleStatusChange}
              disabled={isUpdating}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aircraft</CardTitle>
            <Plane className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{operationDay.plane.tail_number ?? ""}</div>
            <p className="text-xs text-muted-foreground">{operationDay.plane.type ?? ""}</p>
            {operationDay.plane.max_jumpers && (
              <p className="text-xs text-muted-foreground mt-1">
                Max {operationDay.plane.max_jumpers} jumpers/flight
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flights</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFlights}</div>
            <p className="text-xs text-muted-foreground">
              {completedFlights} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Created By</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {operationDay.created_by_user
                ? `${operationDay.created_by_user.name} ${operationDay.created_by_user.surname}`
                : 'Unknown'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {operationDay.notes && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <StickyNote className="h-4 w-4" />
              <CardTitle className="text-sm font-medium">Notes</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{operationDay.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
