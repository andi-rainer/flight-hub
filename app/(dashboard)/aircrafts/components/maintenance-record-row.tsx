'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TableCell, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { deleteMaintenanceRecord } from '../maintenance-actions'
import type { MaintenanceRecord } from './aircraft-maintenance-tab'
import { formatHours, formatEuro } from '@/lib/format'

interface MaintenanceRecordRowProps {
  record: MaintenanceRecord
  aircraftId: string
  isBoardMember: boolean
}

export function MaintenanceRecordRow({ record, aircraftId, isBoardMember }: MaintenanceRecordRowProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this maintenance record?')) {
      return
    }

    setDeleting(true)

    const result = await deleteMaintenanceRecord(record.id, aircraftId)

    setDeleting(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Maintenance record deleted successfully')
      router.refresh()
    }
  }

  return (
    <TableRow>
      <TableCell>
        {new Date(record.performed_at).toLocaleDateString()}
      </TableCell>
      <TableCell className="font-mono">
        {formatHours(record.performed_at_hours)}
      </TableCell>
      <TableCell className="font-medium">
        {record.maintenance_type}
      </TableCell>
      <TableCell className="max-w-md truncate">
        {record.description || '-'}
      </TableCell>
      <TableCell>
        {record.vendor || '-'}
      </TableCell>
      <TableCell>
        {record.cost ? formatEuro(record.cost) : '-'}
      </TableCell>
      {isBoardMember && (
        <TableCell className="text-right">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </TableCell>
      )}
    </TableRow>
  )
}
