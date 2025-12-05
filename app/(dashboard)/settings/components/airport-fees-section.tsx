'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Edit, Trash2, Plane as PlaneIcon, ChevronDown, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import {
  getAirports,
  createAirport,
  updateAirport,
  deleteAirport,
  createAircraftAirportFee,
  updateAircraftAirportFee,
  deleteAircraftAirportFee,
  getPlanes,
} from '@/lib/actions/airport-fees'
import type { AirportWithAircraftFees, AircraftAirportFee, Plane } from '@/lib/types'

export function AirportFeesSection() {
  const [airports, setAirports] = useState<AirportWithAircraftFees[]>([])
  const [planes, setPlanes] = useState<Plane[]>([])
  const [loading, setLoading] = useState(true)
  const [airportDialogOpen, setAirportDialogOpen] = useState(false)
  const [feeDialogOpen, setFeeDialogOpen] = useState(false)
  const [editingAirport, setEditingAirport] = useState<AirportWithAircraftFees | null>(null)
  const [editingFee, setEditingFee] = useState<AircraftAirportFee | null>(null)
  const [selectedAirport, setSelectedAirport] = useState<AirportWithAircraftFees | null>(null)
  const [expandedAirports, setExpandedAirports] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)

  // Airport form state
  const [icaoCode, setIcaoCode] = useState('')
  const [airportName, setAirportName] = useState('')
  const [notes, setNotes] = useState('')

  // Fee form state
  const [selectedPlane, setSelectedPlane] = useState('')
  const [landingFee, setLandingFee] = useState('')
  const [approachFee, setApproachFee] = useState('')
  const [parkingFee, setParkingFee] = useState('')
  const [noiseFee, setNoiseFee] = useState('')
  const [passengerFee, setPassengerFee] = useState('')
  const [feeNotes, setFeeNotes] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const [airportsResult, planesResult] = await Promise.all([
      getAirports(),
      getPlanes()
    ])

    if (airportsResult.success && airportsResult.data) {
      setAirports(airportsResult.data)
    } else {
      toast.error(airportsResult.error || 'Failed to load airports')
    }

    if (planesResult.success && planesResult.data) {
      setPlanes(planesResult.data)
    } else {
      toast.error(planesResult.error || 'Failed to load aircraft')
    }

    setLoading(false)
  }

  const resetAirportForm = () => {
    setIcaoCode('')
    setAirportName('')
    setNotes('')
    setEditingAirport(null)
  }

  const resetFeeForm = () => {
    setSelectedPlane('')
    setLandingFee('')
    setApproachFee('')
    setParkingFee('')
    setNoiseFee('')
    setPassengerFee('')
    setFeeNotes('')
    setEditingFee(null)
  }

  const handleAddAirport = () => {
    resetAirportForm()
    setAirportDialogOpen(true)
  }

  const handleEditAirport = (airport: AirportWithAircraftFees) => {
    setEditingAirport(airport)
    setIcaoCode(airport.icao_code)
    setAirportName(airport.airport_name)
    setNotes(airport.notes || '')
    setAirportDialogOpen(true)
  }

  const handleSubmitAirport = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!icaoCode || icaoCode.length !== 4) {
      toast.error('ICAO code must be exactly 4 characters')
      return
    }

    if (!airportName) {
      toast.error('Airport name is required')
      return
    }

    setSubmitting(true)

    const data = {
      icao_code: icaoCode.toUpperCase(),
      airport_name: airportName,
      notes: notes || null,
    }

    const result = editingAirport
      ? await updateAirport(editingAirport.id, data)
      : await createAirport(data)

    setSubmitting(false)

    if (result.success) {
      toast.success(editingAirport ? 'Airport updated' : 'Airport added')
      setAirportDialogOpen(false)
      resetAirportForm()
      loadData()
    } else {
      toast.error(result.error || 'Failed to save airport')
    }
  }

  const handleDeleteAirport = async (airport: AirportWithAircraftFees) => {
    if (!confirm(`Delete airport ${airport.airport_name} (${airport.icao_code}) and all aircraft fee configurations?`)) {
      return
    }

    const result = await deleteAirport(airport.id)

    if (result.success) {
      toast.success('Airport deleted')
      loadData()
    } else {
      toast.error(result.error || 'Failed to delete airport')
    }
  }

  const getAvailablePlanes = (airport: AirportWithAircraftFees) => {
    const configuredPlaneIds = new Set(
      airport.aircraft_fees?.map((fee: any) => fee.plane_id) || []
    )
    return planes.filter(plane => !configuredPlaneIds.has(plane.id))
  }

  const handleAddFee = (airport: AirportWithAircraftFees) => {
    setSelectedAirport(airport)
    resetFeeForm()
    setFeeDialogOpen(true)
  }

  const handleEditFee = (airport: AirportWithAircraftFees, fee: any) => {
    setSelectedAirport(airport)
    setEditingFee(fee)
    setSelectedPlane(fee.plane_id)
    setLandingFee(fee.landing_fee.toString())
    setApproachFee(fee.approach_fee.toString())
    setParkingFee(fee.parking_fee.toString())
    setNoiseFee(fee.noise_fee.toString())
    setPassengerFee(fee.passenger_fee.toString())
    setFeeNotes(fee.notes || '')
    setFeeDialogOpen(true)
  }

  const handleSubmitFee = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedAirport) return

    if (!selectedPlane) {
      toast.error('Please select an aircraft')
      return
    }

    setSubmitting(true)

    const data = {
      airport_id: selectedAirport.id,
      plane_id: selectedPlane,
      landing_fee: parseFloat(landingFee) || 0,
      approach_fee: parseFloat(approachFee) || 0,
      parking_fee: parseFloat(parkingFee) || 0,
      noise_fee: parseFloat(noiseFee) || 0,
      passenger_fee: parseFloat(passengerFee) || 0,
      notes: feeNotes || null,
    }

    const result = editingFee
      ? await updateAircraftAirportFee(editingFee.id, data)
      : await createAircraftAirportFee(data)

    setSubmitting(false)

    if (result.success) {
      toast.success(editingFee ? 'Fee configuration updated' : 'Fee configuration added')
      setFeeDialogOpen(false)
      resetFeeForm()
      setSelectedAirport(null)
      loadData()
    } else {
      toast.error(result.error || 'Failed to save fee configuration')
    }
  }

  const handleDeleteFee = async (fee: any) => {
    if (!confirm(`Delete fee configuration for this aircraft?`)) {
      return
    }

    const result = await deleteAircraftAirportFee(fee.id)

    if (result.success) {
      toast.success('Fee configuration deleted')
      loadData()
    } else {
      toast.error(result.error || 'Failed to delete fee configuration')
    }
  }

  const toggleAirport = (airportId: string) => {
    const newExpanded = new Set(expandedAirports)
    if (newExpanded.has(airportId)) {
      newExpanded.delete(airportId)
    } else {
      newExpanded.add(airportId)
    }
    setExpandedAirports(newExpanded)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Airport Fees (Per Aircraft)</CardTitle>
              <CardDescription>
                Configure airports and aircraft-specific fees for automatic billing
              </CardDescription>
            </div>
            <Button onClick={handleAddAirport}>
              <Plus className="mr-2 h-4 w-4" />
              Add Airport
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading airports...
            </div>
          ) : airports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <PlaneIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No airports configured</p>
              <p className="text-sm">Add airports where the organization pays landing fees</p>
            </div>
          ) : (
            <div className="space-y-2">
              {airports.map((airport) => {
                const isExpanded = expandedAirports.has(airport.id)
                const totalAircraft = airport.aircraft_fees?.length || 0

                return (
                  <div key={airport.id} className="border rounded-lg">
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3 flex-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleAirport(airport.id)}
                          className="p-0 h-auto"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold">{airport.icao_code}</span>
                            <span className="font-medium">{airport.airport_name}</span>
                          </div>
                          {airport.notes && (
                            <div className="text-xs text-muted-foreground mt-1">{airport.notes}</div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            {totalAircraft}/{planes.length} aircraft configured
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddFee(airport)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Aircraft
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditAirport(airport)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAirport(airport)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {isExpanded && airport.aircraft_fees && airport.aircraft_fees.length > 0 && (
                      <div className="border-t px-4 pb-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Aircraft</TableHead>
                              <TableHead className="text-right">Landing</TableHead>
                              <TableHead className="text-right">Approach</TableHead>
                              <TableHead className="text-right">Parking</TableHead>
                              <TableHead className="text-right">Noise</TableHead>
                              <TableHead className="text-right">Per Pax</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {airport.aircraft_fees.map((fee: any) => (
                              <TableRow key={fee.id}>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">{fee.plane?.tail_number}</div>
                                    <div className="text-xs text-muted-foreground">{fee.plane?.type}</div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">€ {fee.landing_fee.toFixed(2)}</TableCell>
                                <TableCell className="text-right">€ {fee.approach_fee.toFixed(2)}</TableCell>
                                <TableCell className="text-right">€ {fee.parking_fee.toFixed(2)}</TableCell>
                                <TableCell className="text-right">€ {fee.noise_fee.toFixed(2)}</TableCell>
                                <TableCell className="text-right">€ {fee.passenger_fee.toFixed(2)}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex gap-1 justify-end">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditFee(airport, fee)}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteFee(fee)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Airport Dialog */}
      <Dialog open={airportDialogOpen} onOpenChange={setAirportDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingAirport ? 'Edit Airport' : 'Add Airport'}
            </DialogTitle>
            <DialogDescription>
              Configure basic airport information
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitAirport} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="icao-code">ICAO Code *</Label>
                <Input
                  id="icao-code"
                  value={icaoCode}
                  onChange={(e) => setIcaoCode(e.target.value.toUpperCase())}
                  placeholder="LSZH"
                  maxLength={4}
                  className="uppercase font-mono"
                  required
                  disabled={!!editingAirport}
                />
                <p className="text-xs text-muted-foreground">
                  4-letter ICAO airport code
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="airport-name">Airport Name *</Label>
                <Input
                  id="airport-name"
                  value={airportName}
                  onChange={(e) => setAirportName(e.target.value)}
                  placeholder="Zurich Airport"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional information about this airport..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAirportDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? editingAirport
                    ? 'Updating...'
                    : 'Adding...'
                  : editingAirport
                    ? 'Update'
                    : 'Add Airport'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Fee Configuration Dialog */}
      <Dialog open={feeDialogOpen} onOpenChange={setFeeDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingFee ? 'Edit Fee Configuration' : 'Add Fee Configuration'}
            </DialogTitle>
            <DialogDescription>
              Configure fees for a specific aircraft at {selectedAirport?.airport_name}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitFee} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="plane">Aircraft *</Label>
              <Select value={selectedPlane} onValueChange={setSelectedPlane} disabled={!!editingFee}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an aircraft" />
                </SelectTrigger>
                <SelectContent>
                  {(selectedAirport ? getAvailablePlanes(selectedAirport) : planes).map((plane) => (
                    <SelectItem key={plane.id} value={plane.id}>
                      {(plane.tail_number ?? "")} - {(plane.type ?? "")}
                      {plane.passenger_seats && plane.passenger_seats > 0 && ` (${plane.passenger_seats} pax)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="landing-fee">Landing Fee (€)</Label>
                <Input
                  id="landing-fee"
                  type="number"
                  step="0.01"
                  min="0"
                  value={landingFee}
                  onChange={(e) => setLandingFee(e.target.value)}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">Per landing</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="approach-fee">Approach Fee (€)</Label>
                <Input
                  id="approach-fee"
                  type="number"
                  step="0.01"
                  min="0"
                  value={approachFee}
                  onChange={(e) => setApproachFee(e.target.value)}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">Per approach</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="parking-fee">Parking Fee (€)</Label>
                <Input
                  id="parking-fee"
                  type="number"
                  step="0.01"
                  min="0"
                  value={parkingFee}
                  onChange={(e) => setParkingFee(e.target.value)}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">Per flight</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="noise-fee">Noise Fee (€)</Label>
                <Input
                  id="noise-fee"
                  type="number"
                  step="0.01"
                  min="0"
                  value={noiseFee}
                  onChange={(e) => setNoiseFee(e.target.value)}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">Per flight</p>
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="passenger-fee">Passenger Fee (€)</Label>
                <Input
                  id="passenger-fee"
                  type="number"
                  step="0.01"
                  min="0"
                  value={passengerFee}
                  onChange={(e) => setPassengerFee(e.target.value)}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">Per passenger</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fee-notes">Notes</Label>
              <Textarea
                id="fee-notes"
                value={feeNotes}
                onChange={(e) => setFeeNotes(e.target.value)}
                placeholder="Additional information..."
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFeeDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? editingFee
                    ? 'Updating...'
                    : 'Adding...'
                  : editingFee
                    ? 'Update Configuration'
                    : 'Add Configuration'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
