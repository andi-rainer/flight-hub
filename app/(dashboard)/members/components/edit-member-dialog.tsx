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
import { Pencil, Loader2 } from 'lucide-react'
import { updateMember } from '@/lib/actions/members'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { User, FunctionMaster } from '@/lib/database.types'
import { Checkbox } from '@/components/ui/checkbox'

interface EditMemberDialogProps {
  member: User
  functions: FunctionMaster[]
}

export function EditMemberDialog({ member, functions }: EditMemberDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const [formData, setFormData] = useState({
    name: member.name,
    surname: member.surname,
    license_number: member.license_number || '',
    selectedFunctions: member.functions || [],
    isBoardMember: member.role?.includes('board') || false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const roles = formData.isBoardMember ? ['member', 'board'] : ['member']

    const result = await updateMember(member.id, {
      name: formData.name,
      surname: formData.surname,
      license_number: formData.license_number || null,
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
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
            <DialogDescription>
              Update member information, roles, and functions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
              <Label htmlFor="edit-license">License Number</Label>
              <Input
                id="edit-license"
                value={formData.license_number}
                onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                placeholder="e.g., PPL-12345"
              />
            </div>
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
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
