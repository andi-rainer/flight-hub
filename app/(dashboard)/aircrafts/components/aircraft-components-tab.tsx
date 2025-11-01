'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, AlertTriangle, Wrench } from 'lucide-react'
import { ComponentStatusCard, type ComponentWithStatus } from './component-status-card'
import { AddComponentDialog } from './add-component-dialog'
import { getActiveAircraftComponents } from '@/lib/actions/aircraft-components'
import { toast } from 'sonner'

interface AircraftComponentsTabProps {
  aircraftId: string
  aircraftTailNumber: string
  aircraftCurrentHours: number
  isBoardMember: boolean
}

export function AircraftComponentsTab({
  aircraftId,
  aircraftTailNumber,
  aircraftCurrentHours,
  isBoardMember,
}: AircraftComponentsTabProps) {
  const [components, setComponents] = useState<ComponentWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  useEffect(() => {
    loadComponents()
  }, [aircraftId])

  async function loadComponents() {
    setLoading(true)
    const result = await getActiveAircraftComponents(aircraftId)

    if (result.success && result.data) {
      setComponents(result.data as ComponentWithStatus[])
    } else {
      toast.error(result.error || 'Failed to load components')
    }
    setLoading(false)
  }

  // Group components by type
  const componentsByType = components.reduce((acc, component) => {
    const type = component.component_type
    if (!acc[type]) {
      acc[type] = []
    }
    acc[type].push(component)
    return acc
  }, {} as Record<string, ComponentWithStatus[]>)

  // Check for critical or overdue components
  const criticalComponents = components.filter(
    c => c.tbo_status === 'critical' || c.tbo_status === 'overdue'
  )

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-2">
            <Wrench className="h-8 w-8 animate-pulse text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading components...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Life-Limited Components</h3>
          <p className="text-sm text-muted-foreground">
            Track TBO (Time Between Overhaul) for engines, propellers, and other components
          </p>
        </div>
        {isBoardMember && (
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Component
          </Button>
        )}
      </div>

      {/* Critical Alerts */}
      {criticalComponents.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{criticalComponents.length}</strong> component(s) {criticalComponents.length === 1 ? 'is' : 'are'} at or near TBO.
            Immediate attention required.
          </AlertDescription>
        </Alert>
      )}

      {/* Components Display */}
      {components.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No Components Tracked</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              No life-limited components are currently being tracked for this aircraft.
              {isBoardMember && ' Add components to monitor TBO and ensure compliance.'}
            </p>
            {isBoardMember && (
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Component
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Simple View for All Users */}
          {!isBoardMember && (
            <div className="grid gap-3 sm:grid-cols-2">
              {components.map((component) => (
                <ComponentStatusCard
                  key={component.id}
                  component={component}
                  detailed={false}
                />
              ))}
            </div>
          )}

          {/* Detailed View for Board Members */}
          {isBoardMember && Object.entries(componentsByType).map(([type, typeComponents]) => (
            <div key={type} className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                {type.replace('_', ' ')}
              </h4>
              <div className="grid gap-4 md:grid-cols-2">
                {typeComponents.map((component) => (
                  <ComponentStatusCard
                    key={component.id}
                    component={component}
                    detailed={true}
                    isBoardMember={isBoardMember}
                    onEdit={() => {
                      // TODO: Open edit dialog
                      toast.info('Edit component dialog coming soon')
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Component Dialog */}
      <AddComponentDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={loadComponents}
        aircraftId={aircraftId}
        aircraftTailNumber={aircraftTailNumber}
        currentAircraftHours={aircraftCurrentHours}
      />
    </div>
  )
}
