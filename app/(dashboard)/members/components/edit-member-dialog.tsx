'use client'

import { useState } from 'react'
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
import { Pencil, Loader2, Mail, Phone, MapPin } from 'lucide-react'
import { resendInvitation } from '@/lib/actions/members'
import { updateMemberProfile } from '@/lib/actions/settings'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { User, FunctionMaster } from '@/lib/database.types'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'

interface EditMemberDialogProps {
  member: User
  functions: FunctionMaster[]
}

export function EditMemberDialog({ member, functions }: EditMemberDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const router = useRouter()

  const [formData, setFormData] = useState({
    name: member.name,
    surname: member.surname,
    email: member.email,
    license_number: member.license_number || '',
    telephone: member.telephone || '',
    birthday: member.birthday || '',
    street: member.street || '',
    house_number: member.house_number || '',
    city: member.city || '',
    zip: member.zip || '',
    country: member.country || '',
    emergency_contact_name: member.emergency_contact_name || '',
    emergency_contact_phone: member.emergency_contact_phone || '',
    selectedFunctions: member.functions || [],
    isBoardMember: member.role?.includes('board') || false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const roles = formData.isBoardMember ? ['member', 'board'] : ['member']

    const result = await updateMemberProfile(member.id, {
      name: formData.name,
      surname: formData.surname,
      email: formData.email,
      license_number: formData.license_number || null,
      telephone: formData.telephone || null,
      birthday: formData.birthday || null,
      street: formData.street || null,
      house_number: formData.house_number || null,
      city: formData.city || null,
      zip: formData.zip || null,
      country: formData.country || null,
      emergency_contact_name: formData.emergency_contact_name || null,
      emergency_contact_phone: formData.emergency_contact_phone || null,
      functions: formData.selectedFunctions,
      role: roles,
    })

    if (result.success) {
      toast.success('Member updated successfully')
      setOpen(false)
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to update member')
    }

    setIsSubmitting(false)
  }

  const handleResendInvitation = async () => {
    setIsResending(true)

    const result = await resendInvitation(member.id)

    if (result.success) {
      toast.success(result.message || 'Invitation resent successfully')
    } else {
      toast.error(result.error || 'Failed to resend invitation')
    }

    setIsResending(false)
  }

  const toggleFunction = (functionId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedFunctions: prev.selectedFunctions.includes(functionId)
        ? prev.selectedFunctions.filter(id => id !== functionId)
        : [...prev.selectedFunctions, functionId]
    }))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
            <DialogDescription>
              Update member information, roles, and functions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Basic Information</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">First Name</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-surname">Last Name</Label>
                  <Input
                    id="edit-surname"
                    value={formData.surname}
                    onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-license">License Number</Label>
                  <Input
                    id="edit-license"
                    value={formData.license_number}
                    onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                    placeholder="e.g., PPL-12345"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-telephone">Telephone</Label>
                  <Input
                    id="edit-telephone"
                    type="tel"
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    placeholder="e.g., +41 79 123 45 67"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-birthday">Birthday (Optional)</Label>
                <Input
                  id="edit-birthday"
                  type="date"
                  value={formData.birthday}
                  onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                />
              </div>
            </div>

            <Separator />

            {/* Address */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Address
              </h3>
              <div className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="edit-street">Street (Optional)</Label>
                    <Input
                      id="edit-street"
                      value={formData.street}
                      onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                      placeholder="e.g., Bahnhofstrasse"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-house-number">Number (Optional)</Label>
                    <Input
                      id="edit-house-number"
                      value={formData.house_number}
                      onChange={(e) => setFormData({ ...formData, house_number: e.target.value })}
                      placeholder="e.g., 123"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="edit-zip">ZIP Code (Optional)</Label>
                    <Input
                      id="edit-zip"
                      value={formData.zip}
                      onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                      placeholder="e.g., 8000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-city">City (Optional)</Label>
                    <Input
                      id="edit-city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="e.g., Zürich"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-country">Country (Optional)</Label>
                    <Input
                      id="edit-country"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      placeholder="e.g., Switzerland"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Emergency Contact */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Emergency Contact
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-emergency-name">Contact Name (Optional)</Label>
                  <Input
                    id="edit-emergency-name"
                    value={formData.emergency_contact_name}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                    placeholder="e.g., John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-emergency-phone">Contact Phone (Optional)</Label>
                  <Input
                    id="edit-emergency-phone"
                    type="tel"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                    placeholder="e.g., +41 79 123 45 67"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Functions & Role */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Functions & Role</h3>
              <div className="space-y-2">
                <Label>Functions</Label>
                <div className="grid grid-cols-2 gap-2 border rounded-md p-3">
                  {functions.map((func) => (
                    <div key={func.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-func-${func.id}`}
                        checked={formData.selectedFunctions.includes(func.id)}
                        onCheckedChange={() => toggleFunction(func.id)}
                      />
                      <label
                        htmlFor={`edit-func-${func.id}`}
                        className="text-sm cursor-pointer"
                      >
                        {func.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-board"
                  checked={formData.isBoardMember}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isBoardMember: checked as boolean })
                  }
                />
                <label htmlFor="edit-board" className="text-sm cursor-pointer">
                  Board Member
                </label>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-3">
            <Label className="text-sm font-medium">Actions</Label>
            <Button
              type="button"
              variant="outline"
              onClick={handleResendInvitation}
              disabled={isResending || isSubmitting}
              className="w-full justify-start"
            >
              {isResending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Resend Invitation Email
            </Button>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
