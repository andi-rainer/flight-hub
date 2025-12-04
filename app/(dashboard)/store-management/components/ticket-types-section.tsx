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

interface TicketType {
  id: string
  code: string
  code_prefix: string
  name: string
  name_de: string | null
  description: string | null
  description_de: string | null
  price_eur: number
  features: Array<{ text: string; text_de: string }>
  active: boolean
  sort_order: number
}

export function TicketTypesSection() {
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingType, setEditingType] = useState<TicketType | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const loadTicketTypes = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('ticket_types')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error loading ticket types:', error)
      toast.error('Failed to load ticket types')
    } else {
      setTicketTypes(data || [])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadTicketTypes()
  }, [])

  const handleSave = async (formData: any) => {
    const supabase = createClient()

    const payload = {
      code: formData.code,
      code_prefix: formData.code_prefix || 'TKT',
      name: formData.name,
      name_de: formData.name_de,
      description: formData.description || null,
      description_de: formData.description_de || null,
      price_eur: parseFloat(formData.price_eur),
      active: formData.active,
      sort_order: formData.sort_order ? parseInt(formData.sort_order) : 0,
      features: formData.features || [],
    }

    let error
    if (editingType) {
      // Update existing
      const result = await supabase
        .from('ticket_types')
        .update(payload)
        .eq('id', editingType.id)
      error = result.error
    } else {
      // Create new
      const result = await supabase
        .from('ticket_types')
        .insert(payload)
      error = result.error
    }

    if (error) {
      toast.error('Failed to save ticket type')
      console.error(error)
    } else {
      toast.success(editingType ? 'Ticket type updated' : 'Ticket type created')
      setIsDialogOpen(false)
      setEditingType(null)
      loadTicketTypes()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ticket type?')) return

    const supabase = createClient()
    const { error } = await supabase
      .from('ticket_types')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Failed to delete ticket type')
      console.error(error)
    } else {
      toast.success('Ticket type deleted')
      loadTicketTypes()
    }
  }

  const handleToggleActive = async (type: TicketType) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('ticket_types')
      .update({ active: !type.active })
      .eq('id', type.id)

    if (error) {
      toast.error('Failed to update status')
      console.error(error)
    } else {
      toast.success(type.active ? 'Deactivated' : 'Activated')
      loadTicketTypes()
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Ticket Types</CardTitle>
            <CardDescription>
              Manage direct booking options with different prices and features (e.g., with/without video)
            </CardDescription>
          </div>
          <TicketTypeDialog
            onSave={handleSave}
            trigger={
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Ticket Type
              </Button>
            }
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : ticketTypes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No ticket types defined yet
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
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ticketTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell className="font-mono">{type.code}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono">
                        {type.code_prefix}
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
        <TicketTypeDialog
          ticketType={editingType}
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

interface TicketTypeDialogProps {
  ticketType?: TicketType | null
  onSave: (data: any) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
}

function TicketTypeDialog({
  ticketType,
  onSave,
  open,
  onOpenChange,
  trigger,
}: TicketTypeDialogProps) {
  const [formData, setFormData] = useState({
    code: '',
    code_prefix: 'TKT',
    name: '',
    name_de: '',
    description: '',
    description_de: '',
    price_eur: '',
    active: true,
    sort_order: '0',
    features: [] as Array<{ text: string; text_de: string }>,
  })

  useEffect(() => {
    if (ticketType) {
      setFormData({
        code: ticketType.code,
        code_prefix: ticketType.code_prefix || 'TKT',
        name: ticketType.name,
        name_de: ticketType.name_de || '',
        description: ticketType.description || '',
        description_de: ticketType.description_de || '',
        price_eur: ticketType.price_eur.toString(),
        active: ticketType.active,
        sort_order: ticketType.sort_order.toString(),
        features: ticketType.features || [],
      })
    } else {
      // Reset form for new ticket type
      setFormData({
        code: '',
        code_prefix: 'TKT',
        name: '',
        name_de: '',
        description: '',
        description_de: '',
        price_eur: '',
        active: true,
        sort_order: '0',
        features: [],
      })
    }
  }, [ticketType])

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
        <DialogTitle>{ticketType ? 'Edit' : 'Create'} Ticket Type</DialogTitle>
        <DialogDescription>
          Configure a booking option with specific price and features
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
              placeholder="TANDEM_VIDEO"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="code_prefix">Booking Code Prefix *</Label>
            <Input
              id="code_prefix"
              value={formData.code_prefix}
              onChange={(e) => setFormData({ ...formData, code_prefix: e.target.value.toUpperCase() })}
              placeholder="TKT"
              maxLength={10}
              pattern="[A-Z0-9]{2,10}"
              title="2-10 uppercase letters or numbers"
              required
            />
            <p className="text-xs text-muted-foreground">e.g. TKT, TV, TP (2-10 chars)</p>
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
            placeholder="Tandem Jump - With Video"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="name_de">Name (German)</Label>
          <Input
            id="name_de"
            value={formData.name_de}
            onChange={(e) => setFormData({ ...formData, name_de: e.target.value })}
            placeholder="Tandemsprung - Mit Video"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (English)</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Detailed description..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description_de">Description (German)</Label>
          <Textarea
            id="description_de"
            value={formData.description_de}
            onChange={(e) => setFormData({ ...formData, description_de: e.target.value })}
            placeholder="Detaillierte Beschreibung..."
            rows={3}
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

        <div className="flex items-center space-x-2">
          <Switch
            id="active"
            checked={formData.active}
            onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
          />
          <Label htmlFor="active">Active</Label>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Features/Inclusions</Label>
            <Button type="button" variant="outline" size="sm" onClick={addFeature}>
              <Plus className="h-4 w-4 mr-2" />
              Add Feature
            </Button>
          </div>
          {formData.features.map((feature, index) => (
            <div key={index} className="grid grid-cols-2 gap-2 items-end">
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
        <Button type="submit">{ticketType ? 'Update' : 'Create'}</Button>
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
