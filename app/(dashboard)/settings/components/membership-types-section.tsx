'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import {
  createMembershipType,
  updateMembershipType,
  deleteMembershipType,
  getMembershipTypes,
} from '@/lib/actions/memberships'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import type { MembershipType } from '@/lib/database.types'

export function MembershipTypesSection() {
  const router = useRouter()
  const [membershipTypes, setMembershipTypes] = useState<MembershipType[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingType, setEditingType] = useState<MembershipType | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration_value: '30',
    duration_unit: 'days' as 'days' | 'months' | 'years',
    price: '0',
    currency: 'EUR',
    auto_renew: false,
    member_category: 'regular' as 'regular' | 'short-term',
    member_number_prefix: 'M',
    active: true,
  })

  useEffect(() => {
    loadMembershipTypes()
  }, [])

  const loadMembershipTypes = async () => {
    setLoading(true)
    const result = await getMembershipTypes()
    if (result.success) {
      setMembershipTypes(result.data)
    } else {
      toast.error('Failed to load membership types')
    }
    setLoading(false)
  }

  const handleOpenDialog = (type?: MembershipType) => {
    if (type) {
      setEditingType(type)
      setFormData({
        name: type.name,
        description: type.description || '',
        duration_value: type.duration_value.toString(),
        duration_unit: type.duration_unit as 'days' | 'months' | 'years',
        price: type.price?.toString() || '0',
        currency: type.currency || 'EUR',
        auto_renew: type.auto_renew || false,
        member_category: (type.member_category as 'regular' | 'short-term') || 'regular',
        member_number_prefix: type.member_number_prefix,
        active: type.active ?? true,
      })
    } else {
      setEditingType(null)
      setFormData({
        name: '',
        description: '',
        duration_value: '30',
        duration_unit: 'days',
        price: '0',
        currency: 'EUR',
        auto_renew: false,
        member_category: 'regular',
        member_number_prefix: 'M',
        active: true,
      })
    }
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const data = {
      name: formData.name,
      description: formData.description || null,
      duration_value: parseInt(formData.duration_value, 10),
      duration_unit: formData.duration_unit,
      price: parseFloat(formData.price),
      currency: formData.currency,
      auto_renew: formData.auto_renew,
      member_category: formData.member_category,
      member_number_prefix: formData.member_number_prefix,
      active: formData.active,
    }

    let result
    if (editingType) {
      result = await updateMembershipType(editingType.id, data)
    } else {
      result = await createMembershipType(data)
    }

    if (result.success) {
      toast.success(`Membership type ${editingType ? 'updated' : 'created'} successfully`)
      setDialogOpen(false)
      await loadMembershipTypes()
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to save membership type')
    }

    setIsSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this membership type? This cannot be undone.')) {
      return
    }

    const result = await deleteMembershipType(id)

    if (result.success) {
      toast.success('Membership type deleted successfully')
      await loadMembershipTypes()
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to delete membership type')
    }
  }

  const formatDuration = (value: number, unit: string) => {
    const unitLabel = value === 1 ? unit.slice(0, -1) : unit
    return `${value} ${unitLabel}`
  }

  const getCategoryBadge = (category: string | null) => {
    if (!category) return null

    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      'short-term': 'secondary',
      regular: 'default',
    }

    return (
      <Badge variant={variants[category] || 'default'}>
        {category}
      </Badge>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Membership Types</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Membership Types</CardTitle>
              <CardDescription>
                Manage different types of memberships available to users
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Type
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {membershipTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No membership types defined. Click &quot;Add Type&quot; to create one.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Prefix</TableHead>
                  <TableHead>Auto-Renew</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {membershipTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell className="font-medium">{type.name}</TableCell>
                    <TableCell>{getCategoryBadge(type.member_category)}</TableCell>
                    <TableCell>{formatDuration(type.duration_value, type.duration_unit)}</TableCell>
                    <TableCell>
                      {type.currency} {type.price?.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{type.member_number_prefix}</Badge>
                    </TableCell>
                    <TableCell>{type.auto_renew ? 'Yes' : 'No'}</TableCell>
                    <TableCell>
                      <Badge variant={type.active ? 'default' : 'secondary'}>
                        {type.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(type)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
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
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingType ? 'Edit Membership Type' : 'Create Membership Type'}
              </DialogTitle>
              <DialogDescription>
                Define the properties of this membership type
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Tandem Try-Out"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this membership includes..."
                  rows={3}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="duration_value">Duration Value *</Label>
                  <Input
                    id="duration_value"
                    type="number"
                    min="1"
                    value={formData.duration_value}
                    onChange={(e) => setFormData({ ...formData, duration_value: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration_unit">Duration Unit *</Label>
                  <Select
                    value={formData.duration_unit}
                    onValueChange={(value: 'days' | 'months' | 'years') =>
                      setFormData({ ...formData, duration_unit: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="days">Days</SelectItem>
                      <SelectItem value="months">Months</SelectItem>
                      <SelectItem value="years">Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="price">Price *</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    placeholder="EUR"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="member_category">Member Category *</Label>
                <Select
                  value={formData.member_category}
                  onValueChange={(value: 'regular' | 'short-term') =>
                    setFormData({ ...formData, member_category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="short-term">Short-term</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="member_number_prefix">Member Number Prefix *</Label>
                <Input
                  id="member_number_prefix"
                  value={formData.member_number_prefix}
                  onChange={(e) => setFormData({ ...formData, member_number_prefix: e.target.value.toUpperCase() })}
                  placeholder="e.g., T, M, TR, S"
                  maxLength={3}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Used in member numbers (e.g., {formData.member_number_prefix}-2025-001)
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="auto_renew"
                  checked={formData.auto_renew}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, auto_renew: checked as boolean })
                  }
                />
                <label htmlFor="auto_renew" className="text-sm cursor-pointer">
                  Auto-renew by default
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, active: checked as boolean })
                  }
                />
                <label htmlFor="active" className="text-sm cursor-pointer">
                  Active (visible to users)
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingType ? 'Save Changes' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
