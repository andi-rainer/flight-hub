'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Loader2 } from 'lucide-react'
import { updateUserProfile, updateUserEmail, updateUserPassword } from '@/lib/actions/settings'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { User } from '@/lib/types'

interface ProfileSectionProps {
  user: User
}

export function ProfileSection({ user }: ProfileSectionProps) {
  const router = useRouter()
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  const [profileData, setProfileData] = useState({
    name: user.name,
    surname: user.surname,
    license_number: user.license_number || '',
  })

  const [emailData, setEmailData] = useState({
    newEmail: user.email,
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdatingProfile(true)

    const result = await updateUserProfile({
      name: profileData.name,
      surname: profileData.surname,
      license_number: profileData.license_number || null,
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

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters')
      return
    }

    setIsUpdatingPassword(true)

    const result = await updateUserPassword(
      passwordData.currentPassword,
      passwordData.newPassword
    )

    if (result.success) {
      toast.success(result.message || 'Password updated successfully')
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } else {
      toast.error(result.error || 'Failed to update password')
    }

    setIsUpdatingPassword(false)
  }

  return (
    <div className="space-y-6">
      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
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
            <Button type="submit" disabled={isUpdatingProfile}>
              {isUpdatingProfile && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Email Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Email Address</CardTitle>
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

      {/* Password Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Update your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, currentPassword: e.target.value })
                }
                required
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, newPassword: e.target.value })
                }
                required
                minLength={6}
              />
              <p className="text-sm text-muted-foreground">
                Minimum 6 characters
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                }
                required
                minLength={6}
              />
            </div>
            <Button type="submit" disabled={isUpdatingPassword}>
              {isUpdatingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Change Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
