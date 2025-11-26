'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { createManualVoucher } from '@/lib/actions/vouchers'
import { createClient } from '@/lib/supabase/client'

export function CreateVoucherDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [voucherTypes, setVoucherTypes] = useState<any[]>([])
  const [formData, setFormData] = useState({
    voucherTypeId: '',
    purchaserName: '',
    purchaserEmail: '',
    purchaserPhone: '',
    pricePaid: '',
    validUntil: '',
    notes: '',
  })

  useEffect(() => {
    const loadVoucherTypes = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('voucher_types')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true })

      if (data) {
        setVoucherTypes(data)
      }
    }

    if (open) {
      loadVoucherTypes()
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (
      !formData.voucherTypeId ||
      !formData.purchaserName ||
      !formData.purchaserEmail ||
      !formData.pricePaid
    ) {
      toast.error('Please fill in all required fields')
      return
    }

    startTransition(async () => {
      const result = await createManualVoucher({
        voucherTypeId: formData.voucherTypeId,
        purchaserName: formData.purchaserName,
        purchaserEmail: formData.purchaserEmail,
        purchaserPhone: formData.purchaserPhone || undefined,
        pricePaid: parseFloat(formData.pricePaid),
        validUntil: formData.validUntil || undefined,
        notes: formData.notes || undefined,
      })

      if (result.success) {
        toast.success('Voucher created successfully', {
          description: `Code: ${result.data?.voucher_code}`,
        })
        setOpen(false)
        setFormData({
          voucherTypeId: '',
          purchaserName: '',
          purchaserEmail: '',
          purchaserPhone: '',
          pricePaid: '',
          validUntil: '',
          notes: '',
        })
        router.refresh()
      } else {
        toast.error('Failed to create voucher', {
          description: result.error,
        })
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Manual Voucher
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Manual Voucher</DialogTitle>
            <DialogDescription>
              Create a voucher manually (e.g., for offline sales or
              complimentary vouchers)
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="voucherTypeId">
                Voucher Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.voucherTypeId}
                onValueChange={(value) =>
                  setFormData({ ...formData, voucherTypeId: value })
                }
              >
                <SelectTrigger id="voucherTypeId">
                  <SelectValue placeholder="Select voucher type" />
                </SelectTrigger>
                <SelectContent>
                  {voucherTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name} - €{type.price_eur}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchaserName">
                  Purchaser Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="purchaserName"
                  value={formData.purchaserName}
                  onChange={(e) =>
                    setFormData({ ...formData, purchaserName: e.target.value })
                  }
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="purchaserEmail">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="purchaserEmail"
                  type="email"
                  value={formData.purchaserEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, purchaserEmail: e.target.value })
                  }
                  placeholder="john@example.com"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchaserPhone">Phone</Label>
                <Input
                  id="purchaserPhone"
                  value={formData.purchaserPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, purchaserPhone: e.target.value })
                  }
                  placeholder="+43 123 456789"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pricePaid">
                  Price Paid (EUR) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="pricePaid"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.pricePaid}
                  onChange={(e) =>
                    setFormData({ ...formData, pricePaid: e.target.value })
                  }
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="validUntil">Valid Until (Optional)</Label>
              <Input
                id="validUntil"
                type="date"
                value={formData.validUntil}
                onChange={(e) =>
                  setFormData({ ...formData, validUntil: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Any additional notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Creating...' : 'Create Voucher'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
