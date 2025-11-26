import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Clock, Ban } from 'lucide-react'

interface VoucherStatusBadgeProps {
  status: string
}

export function VoucherStatusBadge({ status }: VoucherStatusBadgeProps) {
  const statusConfig = {
    active: {
      label: 'Active',
      variant: 'default' as const,
      icon: CheckCircle2,
      className: 'bg-green-500/10 text-green-700 dark:text-green-400',
    },
    redeemed: {
      label: 'Redeemed',
      variant: 'secondary' as const,
      icon: CheckCircle2,
      className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
    },
    expired: {
      label: 'Expired',
      variant: 'secondary' as const,
      icon: Clock,
      className: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
    },
    cancelled: {
      label: 'Cancelled',
      variant: 'destructive' as const,
      icon: Ban,
      className: 'bg-red-500/10 text-red-700 dark:text-red-400',
    },
  }

  const config = statusConfig[status as keyof typeof statusConfig] || {
    label: status,
    variant: 'secondary' as const,
    icon: XCircle,
    className: '',
  }

  const Icon = config.icon

  return (
    <Badge variant={config.variant} className={config.className}>
      <Icon className="mr-1 h-3 w-3" />
      {config.label}
    </Badge>
  )
}
