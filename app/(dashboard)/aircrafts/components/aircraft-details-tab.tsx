'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Pencil } from 'lucide-react'
import type { Plane } from '@/lib/database.types'
import { AircraftForm } from './aircraft-form'
import { useState } from 'react'
import { format } from 'date-fns'

interface AircraftDetailsTabProps {
  aircraft: Plane
  isBoardMember: boolean
}

export function AircraftDetailsTab({ aircraft, isBoardMember }: AircraftDetailsTabProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Aircraft Information</CardTitle>
              <CardDescription>Basic details about this aircraft</CardDescription>
            </div>
            {isBoardMember && (
              <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Edit Aircraft</DialogTitle>
                    <DialogDescription>
                      Update the aircraft details below.
                    </DialogDescription>
                  </DialogHeader>
                  <AircraftForm aircraft={aircraft} onSuccess={() => setEditDialogOpen(false)} />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tail Number</p>
              <p className="text-lg font-semibold">{aircraft.tail_number}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Type</p>
              <p className="text-lg">{aircraft.type}</p>
            </div>
            {aircraft.color && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Color</p>
                <p className="text-lg">{aircraft.color}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <div className="mt-1">
                <Badge variant={aircraft.active ? 'default' : 'secondary'}>
                  {aircraft.active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-4">Technical Specifications</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aircraft.empty_weight !== null && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Empty Weight</p>
                  <p className="text-lg">{aircraft.empty_weight} kg</p>
                </div>
              )}
              {aircraft.max_mass !== null && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Max Mass</p>
                  <p className="text-lg">{aircraft.max_mass} kg</p>
                </div>
              )}
              {aircraft.max_fuel !== null && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Max Fuel</p>
                  <p className="text-lg">{aircraft.max_fuel} L</p>
                </div>
              )}
              {aircraft.fuel_consumption !== null && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fuel Consumption</p>
                  <p className="text-lg">{aircraft.fuel_consumption} L/h</p>
                </div>
              )}
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-4">Equipment</h3>
            <div className="space-y-4">
              {aircraft.nav_equipment && aircraft.nav_equipment.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Nav Equipment</p>
                  <div className="flex flex-wrap gap-2">
                    {aircraft.nav_equipment.map((equipment, index) => (
                      <Badge key={index} variant="outline">
                        {equipment}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {aircraft.xdpr_equipment && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">XPDR Equipment</p>
                  <p className="text-lg">{aircraft.xdpr_equipment}</p>
                </div>
              )}
              {aircraft.emer_equipment && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Emergency Equipment</p>
                  <p className="text-lg">{aircraft.emer_equipment}</p>
                </div>
              )}
            </div>
          </div>

          {aircraft.cg_limits && (
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4">CG Limits</h3>
              <div className="bg-muted p-4 rounded-lg">
                <pre className="text-sm overflow-x-auto">
                  {JSON.stringify(aircraft.cg_limits, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground">
              Created: {format(new Date(aircraft.created_at), 'dd.MM.yyyy')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
