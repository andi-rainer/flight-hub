'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import type { VoucherType } from '@/lib/types'

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
      setVoucherTypes((data as unknown as VoucherType[]) || [])
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
      code_prefix: formData.code_prefix || 'TDM',
      name: formData.name,
      name_de: formData.name_de,
      description: formData.description || null,
      description_de: formData.description_de || null,
      price_eur: parseFloat(formData.price_eur),
      validity_months: formData.validity_months ? parseInt(formData.validity_months) : null,
      tandem_flight_type: formData.tandem_flight_type || null,
      active: formData.active,
      sort_order: formData.sort_order ? parseInt(formData.sort_order) : 0,
      features: formData.features || [],
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
                  <TableHead>Prefix</TableHead>
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
                      <Badge variant="secondary" className="font-mono">
                        {(type as any).code_prefix || 'TDM'}
                      </Badge>
                    </TableCell>
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
                      {type.validity_months ? `${type.validity_months} ${type.validity_months === 1 ? 'month' : 'months'}` : 'No expiry'}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={type.active ?? false}
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
    code_prefix: 'TDM',
    name: '',
    name_de: '',
    description: '',
    description_de: '',
    price_eur: '',
    validity_months: '',
    tandem_flight_type: '',
    active: true,
    sort_order: '0',
    features: [] as Array<{ text: string; text_de: string }>,
  })

  useEffect(() => {
    if (voucherType) {
      setFormData({
        code: voucherType.code,
        code_prefix: (voucherType as any).code_prefix || 'TDM',
        name: voucherType.name,
        name_de: voucherType.name_de || '',
        description: voucherType.description || '',
        description_de: voucherType.description_de || '',
        price_eur: voucherType.price_eur.toString(),
        validity_months: voucherType.validity_months?.toString() || '',
        tandem_flight_type: voucherType.tandem_flight_type || '',
        active: voucherType.active ?? false,
        sort_order: voucherType.sort_order?.toString() ?? "",
        features: (voucherType.features as any) || [],
      })
    } else {
      // Reset form for new voucher type
      setFormData({
        code: '',
        code_prefix: 'TDM',
        name: '',
        name_de: '',
        description: '',
        description_de: '',
        price_eur: '',
        validity_months: '',
        tandem_flight_type: '',
        active: true,
        sort_order: '0',
        features: [],
      })
    }
  }, [voucherType])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const addFeature = () => {
    setFormData({
      ...formData,
      features: [...formData.features, { text: '', text_de: '' }],
    })
  }

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index),
    })
  }

  const updateFeature = (index: number, field: 'text' | 'text_de', value: string) => {
    const updated = [...formData.features]
    updated[index] = { ...updated[index], [field]: value }
    setFormData({ ...formData, features: updated })
  }

  const content = (
    <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
      <DialogHeader>
        <DialogTitle>{voucherType ? 'Edit' : 'Create'} Voucher Type</DialogTitle>
        <DialogDescription>
          Configure a tandem jump voucher type for the online store
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4 overflow-y-auto flex-1 px-1">
        <div className="grid grid-cols-3 gap-4">
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
            <Label htmlFor="code_prefix">Voucher Code Prefix *</Label>
            <Input
              id="code_prefix"
              value={formData.code_prefix}
              onChange={(e) => setFormData({ ...formData, code_prefix: e.target.value.toUpperCase() })}
              placeholder="TDM"
              maxLength={10}
              pattern="[A-Z0-9]{2,10}"
              title="2-10 uppercase letters or numbers"
              required
            />
            <p className="text-xs text-muted-foreground">e.g. TDM, TV, TS (2-10 chars)</p>
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

        <div className="space-y-2 pt-4 border-t">
          <div className="mb-2">
            <Label className="text-base font-semibold">Voucher Description</Label>
            <p className="text-xs text-muted-foreground">Text displayed on the voucher card below the title</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description (English)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Experience the thrill of freefalling..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description_de">Description (German)</Label>
              <Textarea
                id="description_de"
                value={formData.description_de}
                onChange={(e) => setFormData({ ...formData, description_de: e.target.value })}
                placeholder="Erlebe den Nervenkitzel..."
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="validity_months">Validity (months)</Label>
            <Input
              id="validity_months"
              type="number"
              value={formData.validity_months}
              onChange={(e) => setFormData({ ...formData, validity_months: e.target.value })}
              placeholder="12"
            />
            <p className="text-xs text-muted-foreground">
              Expiry is set to last day of month
            </p>
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

        <div className="space-y-4 pt-4 border-t">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <Label className="text-base font-semibold">Voucher Features</Label>
                <p className="text-xs text-muted-foreground">Custom bullet points displayed on this voucher (optional)</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addFeature}>
                <Plus className="h-4 w-4 mr-1" />
                Add Feature
              </Button>
            </div>
          </div>
          {formData.features.map((feature, index) => (
            <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <Input
                placeholder="English feature"
                value={feature.text}
                onChange={(e) => updateFeature(index, 'text', e.target.value)}
              />
              <Input
                placeholder="German feature"
                value={feature.text_de}
                onChange={(e) => updateFeature(index, 'text_de', e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeFeature(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {formData.features.length === 0 && (
            <p className="text-sm text-muted-foreground">No custom features added</p>
          )}
        </div>
      </div>

      <DialogFooter className="flex-shrink-0">
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
