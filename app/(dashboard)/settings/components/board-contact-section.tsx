'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Mail, Phone, User, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { getBoardContactSettings, updateBoardContactSettings } from '@/lib/actions/settings'

export function BoardContactSection() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    contact_email: '',
    contact_phone: '',
    contact_name: '',
    office_hours: '',
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setIsLoading(true)
    const settings = await getBoardContactSettings()

    if (settings) {
      setFormData({
        contact_email: settings.contact_email || '',
        contact_phone: settings.contact_phone || '',
        contact_name: settings.contact_name || '',
        office_hours: settings.office_hours || '',
      })
    }

    setIsLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    const result = await updateBoardContactSettings({
      contact_email: formData.contact_email || null,
      contact_phone: formData.contact_phone || null,
      contact_name: formData.contact_name || null,
      office_hours: formData.office_hours || null,
    })

    if (result.success) {
      toast.success('Contact information updated successfully')
    } else {
      toast.error(result.error || 'Failed to update contact information')
    }

    setIsSaving(false)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Board Contact Information</CardTitle>
          <CardDescription>
            Loading...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Board Contact Information</CardTitle>
        <CardDescription>
          Configure contact details shown to members with inactive accounts.
          Leave fields empty to hide them from the inactive account page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact_email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Contact Email
              </Label>
              <Input
                id="contact_email"
                type="email"
                placeholder="board@example.com"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Email address where members can contact the board
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Contact Phone
              </Label>
              <Input
                id="contact_phone"
                type="tel"
                placeholder="+43 123 456 7890"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Phone number where members can reach the club
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Contact Name/Title
              </Label>
              <Input
                id="contact_name"
                type="text"
                placeholder="Board Secretary"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Name or title shown as contact person (e.g., "Board Secretary", "Club Manager")
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="office_hours" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Office Hours (Optional)
              </Label>
              <Textarea
                id="office_hours"
                placeholder="Monday - Friday: 9:00 AM - 5:00 PM&#10;Saturday: 10:00 AM - 2:00 PM"
                value={formData.office_hours}
                onChange={(e) => setFormData({ ...formData, office_hours: e.target.value })}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Optional information about when members can contact the board
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Contact Information
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
