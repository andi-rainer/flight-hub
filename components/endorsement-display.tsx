'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, AlertTriangle, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { DocumentEndorsementPrivilege, Endorsement } from '@/lib/types'

type EndorsementPrivilege = DocumentEndorsementPrivilege & {
  endorsement: Endorsement
}

interface EndorsementDisplayProps {
  privileges: EndorsementPrivilege[]
  documentName?: string
  className?: string
}

/**
 * Calculate status and color for an expiry date
 * @param expiryDate - ISO date string or null
 * @returns Status object with label, color, icon
 */
function getExpiryStatus(expiryDate: string | null): {
  status: 'valid' | 'expiring' | 'expired' | 'none'
  label: string
  colorClass: string
  bgColorClass: string
  Icon: any
} {
  if (!expiryDate) {
    return {
      status: 'none',
      label: 'No expiry',
      colorClass: 'text-muted-foreground',
      bgColorClass: 'bg-muted',
      Icon: null,
    }
  }

  const expiry = new Date(expiryDate)
  const now = new Date()
  const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (daysUntilExpiry < 0) {
    return {
      status: 'expired',
      label: 'Expired',
      colorClass: 'text-red-600 dark:text-red-400',
      bgColorClass: 'bg-red-100 dark:bg-red-950',
      Icon: XCircle,
    }
  } else if (daysUntilExpiry <= 30) {
    return {
      status: 'expiring',
      label: `Expires in ${daysUntilExpiry} days`,
      colorClass: 'text-orange-600 dark:text-orange-400',
      bgColorClass: 'bg-orange-100 dark:bg-orange-950',
      Icon: AlertTriangle,
    }
  } else if (daysUntilExpiry <= 60) {
    return {
      status: 'expiring',
      label: `Expires in ${daysUntilExpiry} days`,
      colorClass: 'text-yellow-600 dark:text-yellow-400',
      bgColorClass: 'bg-yellow-100 dark:bg-yellow-950',
      Icon: Clock,
    }
  }

  return {
    status: 'valid',
    label: `Valid until ${new Date(expiryDate).toLocaleDateString()}`,
    colorClass: 'text-green-600 dark:text-green-400',
    bgColorClass: 'bg-green-100 dark:bg-green-950',
    Icon: CheckCircle2,
  }
}

/**
 * Format date for display
 */
function formatDate(date: string | null): string {
  if (!date) return 'No expiry'
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * EndorsementDisplay Component
 *
 * Displays a list of endorsements/ratings with expandable details
 * Shows expiry status with color-coded badges and icons
 * Displays IR (Instrument Rating) status separately with its own expiry
 */
export function EndorsementDisplay({ privileges, documentName, className }: EndorsementDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!privileges || privileges.length === 0) {
    return (
      <div className={cn('text-sm text-muted-foreground', className)}>
        No endorsements/ratings
      </div>
    )
  }

  // Get worst status for summary badge
  const hasExpired = privileges.some(p => {
    const mainStatus = getExpiryStatus(p.expiry_date)
    const irStatus = p.has_ir ? getExpiryStatus(p.ir_expiry_date) : null
    return mainStatus.status === 'expired' || irStatus?.status === 'expired'
  })

  const hasExpiring = privileges.some(p => {
    const mainStatus = getExpiryStatus(p.expiry_date)
    const irStatus = p.has_ir ? getExpiryStatus(p.ir_expiry_date) : null
    return mainStatus.status === 'expiring' || irStatus?.status === 'expiring'
  })

  const summaryStatus = hasExpired ? 'expired' : hasExpiring ? 'expiring' : 'valid'
  const summaryColorClass =
    summaryStatus === 'expired'
      ? 'text-red-600 dark:text-red-400'
      : summaryStatus === 'expiring'
      ? 'text-orange-600 dark:text-orange-400'
      : 'text-green-600 dark:text-green-400'

  return (
    <div className={cn('space-y-2', className)}>
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm font-medium hover:underline focus:outline-none"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <span>
          {privileges.length} {privileges.length === 1 ? 'Endorsement' : 'Endorsements'}
        </span>
        <span className={cn('text-xs', summaryColorClass)}>
          ({summaryStatus})
        </span>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="space-y-2 pl-6">
          {privileges.map((privilege) => {
            const mainStatus = getExpiryStatus(privilege.expiry_date)
            const irStatus = privilege.has_ir ? getExpiryStatus(privilege.ir_expiry_date) : null

            return (
              <Card key={privilege.id} className={cn('p-3 space-y-2', mainStatus.bgColorClass)}>
                {/* Endorsement header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {privilege.endorsement.code}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {privilege.endorsement.name}
                      </span>
                    </div>
                    {privilege.endorsement.name_de && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {privilege.endorsement.name_de}
                      </div>
                    )}
                  </div>
                </div>

                {/* Main expiry status */}
                <div className="flex items-center gap-2">
                  {mainStatus.Icon && (
                    <mainStatus.Icon className={cn('h-4 w-4', mainStatus.colorClass)} />
                  )}
                  <span className={cn('text-sm font-medium', mainStatus.colorClass)}>
                    {mainStatus.label}
                  </span>
                  {privilege.expiry_date && (
                    <Badge variant="outline" className="ml-auto">
                      {formatDate(privilege.expiry_date)}
                    </Badge>
                  )}
                </div>

                {/* IR status (if applicable) */}
                {privilege.has_ir && (
                  <div className={cn('pl-4 border-l-2 space-y-1', mainStatus.colorClass)}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">IR (Instrument Rating)</span>
                      {irStatus?.Icon && (
                        <irStatus.Icon className={cn('h-3 w-3', irStatus.colorClass)} />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn('text-xs', irStatus?.colorClass)}>
                        {irStatus?.label}
                      </span>
                      {privilege.ir_expiry_date && (
                        <Badge variant="outline" className="ml-auto text-xs">
                          {formatDate(privilege.ir_expiry_date)}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {privilege.notes && (
                  <div className="text-xs text-muted-foreground pt-1 border-t">
                    {privilege.notes}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
