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
import { Plus, Loader2 } from 'lucide-react'
import { inviteUser } from '@/lib/actions/members'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { FunctionMaster } from '@/lib/database.types'
import { Checkbox } from '@/components/ui/checkbox'

interface InviteUserDialogProps {
  functions: FunctionMaster[]
}

export function InviteUserDialog({ functions }: InviteUserDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const [formData, setFormData] = useState({
    email: '',
    name: '',
    surname: '',
    selectedFunctions: [] as string[],
    isBoardMember: false,
  })

  const resetForm = () => {
    setFormData({
      email: '',
      name: '',
      surname: '',
      selectedFunctions: [],
      isBoardMember: false,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const roles = formData.isBoardMember ? ['member', 'board'] : ['member']

    const result = await inviteUser({
      email: formData.email,
      name: formData.name,
      surname: formData.surname,
      functions: formData.selectedFunctions,
      role: roles,
    })

    if (result.success) {
      toast.success(result.message || 'User invited successfully')
      setOpen(false)
      resetForm()
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to invite user')
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
        <Button onClick={() => resetForm()}>
          <Plus className="h-4 w-4 mr-2" />
          Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Invite New Member</DialogTitle>
            <DialogDescription>
              Send an invitation email to a new club member
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">First Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="surname">Last Name</Label>
                <Input
                  id="surname"
                  value={formData.surname}
                  onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Functions</Label>
              <div className="grid grid-cols-2 gap-2 border rounded-md p-3">
                {functions.map((func) => (
                  <div key={func.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`func-${func.id}`}
                      checked={formData.selectedFunctions.includes(func.id)}
                      onCheckedChange={() => toggleFunction(func.id)}
                    />
                    <label
                      htmlFor={`func-${func.id}`}
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
                id="board"
                checked={formData.isBoardMember}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isBoardMember: checked as boolean })
                }
              />
              <label htmlFor="board" className="text-sm cursor-pointer">
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
              Send Invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
