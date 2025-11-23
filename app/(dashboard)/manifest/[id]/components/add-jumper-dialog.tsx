'use client'

import { useState, ReactNode, useEffect } from 'react'
import { UserPlus, Users } from 'lucide-react'
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
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { PersonSelector } from '@/components/person-selector'
import { toast } from 'sonner'
import { addSportJumper, addTandemPair } from '@/lib/actions/manifest'
import { useRouter } from 'next/navigation'

interface AddJumperDialogProps {
  flight: any
  operationDay: any
  availableSlots: number
  trigger?: ReactNode
}

type JumperType = 'sport' | 'tandem'
type PaymentType = 'cash' | 'voucher' | 'pending'

export function AddJumperDialog({
  flight,
  operationDay,
  availableSlots,
  trigger,
}: AddJumperDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [jumperType, setJumperType] = useState<JumperType>('sport')
  const [showAllPassengers, setShowAllPassengers] = useState(false)

  // Calculate occupied slots accounting for multi-slot jumpers (tandem pairs take 2 slots)
  const occupiedSlots = new Set<number>()
  ;(flight.jumpers || []).forEach((j: any) => {
    const slotsOccupied = j.slots_occupied || 1
    for (let i = 0; i < slotsOccupied; i++) {
      occupiedSlots.add(j.slot_number + i)
    }
  })

  const maxSlot = operationDay.plane.max_jumpers || 10

  // Find next available slot for sport jumper (1 slot needed)
  const nextSportSlot = Array.from({ length: maxSlot }, (_, i) => i + 1).find(
    (slot) => !occupiedSlots.has(slot)
  ) || 1

  // Find next available consecutive 2 slots for tandem pair
  const findConsecutiveSlots = (needed: number): number | null => {
    for (let start = 1; start <= maxSlot - needed + 1; start++) {
      let foundConsecutive = true
      for (let i = 0; i < needed; i++) {
        if (occupiedSlots.has(start + i)) {
          foundConsecutive = false
          break
        }
      }
      if (foundConsecutive) return start
    }
    return null
  }

  const nextTandemSlot = findConsecutiveSlots(2)

  const [formData, setFormData] = useState({
    jumperType: 'sport' as JumperType,
    slotNumber: nextSportSlot,

    // Sport jumper fields
    sportJumperId: null as string | null,

    // Tandem pair fields
    tandemMasterId: null as string | null,
    passengerId: null as string | null,
    paymentType: 'pending' as PaymentType,
    voucherNumber: '',
    paymentAmount: '',

    // Common fields
    notes: '',
  })

  // Reset slot when dialog opens or jumper type changes
  useEffect(() => {
    if (open) {
      const appropriateSlot = formData.jumperType === 'tandem' ? nextTandemSlot : nextSportSlot
      setFormData(prev => ({ ...prev, slotNumber: appropriateSlot || 1 }))
    }
  }, [open, formData.jumperType, nextSportSlot, nextTandemSlot])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      let result

      if (formData.jumperType === 'sport') {
        if (!formData.sportJumperId) {
          toast.error('Please select a sport jumper')
          setIsSubmitting(false)
          return
        }

        result = await addSportJumper({
          flight_id: flight.id,
          sport_jumper_id: formData.sportJumperId,
          slot_number: formData.slotNumber,
          notes: formData.notes || undefined,
        })
      } else {
        // Tandem - requires 2 consecutive slots
        if (!formData.tandemMasterId || !formData.passengerId) {
          toast.error('Please select both tandem master and passenger')
          setIsSubmitting(false)
          return
        }

        // Validate 2 consecutive slots are available
        const slot1 = formData.slotNumber
        const slot2 = formData.slotNumber + 1
        if (occupiedSlots.has(slot1) || occupiedSlots.has(slot2)) {
          toast.error(`Slots ${slot1} and ${slot2} must both be available for a tandem pair`)
          setIsSubmitting(false)
          return
        }

        if (slot2 > maxSlot) {
          toast.error(`Not enough slots available. Tandem pairs need 2 consecutive slots.`)
          setIsSubmitting(false)
          return
        }

        // TODO: Validate voucher number against vouchers table when implemented
        if (formData.paymentType === 'voucher' && !formData.voucherNumber) {
          toast.error('Please enter voucher number')
          setIsSubmitting(false)
          return
        }

        result = await addTandemPair({
          flight_id: flight.id,
          tandem_master_id: formData.tandemMasterId,
          passenger_id: formData.passengerId,
          slot_number: formData.slotNumber,
          payment_type: formData.paymentType,
          voucher_number: formData.voucherNumber || undefined,
          payment_amount: formData.paymentAmount ? parseFloat(formData.paymentAmount) : undefined,
          notes: formData.notes || undefined,
        })
      }

      if (result.success) {
        toast.success(`${formData.jumperType === 'sport' ? 'Sport jumper' : 'Tandem pair'} added successfully`)
        setOpen(false)
        // Reset form
        setFormData({
          jumperType: 'sport',
          slotNumber: nextSportSlot,
          sportJumperId: null,
          tandemMasterId: null,
          passengerId: null,
          paymentType: 'pending',
          voucherNumber: '',
          paymentAmount: '',
          notes: '',
        })
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to add jumper')
      }
    } catch (error) {
      console.error('Error adding jumper:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <UserPlus className="mr-2 h-4 w-4" />
            Add Jumper
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Assign Jumper to Flight</DialogTitle>
            <DialogDescription>
              Add a sport jumper or tandem pair to Load #{flight.flight_number}.
              {availableSlots} {availableSlots === 1 ? 'slot' : 'slots'} available.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Jumper Type Selection */}
            <div className="grid gap-2">
              <Label>Jumper Type</Label>
              <Select
                value={formData.jumperType}
                onValueChange={(value: JumperType) => {
                  setFormData({ ...formData, jumperType: value })
                  setJumperType(value)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sport">Sport Jumper</SelectItem>
                  <SelectItem value="tandem">Tandem Pair</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Slot Number */}
            <div className="grid gap-2">
              <Label htmlFor="slotNumber">Slot Number</Label>
              <Input
                id="slotNumber"
                type="number"
                min="1"
                max={operationDay.plane.max_jumpers || 10}
                value={formData.slotNumber}
                onChange={(e) =>
                  setFormData({ ...formData, slotNumber: parseInt(e.target.value) || 1 })
                }
                required
              />
            </div>

            {/* Sport Jumper Fields */}
            {formData.jumperType === 'sport' && (
              <div className="grid gap-2">
                <PersonSelector
                  context="sport_jumper"
                  value={formData.sportJumperId}
                  onChange={(userId) => setFormData({ ...formData, sportJumperId: userId })}
                  label="Sport Jumper"
                  placeholder="Select sport jumper..."
                  required
                />
              </div>
            )}

            {/* Tandem Pair Fields */}
            {formData.jumperType === 'tandem' && (
              <>
                <div className="grid gap-2">
                  <PersonSelector
                    context="tandem_master"
                    value={formData.tandemMasterId}
                    onChange={(userId) => setFormData({ ...formData, tandemMasterId: userId })}
                    label="Tandem Master"
                    placeholder="Select tandem master..."
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between mb-1">
                    <Label>Tandem Passenger</Label>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="showAllPassengers"
                        checked={showAllPassengers}
                        onCheckedChange={(checked) => setShowAllPassengers(checked as boolean)}
                      />
                      <label
                        htmlFor="showAllPassengers"
                        className="text-sm text-muted-foreground cursor-pointer"
                      >
                        Show all users
                      </label>
                    </div>
                  </div>
                  <PersonSelector
                    context={showAllPassengers ? 'all_users' : 'tandem_passenger'}
                    value={formData.passengerId}
                    onChange={(userId) => setFormData({ ...formData, passengerId: userId })}
                    placeholder="Select passenger..."
                    required
                    showTodayFilter={!showAllPassengers}
                  />
                  {!showAllPassengers && (
                    <p className="text-xs text-muted-foreground">
                      Showing short-term members who haven't completed their tandem jump yet
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="paymentType">Payment Type</Label>
                  <Select
                    value={formData.paymentType}
                    onValueChange={(value: PaymentType) =>
                      setFormData({ ...formData, paymentType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="voucher">Voucher</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.paymentType === 'voucher' && (
                  <div className="grid gap-2">
                    <Label htmlFor="voucherNumber">Voucher Number</Label>
                    <Input
                      id="voucherNumber"
                      value={formData.voucherNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, voucherNumber: e.target.value })
                      }
                      placeholder="Enter voucher code"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      TODO: Voucher validation will be implemented
                    </p>
                  </div>
                )}

                {formData.paymentType !== 'pending' && (
                  <div className="grid gap-2">
                    <Label htmlFor="paymentAmount">Amount (EUR)</Label>
                    <Input
                      id="paymentAmount"
                      type="number"
                      step="0.01"
                      value={formData.paymentAmount}
                      onChange={(e) =>
                        setFormData({ ...formData, paymentAmount: e.target.value })
                      }
                      placeholder="e.g., 250.00"
                    />
                  </div>
                )}
              </>
            )}

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Special instructions or notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : `Add ${formData.jumperType === 'sport' ? 'Jumper' : 'Tandem Pair'}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
