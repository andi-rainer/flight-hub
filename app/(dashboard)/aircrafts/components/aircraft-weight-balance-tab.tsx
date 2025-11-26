'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react'
import { updateAircraftEmptyCg, updateAircraftEmptyWeight, deleteCgLimit, deleteStation } from '@/lib/actions/weight-balance'
import { toast } from 'sonner'
import { CgLimitDialog } from './cg-limit-dialog'
import { StationDialog } from './station-dialog'
import { ConvertMassUnitDialog } from './convert-mass-unit-dialog'
import type { Plane } from '@/lib/database.types'

interface CgLimit {
  id: string
  weight: number
  arm: number
  limit_type: 'forward' | 'aft'
  sort_order: number
  notes: string | null
}

interface Station {
  id: string
  name: string
  station_type: 'seat' | 'cargo' | 'fuel' | 'aircraft_item'
  arm: number
  weight_limit: number
  basic_weight: number
  sort_order: number
  active: boolean
  notes: string | null
}

interface AircraftWeightBalanceTabProps {
  aircraft: Plane
  cgLimits: CgLimit[]
  stations: Station[]
  canEdit: boolean
}

export function AircraftWeightBalanceTab({
  aircraft,
  cgLimits,
  stations,
  canEdit,
}: AircraftWeightBalanceTabProps) {
  const [isEditingEmptyCg, setIsEditingEmptyCg] = useState(false)
  const [emptyCgValue, setEmptyCgValue] = useState(aircraft.empty_cg?.toString() || '')
  const [isSavingEmptyCg, setIsSavingEmptyCg] = useState(false)

  const [isEditingEmptyWeight, setIsEditingEmptyWeight] = useState(false)
  const [emptyWeightValue, setEmptyWeightValue] = useState(aircraft.empty_weight?.toString() || '')
  const [isSavingEmptyWeight, setIsSavingEmptyWeight] = useState(false)

  // Dialog states
  const [cgLimitDialogOpen, setCgLimitDialogOpen] = useState(false)
  const [stationDialogOpen, setStationDialogOpen] = useState(false)
  const [convertUnitDialogOpen, setConvertUnitDialogOpen] = useState(false)
  const [editingCgLimit, setEditingCgLimit] = useState<CgLimit | null>(null)
  const [editingStation, setEditingStation] = useState<Station | null>(null)
  const [targetMassUnit, setTargetMassUnit] = useState<'kg' | 'lbs'>('kg')

  // Sort limits and stations
  const forwardLimits = cgLimits
    .filter(l => l.limit_type === 'forward')
    .sort((a, b) => a.sort_order - b.sort_order)
  const aftLimits = cgLimits
    .filter(l => l.limit_type === 'aft')
    .sort((a, b) => a.sort_order - b.sort_order)
  const sortedStations = [...stations].sort((a, b) => a.sort_order - b.sort_order)

  const handleSaveEmptyCg = async () => {
    setIsSavingEmptyCg(true)
    const value = emptyCgValue === '' ? null : parseFloat(emptyCgValue)

    if (value !== null && isNaN(value)) {
      toast.error('Invalid empty CG value')
      setIsSavingEmptyCg(false)
      return
    }

    const result = await updateAircraftEmptyCg(aircraft.id, value)

    if (result.success) {
      toast.success('Empty CG updated')
      setIsEditingEmptyCg(false)
    } else {
      toast.error(result.error || 'Failed to update empty CG')
    }

    setIsSavingEmptyCg(false)
  }

  const handleCancelEmptyCg = () => {
    setEmptyCgValue(aircraft.empty_cg?.toString() || '')
    setIsEditingEmptyCg(false)
  }

  const handleSaveEmptyWeight = async () => {
    setIsSavingEmptyWeight(true)
    const value = emptyWeightValue === '' ? null : parseFloat(emptyWeightValue)

    if (value !== null && isNaN(value)) {
      toast.error('Invalid empty weight value')
      setIsSavingEmptyWeight(false)
      return
    }

    const result = await updateAircraftEmptyWeight(aircraft.id, value)

    if (result.success) {
      toast.success('Empty weight updated')
      setIsEditingEmptyWeight(false)
    } else {
      toast.error(result.error || 'Failed to update empty weight')
    }

    setIsSavingEmptyWeight(false)
  }

  const handleCancelEmptyWeight = () => {
    setEmptyWeightValue(aircraft.empty_weight?.toString() || '')
    setIsEditingEmptyWeight(false)
  }

  const handleMassUnitChange = (newUnit: 'kg' | 'lbs') => {
    if (newUnit === aircraft.mass_unit) return

    setTargetMassUnit(newUnit)
    setConvertUnitDialogOpen(true)
  }

  const handleConvertUnitSuccess = () => {
    // Dialog will close and page will revalidate
    setConvertUnitDialogOpen(false)
  }

  const handleEditCgLimit = (limit: CgLimit) => {
    setEditingCgLimit(limit)
    setCgLimitDialogOpen(true)
  }

  const handleAddCgLimit = (type: 'forward' | 'aft') => {
    const limits = type === 'forward' ? forwardLimits : aftLimits
    const nextSortOrder = limits.length > 0 ? Math.max(...limits.map(l => l.sort_order)) + 1 : 0

    setEditingCgLimit({
      id: '',
      weight: 0,
      arm: 0,
      limit_type: type,
      sort_order: nextSortOrder,
      notes: null,
    } as CgLimit)
    setCgLimitDialogOpen(true)
  }

  const handleDeleteCgLimit = async (id: string) => {
    if (!confirm('Are you sure you want to delete this CG limit point?')) return

    const result = await deleteCgLimit(id)

    if (result.success) {
      toast.success('CG limit deleted')
    } else {
      toast.error(result.error || 'Failed to delete CG limit')
    }
  }

  const handleEditStation = (station: Station) => {
    setEditingStation(station)
    setStationDialogOpen(true)
  }

  const handleAddStation = () => {
    const nextSortOrder = stations.length > 0 ? Math.max(...stations.map(s => s.sort_order)) + 1 : 0

    setEditingStation({
      id: '',
      name: '',
      station_type: 'seat',
      arm: 0,
      weight_limit: 0,
      basic_weight: 0,
      sort_order: nextSortOrder,
      active: true,
      notes: null,
    } as Station)
    setStationDialogOpen(true)
  }

  const handleDeleteStation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this station?')) return

    const result = await deleteStation(id)

    if (result.success) {
      toast.success('Station deleted')
    } else {
      toast.error(result.error || 'Failed to delete station')
    }
  }

  const getStationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      seat: 'Seat',
      cargo: 'Cargo',
      fuel: 'Fuel',
      aircraft_item: 'Aircraft Item',
    }
    return labels[type] || type
  }

  const getStationTypeBadgeVariant = (type: string): 'default' | 'secondary' | 'outline' => {
    if (type === 'seat') return 'default'
    if (type === 'fuel') return 'secondary'
    return 'outline'
  }

  const currentUnit = (aircraft.mass_unit as 'kg' | 'lbs') || 'kg'

  return (
    <div className="space-y-6">
      {/* Mass Unit Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Mass Unit System</CardTitle>
          <CardDescription>
            Select the unit system for all mass measurements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-xs">
              <Label htmlFor="mass-unit">Current Unit</Label>
              <Select
                value={currentUnit}
                onValueChange={handleMassUnitChange}
                disabled={!canEdit}
              >
                <SelectTrigger id="mass-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">Kilograms (kg)</SelectItem>
                  <SelectItem value="lbs">Pounds (lbs)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {canEdit && (
              <p className="text-xs text-muted-foreground max-w-md">
                Changing the unit will convert all aircraft masses (MTOM, empty weight, CG limits, and station weights)
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Empty Weight Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Empty Aircraft Weight</CardTitle>
          <CardDescription>
            Empty weight of the aircraft (Basic Operating Weight / BOW)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isEditingEmptyWeight ? (
            <div className="flex items-end gap-2 max-w-md">
              <div className="flex-1">
                <Label htmlFor="empty-weight">Empty Weight ({currentUnit})</Label>
                <Input
                  id="empty-weight"
                  type="number"
                  step="0.01"
                  value={emptyWeightValue}
                  onChange={(e) => setEmptyWeightValue(e.target.value)}
                  placeholder="Enter empty weight"
                />
              </div>
              <Button
                size="sm"
                onClick={handleSaveEmptyWeight}
                disabled={isSavingEmptyWeight}
              >
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancelEmptyWeight}
                disabled={isSavingEmptyWeight}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Current Empty Weight</p>
                <p className="text-2xl font-bold">
                  {aircraft.empty_weight !== null ? `${aircraft.empty_weight} ${currentUnit}` : 'Not set'}
                </p>
              </div>
              {canEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditingEmptyWeight(true)}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Empty CG Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Empty Aircraft CG</CardTitle>
          <CardDescription>
            Center of gravity position for the empty aircraft (datum to CG arm)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isEditingEmptyCg ? (
            <div className="flex items-end gap-2 max-w-md">
              <div className="flex-1">
                <Label htmlFor="empty-cg">Empty CG (arm)</Label>
                <Input
                  id="empty-cg"
                  type="number"
                  step="0.01"
                  value={emptyCgValue}
                  onChange={(e) => setEmptyCgValue(e.target.value)}
                  placeholder="Enter empty CG arm"
                />
              </div>
              <Button
                size="sm"
                onClick={handleSaveEmptyCg}
                disabled={isSavingEmptyCg}
              >
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancelEmptyCg}
                disabled={isSavingEmptyCg}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Current Empty CG</p>
                <p className="text-2xl font-bold">
                  {aircraft.empty_cg !== null ? aircraft.empty_cg.toFixed(2) : 'Not set'}
                </p>
              </div>
              {canEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditingEmptyCg(true)}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CG Limits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Forward Limits */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Forward CG Limits</CardTitle>
                <CardDescription>Forward CG envelope boundary points</CardDescription>
              </div>
              {canEdit && (
                <Button size="sm" onClick={() => handleAddCgLimit('forward')}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {forwardLimits.length === 0 ? (
              <p className="text-sm text-muted-foreground">No forward limits defined</p>
            ) : (
              <div className="space-y-2">
                {forwardLimits.map((limit) => (
                  <div
                    key={limit.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-sm font-medium">
                            Weight: {limit.weight} {currentUnit}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Arm: {limit.arm.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      {limit.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{limit.notes}</p>
                      )}
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditCgLimit(limit)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteCgLimit(limit.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Aft Limits */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Aft CG Limits</CardTitle>
                <CardDescription>Aft CG envelope boundary points</CardDescription>
              </div>
              {canEdit && (
                <Button size="sm" onClick={() => handleAddCgLimit('aft')}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {aftLimits.length === 0 ? (
              <p className="text-sm text-muted-foreground">No aft limits defined</p>
            ) : (
              <div className="space-y-2">
                {aftLimits.map((limit) => (
                  <div
                    key={limit.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-sm font-medium">
                            Weight: {limit.weight} {currentUnit}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Arm: {limit.arm.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      {limit.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{limit.notes}</p>
                      )}
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditCgLimit(limit)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteCgLimit(limit.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Loading Stations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Loading Stations</CardTitle>
              <CardDescription>
                Weight and balance loading stations (seats, cargo, fuel, aircraft items)
              </CardDescription>
            </div>
            {canEdit && (
              <Button size="sm" onClick={handleAddStation}>
                <Plus className="h-4 w-4 mr-1" />
                Add Station
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {sortedStations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No loading stations defined</p>
          ) : (
            <div className="space-y-2">
              {sortedStations.map((station) => (
                <div
                  key={station.id}
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    !station.active ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-medium">{station.name}</p>
                      <Badge variant={getStationTypeBadgeVariant(station.station_type)}>
                        {getStationTypeLabel(station.station_type)}
                      </Badge>
                      {!station.active && <Badge variant="outline">Inactive</Badge>}
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Arm</p>
                        <p className="font-medium">{station.arm.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Weight Limit</p>
                        <p className="font-medium">{station.weight_limit} {currentUnit}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Basic Weight (BOW)</p>
                        <p className="font-medium">{station.basic_weight} {currentUnit}</p>
                      </div>
                    </div>
                    {station.notes && (
                      <p className="text-xs text-muted-foreground mt-2">{station.notes}</p>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1 ml-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditStation(station)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteStation(station.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CgLimitDialog
        open={cgLimitDialogOpen}
        onOpenChange={setCgLimitDialogOpen}
        cgLimit={editingCgLimit}
        planeId={aircraft.id}
        massUnit={currentUnit}
        onSuccess={() => {
          setCgLimitDialogOpen(false)
          setEditingCgLimit(null)
        }}
      />

      <StationDialog
        open={stationDialogOpen}
        onOpenChange={setStationDialogOpen}
        station={editingStation}
        planeId={aircraft.id}
        massUnit={currentUnit}
        onSuccess={() => {
          setStationDialogOpen(false)
          setEditingStation(null)
        }}
      />

      <ConvertMassUnitDialog
        open={convertUnitDialogOpen}
        onOpenChange={setConvertUnitDialogOpen}
        planeId={aircraft.id}
        currentUnit={currentUnit}
        targetUnit={targetMassUnit}
        hasMaxMass={aircraft.max_mass !== null}
        hasEmptyWeight={aircraft.empty_weight !== null}
        cgLimitsCount={cgLimits.length}
        stationsCount={stations.length}
        onSuccess={handleConvertUnitSuccess}
      />
    </div>
  )
}
