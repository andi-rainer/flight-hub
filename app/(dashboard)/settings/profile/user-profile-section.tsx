'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, User as UserIcon, Mail, Shield, Briefcase, Phone, Calendar, MapPin } from 'lucide-react'
import { updateUserProfile, updateUserEmail, updateUserMembershipDates } from '@/lib/actions/settings'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { User } from '@/lib/database.types'

type UserWithFunctionNames = User & {
  functionNames?: string[]
}

interface UserProfileSectionProps {
  user: UserWithFunctionNames
  isBoardMember: boolean
}

export function UserProfileSection({ user, isBoardMember }: UserProfileSectionProps) {
  const router = useRouter()
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false)
  const [isEditingMembership, setIsEditingMembership] = useState(false)
  const [isUpdatingMembership, setIsUpdatingMembership] = useState(false)

  const [profileData, setProfileData] = useState({
    name: user.name,
    surname: user.surname,
    license_number: user.license_number || '',
    street: user.street || '',
    house_number: user.house_number || '',
    city: user.city || '',
    zip: user.zip || '',
    country: user.country || '',
    birthday: user.birthday || '',
    telephone: user.telephone || '',
  })

  const [emailData, setEmailData] = useState({
    newEmail: user.email,
  })

  const [membershipData, setMembershipData] = useState({
    joined_at: user.joined_at || '',
    left_at: user.left_at || '',
  })

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdatingProfile(true)

    const result = await updateUserProfile({
      name: profileData.name,
      surname: profileData.surname,
      license_number: profileData.license_number || null,
      street: profileData.street || null,
      house_number: profileData.house_number || null,
      city: profileData.city || null,
      zip: profileData.zip || null,
      country: profileData.country || null,
      birthday: profileData.birthday || null,
      telephone: profileData.telephone || null,
    })

    if (result.success) {
      toast.success('Profile updated successfully')
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to update profile')
    }

    setIsUpdatingProfile(false)
  }

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (emailData.newEmail === user.email) {
      toast.info('Email is unchanged')
      return
    }

    setIsUpdatingEmail(true)

    const result = await updateUserEmail(emailData.newEmail)

    if (result.success) {
      toast.success(result.message || 'Email update initiated')
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to update email')
    }

    setIsUpdatingEmail(false)
  }

  const handleMembershipUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdatingMembership(true)

    const result = await updateUserMembershipDates(user.id, {
      joined_at: membershipData.joined_at || null,
      left_at: membershipData.left_at || null,
    })

    if (result.success) {
      toast.success('Membership dates updated successfully')
      setIsEditingMembership(false)
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to update membership dates')
    }

    setIsUpdatingMembership(false)
  }

  return (
    <div className="space-y-6">
      {/* User Functions/Roles Display */}
      {(user.functionNames && user.functionNames.length > 0) || (user.role && user.role.length > 0) ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Functions & Roles
            </CardTitle>
            <CardDescription>
              Your assigned functions and roles within the organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {user.functionNames && user.functionNames.length > 0 && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Functions</Label>
                  <div className="flex flex-wrap gap-2">
                    {user.functionNames.map((funcName) => (
                      <Badge key={funcName} variant="secondary">
                        {funcName}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Functions are assigned by board members and define your responsibilities
                  </p>
                </div>
              )}
              {user.role && user.role.length > 0 && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Roles</Label>
                  <div className="flex flex-wrap gap-2">
                    {user.role.map((role) => (
                      <Badge key={role} variant="default" className="bg-primary">
                        <Shield className="h-3 w-3 mr-1" />
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Update your personal information and license details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">First Name</Label>
                <Input
                  id="name"
                  value={profileData.name}
                  onChange={(e) =>
                    setProfileData({ ...profileData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="surname">Last Name</Label>
                <Input
                  id="surname"
                  value={profileData.surname}
                  onChange={(e) =>
                    setProfileData({ ...profileData, surname: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="license_number">License Number (Optional)</Label>
              <Input
                id="license_number"
                placeholder="e.g., PPL-12345"
                value={profileData.license_number}
                onChange={(e) =>
                  setProfileData({ ...profileData, license_number: e.target.value })
                }
              />
            </div>

            {/* Contact Information */}
            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Contact Information
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="telephone">Telephone (Optional)</Label>
                  <Input
                    id="telephone"
                    type="tel"
                    placeholder="e.g., +41 79 123 45 67"
                    value={profileData.telephone}
                    onChange={(e) =>
                      setProfileData({ ...profileData, telephone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthday">Birthday (Optional)</Label>
                  <Input
                    id="birthday"
                    type="date"
                    value={profileData.birthday}
                    onChange={(e) =>
                      setProfileData({ ...profileData, birthday: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Address
              </h3>
              <div className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="street">Street (Optional)</Label>
                    <Input
                      id="street"
                      placeholder="e.g., Bahnhofstrasse"
                      value={profileData.street}
                      onChange={(e) =>
                        setProfileData({ ...profileData, street: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="house_number">Number (Optional)</Label>
                    <Input
                      id="house_number"
                      placeholder="e.g., 123"
                      value={profileData.house_number}
                      onChange={(e) =>
                        setProfileData({ ...profileData, house_number: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="zip">ZIP Code (Optional)</Label>
                    <Input
                      id="zip"
                      placeholder="e.g., 8000"
                      value={profileData.zip}
                      onChange={(e) =>
                        setProfileData({ ...profileData, zip: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City (Optional)</Label>
                    <Input
                      id="city"
                      placeholder="e.g., Zürich"
                      value={profileData.city}
                      onChange={(e) =>
                        setProfileData({ ...profileData, city: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country (Optional)</Label>
                    <Input
                      id="country"
                      placeholder="e.g., Switzerland"
                      value={profileData.country}
                      onChange={(e) =>
                        setProfileData({ ...profileData, country: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <Button type="submit" disabled={isUpdatingProfile} className="mt-4">
              {isUpdatingProfile && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Membership Information */}
      {(user.joined_at || user.left_at || isBoardMember) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Membership
                </CardTitle>
                <CardDescription>
                  Your membership dates within the organization
                </CardDescription>
              </div>
              {isBoardMember && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingMembership(true)}
                >
                  Edit Dates
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Joined On</Label>
                <p className="text-sm text-muted-foreground">
                  {user.joined_at ? new Date(user.joined_at).toLocaleDateString() : 'Not set'}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Left On</Label>
                <p className="text-sm text-muted-foreground">
                  {user.left_at ? new Date(user.left_at).toLocaleDateString() : 'Not set'}
                </p>
              </div>
            </div>
            {!isBoardMember && (
              <p className="text-xs text-muted-foreground mt-4">
                Membership dates can only be updated by board members
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Membership Dates Dialog */}
      <Dialog open={isEditingMembership} onOpenChange={setIsEditingMembership}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Membership Dates</DialogTitle>
            <DialogDescription>
              Update the membership dates for this user. Leave empty if not applicable.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleMembershipUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="joined_at">Joined Date</Label>
              <Input
                id="joined_at"
                type="date"
                value={membershipData.joined_at}
                onChange={(e) =>
                  setMembershipData({ ...membershipData, joined_at: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="left_at">Left Date</Label>
              <Input
                id="left_at"
                type="date"
                value={membershipData.left_at}
                onChange={(e) =>
                  setMembershipData({ ...membershipData, left_at: e.target.value })
                }
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditingMembership(false)}
                disabled={isUpdatingMembership}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdatingMembership}>
                {isUpdatingMembership && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Email Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Address
          </CardTitle>
          <CardDescription>
            Update your email address. You will need to verify the new email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={emailData.newEmail}
                onChange={(e) =>
                  setEmailData({ ...emailData, newEmail: e.target.value })
                }
                required
              />
            </div>
            <Button type="submit" disabled={isUpdatingEmail}>
              {isUpdatingEmail && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Email
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
