'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'
import type { DocumentEndorsementPrivilege, Endorsement } from '@/lib/types'

type EndorsementPrivilege = DocumentEndorsementPrivilege & {
  endorsement: Endorsement
}

interface DocumentPrivilegesDisplayProps {
  documentId: string
  compact?: boolean
}

/**
 * Calculate expiry status and color for a date
 */
function getExpiryStatus(expiryDate: string | null): {
  status: 'expired' | 'critical' | 'warning' | 'ok' | 'none'
  colorClass: string
} {
  if (!expiryDate) return { status: 'none', colorClass: '' }

  const now = new Date()
  const expiry = new Date(expiryDate)
  const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (daysUntilExpiry < 0) {
    return { status: 'expired', colorClass: 'text-red-600 dark:text-red-400' }
  }
  if (daysUntilExpiry < 5) {
    return { status: 'critical', colorClass: 'text-red-500 dark:text-red-400' }
  }
  if (daysUntilExpiry < 45) {
    return { status: 'warning', colorClass: 'text-orange-500 dark:text-orange-400' }
  }
  return { status: 'ok', colorClass: 'text-green-600 dark:text-green-400' }
}

export function DocumentPrivilegesDisplay({ documentId, compact = false }: DocumentPrivilegesDisplayProps) {
  const [privileges, setPrivileges] = useState<EndorsementPrivilege[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadPrivileges()
  }, [documentId])

  const loadPrivileges = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/documents/${documentId}/endorsements`)
      if (response.ok) {
        const data = await response.json()
        setPrivileges(data.privileges || [])
      }
    } catch (error) {
      console.error('Error loading endorsements:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <div className="text-xs text-muted-foreground">Loading...</div>
  }

  if (privileges.length === 0) {
    return <div className="text-xs text-muted-foreground">—</div>
  }

  return (
    <div className="space-y-1">
      {privileges.map((privilege) => {
        const mainStatus = getExpiryStatus(privilege.expiry_date)
        const irStatus = privilege.has_ir ? getExpiryStatus(privilege.ir_expiry_date) : null

        // Determine worst status for this endorsement
        const worstStatus =
          ['expired', 'critical', 'warning', 'ok', 'none'].indexOf(mainStatus.status) <
          ['expired', 'critical', 'warning', 'ok', 'none'].indexOf(irStatus?.status || 'ok')
            ? mainStatus
            : irStatus || mainStatus

        return (
          <div key={privilege.id} className="flex flex-col gap-0.5">
            {/* Endorsement code badge and expiry */}
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-xs font-medium">
                {privilege.endorsement.code}
              </Badge>
              {privilege.expiry_date && (
                <div className={`flex items-center gap-1 text-xs ${worstStatus.colorClass}`}>
                  {(worstStatus.status === 'expired' || worstStatus.status === 'critical' || worstStatus.status === 'warning') && (
                    <AlertTriangle className="h-3 w-3" />
                  )}
                  <span>
                    {new Date(privilege.expiry_date).toLocaleDateString()}
                  </span>
                </div>
              )}
              {!privilege.expiry_date && (
                <span className="text-xs text-muted-foreground">No expiry</span>
              )}
            </div>

            {/* IR section if applicable */}
            {privilege.has_ir && (
              <div className={`flex items-center gap-1 text-xs pl-2 ${irStatus?.colorClass || ''}`}>
                <span className="font-semibold">IR:</span>
                {privilege.ir_expiry_date ? (
                  <>
                    {(irStatus?.status === 'expired' || irStatus?.status === 'critical' || irStatus?.status === 'warning') && (
                      <AlertTriangle className="h-3 w-3" />
                    )}
                    <span>{new Date(privilege.ir_expiry_date).toLocaleDateString()}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">No expiry</span>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
