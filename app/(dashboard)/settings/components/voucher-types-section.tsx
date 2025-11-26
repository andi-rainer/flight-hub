'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { VoucherType } from '@/lib/database.types'

export function VoucherTypesSection() {
  const [voucherTypes, setVoucherTypes] = useState<VoucherType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingType, setEditingType] = useState<VoucherType | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const loadVoucherTypes = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('voucher_types')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error loading voucher types:', error)
      toast.error('Failed to load voucher types')
    } else {
      setVoucherTypes(data || [])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadVoucherTypes()
  }, [])

  const handleSave = async (formData: any) => {
    const supabase = createClient()

    const payload = {
      code: formData.code,
      name: formData.name,
      name_de: formData.name_de,
      description: formData.description || null,
      description_de: formData.description_de || null,
      price_eur: parseFloat(formData.price_eur),
      validity_days: formData.validity_days ? parseInt(formData.validity_days) : null,
      tandem_flight_type: formData.tandem_flight_type || null,
      active: formData.active,
      sort_order: formData.sort_order ? parseInt(formData.sort_order) : 0,
    }

    let error
    if (editingType) {
      // Update existing
      const result = await supabase
        .from('voucher_types')
        .update(payload)
        .eq('id', editingType.id)
      error = result.error
    } else {
      // Create new
      const result = await supabase
        .from('voucher_types')
        .insert(payload)
      error = result.error
    }

    if (error) {
      toast.error('Failed to save voucher type')
      console.error(error)
    } else {
      toast.success(editingType ? 'Voucher type updated' : 'Voucher type created')
      setIsDialogOpen(false)
      setEditingType(null)
      loadVoucherTypes()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this voucher type?')) return

    const supabase = createClient()
    const { error } = await supabase
      .from('voucher_types')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Failed to delete voucher type')
      console.error(error)
    } else {
      toast.success('Voucher type deleted')
      loadVoucherTypes()
    }
  }

  const handleToggleActive = async (type: VoucherType) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('voucher_types')
      .update({ active: !type.active })
      .eq('id', type.id)

    if (error) {
      toast.error('Failed to update status')
      console.error(error)
    } else {
      toast.success(type.active ? 'Deactivated' : 'Activated')
      loadVoucherTypes()
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Voucher Types</CardTitle>
            <CardDescription>
              Manage tandem jump voucher types available for purchase
            </CardDescription>
          </div>
          <VoucherTypeDialog
            onSave={handleSave}
            trigger={
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Voucher Type
              </Button>
            }
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : voucherTypes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No voucher types defined yet
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Validity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {voucherTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell className="font-mono">{type.code}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{type.name}</div>
                        {type.name_de && (
                          <div className="text-sm text-muted-foreground">{type.name_de}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>€{type.price_eur}</TableCell>
                    <TableCell>
                      {type.validity_days ? `${type.validity_days} days` : 'No expiry'}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={type.active}
                        onCheckedChange={() => handleToggleActive(type)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingType(type)
                            setIsDialogOpen(true)
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(type.id)}
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
      </CardContent>

      {isDialogOpen && (
        <VoucherTypeDialog
          voucherType={editingType}
          onSave={handleSave}
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) setEditingType(null)
          }}
        />
      )}
    </Card>
  )
}

interface VoucherTypeDialogProps {
  voucherType?: VoucherType | null
  onSave: (data: any) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
}

function VoucherTypeDialog({
  voucherType,
  onSave,
  open,
  onOpenChange,
  trigger,
}: VoucherTypeDialogProps) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    name_de: '',
    description: '',
    description_de: '',
    price_eur: '',
    validity_days: '',
    tandem_flight_type: '',
    active: true,
    sort_order: '0',
  })

  useEffect(() => {
    if (voucherType) {
      setFormData({
        code: voucherType.code,
        name: voucherType.name,
        name_de: voucherType.name_de || '',
        description: voucherType.description || '',
        description_de: voucherType.description_de || '',
        price_eur: voucherType.price_eur.toString(),
        validity_days: voucherType.validity_days?.toString() || '',
        tandem_flight_type: voucherType.tandem_flight_type || '',
        active: voucherType.active,
        sort_order: voucherType.sort_order.toString(),
      })
    }
  }, [voucherType])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const content = (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{voucherType ? 'Edit' : 'Create'} Voucher Type</DialogTitle>
        <DialogDescription>
          Configure a tandem jump voucher type for the online store
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="code">Code *</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="TANDEM_4000M"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price_eur">Price (EUR) *</Label>
            <Input
              id="price_eur"
              type="number"
              step="0.01"
              value={formData.price_eur}
              onChange={(e) => setFormData({ ...formData, price_eur: e.target.value })}
              placeholder="250.00"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Name (English) *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Tandem Jump 4000m"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="name_de">Name (German)</Label>
          <Input
            id="name_de"
            value={formData.name_de}
            onChange={(e) => setFormData({ ...formData, name_de: e.target.value })}
            placeholder="Tandemsprung 4000m"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="validity_days">Validity (days)</Label>
            <Input
              id="validity_days"
              type="number"
              value={formData.validity_days}
              onChange={(e) => setFormData({ ...formData, validity_days: e.target.value })}
              placeholder="365"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sort_order">Sort Order</Label>
            <Input
              id="sort_order"
              type="number"
              value={formData.sort_order}
              onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
              placeholder="0"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="active"
            checked={formData.active}
            onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
          />
          <Label htmlFor="active">Active</Label>
        </div>
      </div>

      <DialogFooter>
        <Button type="submit">{voucherType ? 'Update' : 'Create'}</Button>
      </DialogFooter>
    </form>
  )

  if (trigger) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-w-2xl">{content}</DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">{content}</DialogContent>
    </Dialog>
  )
}
