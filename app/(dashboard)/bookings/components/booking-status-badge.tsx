import { Badge } from '@/components/ui/badge'
import { Clock, CheckCircle2, UserCheck, Trophy, Ban } from 'lucide-react'

interface BookingStatusBadgeProps {
  status: string
}

export function BookingStatusBadge({ status }: BookingStatusBadgeProps) {
  const statusConfig = {
    pending: {
      label: 'Pending',
      variant: 'secondary' as const,
      icon: Clock,
      className: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
    },
    confirmed: {
      label: 'Confirmed',
      variant: 'default' as const,
      icon: CheckCircle2,
      className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
    },
    assigned: {
      label: 'Assigned',
      variant: 'default' as const,
      icon: UserCheck,
      className: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
    },
    completed: {
      label: 'Completed',
      variant: 'default' as const,
      icon: Trophy,
      className: 'bg-green-500/10 text-green-700 dark:text-green-400',
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
    icon: Clock,
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
