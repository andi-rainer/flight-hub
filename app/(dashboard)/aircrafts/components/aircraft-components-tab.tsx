'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, AlertTriangle, Wrench, History } from 'lucide-react'
import { ComponentStatusCard, type ComponentWithStatus } from './component-status-card'
import { AddComponentDialog } from './add-component-dialog'
import { EditComponentDialog } from './edit-component-dialog'
import { getAircraftComponents, removeComponent } from '@/lib/actions/aircraft-components'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

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
  const [showHistory, setShowHistory] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [selectedComponent, setSelectedComponent] = useState<ComponentWithStatus | null>(null)

  useEffect(() => {
    loadComponents()
  }, [aircraftId])

  async function loadComponents() {
    setLoading(true)
    const result = await getAircraftComponents(aircraftId)

    if (result.success && result.data) {
      setComponents(result.data as ComponentWithStatus[])
    } else {
      toast.error(result.error || 'Failed to load components')
    }
    setLoading(false)
  }

  async function handleRemove() {
    if (!selectedComponent) return

    const result = await removeComponent(selectedComponent.id, 'Removed via UI')
    if (result.success) {
      toast.success('Component removed successfully')
      loadComponents()
    } else {
      toast.error(result.error || 'Failed to remove component')
    }
    setRemoveDialogOpen(false)
    setSelectedComponent(null)
  }

  // Filter components
  const activeComponents = components.filter(c => c.status === 'active')
  const inactiveComponents = components.filter(c => c.status !== 'active')
  const displayedComponents = showHistory ? components : activeComponents

  // Group components by type
  const componentsByType = displayedComponents.reduce((acc, component) => {
    const type = component.component_type
    if (!acc[type]) {
      acc[type] = []
    }
    acc[type].push(component)
    return acc
  }, {} as Record<string, ComponentWithStatus[]>)

  // Check for critical or overdue components
  const criticalComponents = activeComponents.filter(
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
          <div className="flex gap-2">
            {inactiveComponents.length > 0 && (
              <Button
                variant={showHistory ? "default" : "outline"}
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="h-4 w-4 mr-2" />
                {showHistory ? 'Hide History' : `History (${inactiveComponents.length})`}
              </Button>
            )}
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Component
            </Button>
          </div>
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
                      setSelectedComponent(component)
                      setEditDialogOpen(true)
                    }}
                    onRemove={() => {
                      setSelectedComponent(component)
                      setRemoveDialogOpen(true)
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

      {/* Edit Component Dialog */}
      {selectedComponent && (
        <EditComponentDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={loadComponents}
          component={selectedComponent}
        />
      )}

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Component?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the component as removed. The component and its history will still be visible
              in the history view. This action can be reversed if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} className="bg-red-600 hover:bg-red-700">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
