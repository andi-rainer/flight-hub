'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Calendar, ChevronRight, Plane } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EditOperationDayDialog } from './edit-operation-day-dialog'
import { DeleteOperationDayDialog } from './delete-operation-day-dialog'
import { ManageTimeframesDialog } from './manage-timeframes-dialog'

interface OperationDay {
  id: string
  operation_date: string
  status: 'planned' | 'active' | 'completed' | 'cancelled'
  notes?: string | null
  plane: {
    tail_number: string
    type: string
  }
  flights?: Array<{
    id: string
    flight_number: number
    scheduled_time: string
    status: string
    pilot_id?: string | null
    pilot?: {
      name: string
      surname: string
    } | null
  }>
}

interface Plane {
  id: string
  tail_number: string
  type: string
}

interface OperationDayListProps {
  operationDays: OperationDay[]
  availablePlanes: Plane[]
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

export function OperationDayList({
  operationDays,
  availablePlanes,
  canManage,
}: OperationDayListProps) {
  if (operationDays.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="mb-2 text-lg font-semibold">No Operation Days Scheduled</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Create your first operation day to start managing skydive operations.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Aircraft</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Flights</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {operationDays.map((operationDay) => (
            <TableRow key={operationDay.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {format(new Date(operationDay.operation_date), 'EEE, MMM d, yyyy')}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Plane className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{operationDay.plane.tail_number ?? ""}</div>
                    <div className="text-xs text-muted-foreground">
                      {operationDay.plane.type ?? ""}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(operationDay.status)}>
                  {operationDay.status}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {operationDay.flights?.length || 0} flights scheduled
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  {canManage && (
                    <>
                      <ManageTimeframesDialog
                        operationDayId={operationDay.id}
                        operationDate={operationDay.operation_date}
                      />
                      <EditOperationDayDialog
                        operationDay={operationDay}
                        availablePlanes={availablePlanes}
                      />
                      <DeleteOperationDayDialog operationDay={operationDay} />
                    </>
                  )}
                  <Link href={`/manifest/${operationDay.id}`}>
                    <Button variant="ghost" size="sm">
                      View Details
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
