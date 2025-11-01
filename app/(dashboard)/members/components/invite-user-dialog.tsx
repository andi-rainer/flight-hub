'use client'

import { useState, useEffect } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Loader2, AlertCircle, ExternalLink } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { inviteUser } from '@/lib/actions/members'
import { getMembershipTypes } from '@/lib/actions/memberships'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import type { FunctionMaster, MembershipType } from '@/lib/database.types'
import { Checkbox } from '@/components/ui/checkbox'

interface InviteUserDialogProps {
  functions: FunctionMaster[]
}

export function InviteUserDialog({ functions }: InviteUserDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [membershipTypes, setMembershipTypes] = useState<MembershipType[]>([])
  const [loadingTypes, setLoadingTypes] = useState(false)
  const router = useRouter()

  const [formData, setFormData] = useState({
    email: '',
    name: '',
    surname: '',
    selectedFunctions: [] as string[],
    isBoardMember: false,
    membershipTypeId: '',
  })

  useEffect(() => {
    if (open) {
      loadMembershipTypes()
    }
  }, [open])

  const loadMembershipTypes = async () => {
    setLoadingTypes(true)
    const result = await getMembershipTypes()
    if (result.success) {
      setMembershipTypes(result.data.filter(t => t.active))
    }
    setLoadingTypes(false)
  }

  const resetForm = () => {
    setFormData({
      email: '',
      name: '',
      surname: '',
      selectedFunctions: [],
      isBoardMember: false,
      membershipTypeId: '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate membership type is selected
    if (!formData.membershipTypeId) {
      toast.error('Please select a membership type')
      return
    }

    setIsSubmitting(true)

    console.log('### Inviting user with data:', formData)

    const roles = formData.isBoardMember ? ['member', 'board'] : ['member']

    const result = await inviteUser({
      email: formData.email,
      name: formData.name,
      surname: formData.surname,
      functions: formData.selectedFunctions,
      role: roles,
      membershipTypeId: formData.membershipTypeId,
    })

    if (result.success) {
      toast.success(result.message || 'User invited successfully')
      setOpen(false)
      resetForm()
      router.refresh()
    } else {
      console.log('### Invite user failed:', result)
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

            {/* Membership Type Selection - REQUIRED */}
            <div className="space-y-2">
              <Label htmlFor="membership">Membership Type *</Label>
              {loadingTypes ? (
                <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading membership types...
                </div>
              ) : membershipTypes.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No membership types available. Board members must create at least one membership type before inviting members.
                    <Link href="/settings?tab=membership-types" onClick={() => setOpen(false)}>
                      <Button variant="link" className="h-auto p-0 ml-1">
                        Create Membership Type <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </AlertDescription>
                </Alert>
              ) : (
                <Select
                  value={formData.membershipTypeId}
                  onValueChange={(value) => setFormData({ ...formData, membershipTypeId: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select membership type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {membershipTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name} ({type.duration_value} {type.duration_unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {membershipTypes.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  A membership will be automatically assigned upon invitation
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Functions (Optional)</Label>
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
            <Button
              type="submit"
              disabled={isSubmitting || loadingTypes || membershipTypes.length === 0 || !formData.membershipTypeId}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
