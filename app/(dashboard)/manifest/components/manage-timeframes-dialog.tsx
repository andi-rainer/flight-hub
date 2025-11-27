'use client'

import { useState, useEffect } from 'react'
import { Clock, Plus, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import {
  getOperationDayTimeframes,
  createBookingTimeframe,
  updateBookingTimeframe,
  deleteBookingTimeframe,
} from '@/lib/actions/manifest'

interface Timeframe {
  id: string
  start_time: string
  end_time: string
  max_bookings: number | null
  overbooking_allowed: number | null
  current_bookings: number | null
  active: boolean | null
}

interface ManageTimeframesDialogProps {
  operationDayId: string
  operationDate: string
}

export function ManageTimeframesDialog({
  operationDayId,
  operationDate,
}: ManageTimeframesDialogProps) {
  const [open, setOpen] = useState(false)
  const [timeframes, setTimeframes] = useState<Timeframe[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  const [formData, setFormData] = useState({
    start_time: '',
    end_time: '',
    max_bookings: 4,
    overbooking_allowed: 0,
  })

  const loadTimeframes = async () => {
    setIsLoading(true)
    const result = await getOperationDayTimeframes(operationDayId)
    if (result.success && result.data) {
      setTimeframes(result.data)
    } else {
      toast.error('Failed to load timeframes')
    }
    setIsLoading(false)
  }

  useEffect(() => {
    if (open) {
      loadTimeframes()
    }
  }, [open, operationDayId])

  const handleSubmit = async () => {
    if (!formData.start_time || !formData.end_time) {
      toast.error('Please fill in all required fields')
      return
    }

    if (formData.start_time >= formData.end_time) {
      toast.error('End time must be after start time')
      return
    }

    if (editingId) {
      const result = await updateBookingTimeframe(editingId, formData)
      if (result.success) {
        toast.success('Timeframe updated')
        setEditingId(null)
        setShowAddForm(false)
        resetForm()
        loadTimeframes()
      } else {
        toast.error(result.error || 'Failed to update timeframe')
      }
    } else {
      const result = await createBookingTimeframe({
        operation_day_id: operationDayId,
        ...formData,
      })
      if (result.success) {
        toast.success('Timeframe created')
        setShowAddForm(false)
        resetForm()
        loadTimeframes()
      } else {
        toast.error(result.error || 'Failed to create timeframe')
      }
    }
  }

  const handleEdit = (timeframe: Timeframe) => {
    setFormData({
      start_time: timeframe.start_time,
      end_time: timeframe.end_time,
      max_bookings: timeframe.max_bookings ?? 4,
      overbooking_allowed: timeframe.overbooking_allowed ?? 0,
    })
    setEditingId(timeframe.id)
    setShowAddForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this timeframe?')) return

    const result = await deleteBookingTimeframe(id)
    if (result.success) {
      toast.success('Timeframe deleted')
      loadTimeframes()
    } else {
      toast.error(result.error || 'Failed to delete timeframe')
    }
  }

  const handleToggleActive = async (timeframe: Timeframe) => {
    const currentActive = timeframe.active ?? false
    const result = await updateBookingTimeframe(timeframe.id, {
      active: !currentActive,
    })
    if (result.success) {
      toast.success(currentActive ? 'Timeframe disabled' : 'Timeframe enabled')
      loadTimeframes()
    } else {
      toast.error('Failed to update timeframe')
    }
  }

  const resetForm = () => {
    setFormData({
      start_time: '',
      end_time: '',
      max_bookings: 4,
      overbooking_allowed: 0,
    })
    setEditingId(null)
  }

  const cancelEdit = () => {
    setShowAddForm(false)
    resetForm()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Clock className="h-4 w-4 mr-2" />
          Booking Slots
        </Button>
      </DialogTrigger>
      <DialogContent className="!w-[95vw] !max-w-[1400px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Booking Timeframes</DialogTitle>
          <DialogDescription>
            Configure time slots for customer bookings on {new Date(operationDate).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Timeframes List */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : timeframes.length === 0 && !showAddForm ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">No booking timeframes defined yet</p>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Timeframe
              </Button>
            </div>
          ) : (
            <>
              {timeframes.length > 0 && (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time Range</TableHead>
                        <TableHead>Max Bookings</TableHead>
                        <TableHead>Overbooking</TableHead>
                        <TableHead>Current</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {timeframes.map((timeframe) => (
                        <TableRow key={timeframe.id}>
                          <TableCell className="font-medium">
                            {timeframe.start_time} - {timeframe.end_time}
                          </TableCell>
                          <TableCell>{timeframe.max_bookings ?? 0}</TableCell>
                          <TableCell>+{timeframe.overbooking_allowed ?? 0}</TableCell>
                          <TableCell>
                            <span className={(timeframe.current_bookings ?? 0) >= (timeframe.max_bookings ?? 0) ? 'text-orange-600 font-medium' : ''}>
                              {timeframe.current_bookings ?? 0}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={timeframe.active ?? false}
                              onCheckedChange={() => handleToggleActive(timeframe)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(timeframe)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(timeframe.id)}
                                disabled={(timeframe.current_bookings ?? 0) > 0}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {!showAddForm && (
                <Button onClick={() => setShowAddForm(true)} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Timeframe
                </Button>
              )}

              {/* Add/Edit Form */}
              {showAddForm && (
                <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
                  <h4 className="font-semibold">
                    {editingId ? 'Edit Timeframe' : 'Add New Timeframe'}
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_time">Start Time *</Label>
                      <Input
                        id="start_time"
                        type="time"
                        value={formData.start_time}
                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="end_time">End Time *</Label>
                      <Input
                        id="end_time"
                        type="time"
                        value={formData.end_time}
                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max_bookings">Max Bookings *</Label>
                      <Input
                        id="max_bookings"
                        type="number"
                        min="1"
                        value={formData.max_bookings}
                        onChange={(e) =>
                          setFormData({ ...formData, max_bookings: parseInt(e.target.value) || 1 })
                        }
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Number of tandem slots available
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="overbooking_allowed">Overbooking Slots</Label>
                      <Input
                        id="overbooking_allowed"
                        type="number"
                        min="0"
                        value={formData.overbooking_allowed}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            overbooking_allowed: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Additional bookings beyond max
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={cancelEdit}>
                      Cancel
                    </Button>
                    <Button onClick={handleSubmit}>
                      {editingId ? 'Update' : 'Create'} Timeframe
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
