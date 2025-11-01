'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { AlertTriangle, CheckCircle, Clock, Wrench, Info, Edit, Trash2 } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatHours } from '@/lib/format'

export type ComponentWithStatus = {
  id: string
  component_type: string
  position: string | null
  manufacturer: string | null
  model: string | null
  serial_number: string | null
  tbo_hours: number
  hours_at_installation: number | null
  component_hours_offset: number | null
  aircraft_current_hours: number | null
  component_current_hours: number | null
  hours_remaining: number | null
  percentage_used: number | null
  tbo_status: string | null
  status: string
}

interface ComponentStatusCardProps {
  component: ComponentWithStatus
  detailed?: boolean
  onEdit?: () => void
  onRemove?: () => void
  isBoardMember?: boolean
}

function getStatusBadge(status: string | null) {
  switch (status) {
    case 'ok':
      return (
        <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
          <CheckCircle className="h-3 w-3" />
          OK
        </Badge>
      )
    case 'attention':
      return (
        <Badge variant="default" className="gap-1 bg-blue-500 hover:bg-blue-600">
          <Info className="h-3 w-3" />
          Attention
        </Badge>
      )
    case 'warning':
      return (
        <Badge variant="default" className="gap-1 bg-yellow-600 hover:bg-yellow-700">
          <AlertTriangle className="h-3 w-3" />
          Warning
        </Badge>
      )
    case 'critical':
      return (
        <Badge variant="default" className="gap-1 bg-orange-600 hover:bg-orange-700">
          <AlertTriangle className="h-3 w-3" />
          Critical
        </Badge>
      )
    case 'overdue':
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Overdue
        </Badge>
      )
    case 'inactive':
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" />
          Inactive
        </Badge>
      )
    default:
      return <Badge variant="secondary">Unknown</Badge>
  }
}

function formatComponentType(type: string): string {
  const typeMap: Record<string, string> = {
    engine: 'Engine',
    propeller: 'Propeller',
    landing_gear: 'Landing Gear',
    constant_speed_unit: 'Constant Speed Unit',
    magneto: 'Magneto',
    vacuum_pump: 'Vacuum Pump',
    alternator: 'Alternator',
    starter: 'Starter',
    other: 'Other Component',
  }
  return typeMap[type] || type
}

function getProgressColor(percentageUsed: number): string {
  if (percentageUsed >= 95) return 'bg-red-600'
  if (percentageUsed >= 90) return 'bg-orange-600'
  if (percentageUsed >= 80) return 'bg-yellow-600'
  return 'bg-green-600'
}

export function ComponentStatusCard({
  component,
  detailed = false,
  onEdit,
  onRemove,
  isBoardMember = false,
}: ComponentStatusCardProps) {
  const componentName = component.position
    ? `${formatComponentType(component.component_type)} ${component.position}`
    : formatComponentType(component.component_type)

  const percentageUsed = component.percentage_used || 0
  const hoursRemaining = component.hours_remaining || 0
  const currentHours = component.component_current_hours || 0

  if (!detailed) {
    // Simple view for normal members
    return (
      <div className="rounded-lg border p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">{componentName}</span>
          </div>
          {getStatusBadge(component.tbo_status)}
        </div>

        {component.status === 'active' && (
          <>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Hours to TBO</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="font-medium cursor-help">
                        {formatHours(hoursRemaining)}
                        <span className="text-muted-foreground ml-1">
                          ({(100 - percentageUsed).toFixed(0)}% remaining)
                        </span>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Current: {formatHours(currentHours)} / TBO: {formatHours(component.tbo_hours)}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Progress
                value={percentageUsed}
                className="h-2"
                indicatorClassName={getProgressColor(percentageUsed)}
              />
            </div>
          </>
        )}
      </div>
    )
  }

  // Detailed view for board members
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            {componentName}
          </CardTitle>
          {getStatusBadge(component.tbo_status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Component Details */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {component.serial_number && (
            <div>
              <span className="text-muted-foreground">S/N:</span>
              <span className="ml-2 font-medium">{component.serial_number}</span>
            </div>
          )}
          {component.manufacturer && (
            <div>
              <span className="text-muted-foreground">Manufacturer:</span>
              <span className="ml-2 font-medium">{component.manufacturer}</span>
            </div>
          )}
          {component.model && (
            <div>
              <span className="text-muted-foreground">Model:</span>
              <span className="ml-2 font-medium">{component.model}</span>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">TBO:</span>
            <span className="ml-2 font-medium">{formatHours(component.tbo_hours)}</span>
          </div>
        </div>

        {component.status === 'active' && (
          <>
            {/* Hours Information */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current Hours:</span>
                <span className="font-medium">{formatHours(currentHours)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Hours Remaining:</span>
                <span className={`font-medium ${hoursRemaining < 0 ? 'text-red-600' : ''}`}>
                  {formatHours(hoursRemaining)}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0:00</span>
                <span>{formatHours(component.tbo_hours)} TBO</span>
              </div>
              <div className="relative">
                <Progress
                  value={Math.min(percentageUsed, 100)}
                  className="h-3"
                  indicatorClassName={getProgressColor(percentageUsed)}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-medium text-white drop-shadow-md">
                    {percentageUsed.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {component.status !== 'active' && (
          <div className="text-sm text-muted-foreground italic">
            Component is {component.status}
          </div>
        )}

        {/* Actions */}
        {isBoardMember && component.status === 'active' && (
          <div className="flex gap-2 pt-2 border-t">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                className="flex-1"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            {onRemove && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRemove}
                className="flex-1 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
