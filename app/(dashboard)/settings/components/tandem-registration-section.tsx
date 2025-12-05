'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Loader2, ExternalLink, Plus, X, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { getMembershipTypes } from '@/lib/actions/memberships'
import { createClient } from '@/lib/supabase/client'
import type { MembershipType } from '@/lib/types'

interface CustomField {
  id: string
  label: string
  text: string
  requireCheckbox: boolean
  pdfUrl?: string
}

export function TandemRegistrationSection() {
  const [membershipTypes, setMembershipTypes] = useState<MembershipType[]>([])
  const [selectedTypeId, setSelectedTypeId] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [registrationUrl, setRegistrationUrl] = useState('')

  useEffect(() => {
    loadData()
    setRegistrationUrl(`${window.location.origin}/registration/tandem`)
  }, [])

  const loadData = async () => {
    setLoading(true)

    // Load membership types
    const typesResult = await getMembershipTypes()
    if (typesResult.success) {
      setMembershipTypes(typesResult.data.filter(t => t.active))
    }

    // Load current settings
    try {
      const response = await fetch('/api/settings/tandem-registration')
      if (response.ok) {
        const data = await response.json()
        if (data.membershipTypeId) {
          setSelectedTypeId(data.membershipTypeId)
        }
        if (data.password) {
          setPassword(data.password)
        }
        if (data.customFields) {
          setCustomFields(data.customFields)
        }
      }
    } catch (error) {
      console.error('Error loading tandem settings:', error)
    }

    setLoading(false)
  }

  const handleSave = async () => {
    if (!selectedTypeId) {
      toast.error('Please select a membership type')
      return
    }

    if (!password) {
      toast.error('Please set an access password')
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/settings/tandem-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          membershipTypeId: selectedTypeId,
          password,
          customFields,
        }),
      })

      if (response.ok) {
        toast.success('Tandem registration settings saved')
      } else {
        toast.error('Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving setting:', error)
      toast.error('Failed to save settings')
    }

    setSaving(false)
  }

  const addCustomField = () => {
    setCustomFields([
      ...customFields,
      {
        id: Math.random().toString(36).substr(2, 9),
        label: '',
        text: '',
        requireCheckbox: false,
        pdfUrl: undefined,
      },
    ])
  }

  const updateCustomField = (id: string, updates: Partial<CustomField>) => {
    setCustomFields(customFields.map(field =>
      field.id === id ? { ...field, ...updates } : field
    ))
  }

  const removeCustomField = (id: string) => {
    setCustomFields(customFields.filter(field => field.id !== id))
  }

  const handlePdfUpload = async (fieldId: string, file: File) => {
    setUploading(fieldId)

    try {
      const supabase = createClient()
      const fileExt = file.name.split('.').pop()
      const fileName = `${fieldId}-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('tandem-documents')
        .upload(fileName, file)

      if (uploadError) {
        throw uploadError
      }

      const { data: { publicUrl } } = supabase.storage
        .from('tandem-documents')
        .getPublicUrl(fileName)

      updateCustomField(fieldId, { pdfUrl: publicUrl })
      toast.success('PDF uploaded successfully')
    } catch (error) {
      console.error('Error uploading PDF:', error)
      toast.error('Failed to upload PDF')
    }

    setUploading(null)
  }

  const removePdf = async (fieldId: string, pdfUrl: string) => {
    try {
      const fileName = pdfUrl.split('/').pop()
      if (fileName) {
        const supabase = createClient()
        await supabase.storage.from('tandem-documents').remove([fileName])
      }
      updateCustomField(fieldId, { pdfUrl: undefined })
      toast.success('PDF removed')
    } catch (error) {
      console.error('Error removing PDF:', error)
      toast.error('Failed to remove PDF')
    }
  }

  const copyRegistrationUrl = () => {
    navigator.clipboard.writeText(registrationUrl)
    toast.success('Registration URL copied to clipboard')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tandem Try-Out Registration</CardTitle>
        <CardDescription>
          Configure the public registration form for tandem try-out members.
          This form will be used on a tablet at the dropzone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            {/* Membership Type Selection */}
            <div className="space-y-2">
              <Label htmlFor="tandem-membership-type">
                Membership Type for Tandem Sign-Ups *
              </Label>
              <Select
                value={selectedTypeId}
                onValueChange={setSelectedTypeId}
              >
                <SelectTrigger id="tandem-membership-type">
                  <SelectValue placeholder="Select membership type..." />
                </SelectTrigger>
                <SelectContent>
                  {membershipTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name} ({type.duration_value} {type.duration_unit}) - Prefix: {type.member_number_prefix}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                New tandem registrations will be automatically assigned this membership type.
                Payment status will be set to "paid" by default.
              </p>
            </div>

            {/* Access Password */}
            <div className="space-y-2">
              <Label htmlFor="access-password">
                Access Password *
              </Label>
              <Input
                id="access-password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password to access the form"
              />
              <p className="text-sm text-muted-foreground">
                This password protects the form from public internet access.
                Users must enter this password before accessing the registration form.
              </p>
            </div>

            <Separator />

            {/* Custom Fields */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">Custom Fields & Terms</h3>
                  <p className="text-sm text-muted-foreground">
                    Add custom text, terms & conditions, or additional requirements
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addCustomField}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Field
                </Button>
              </div>

              {customFields.map((field, index) => (
                <div key={field.id} className="rounded-md border p-4 space-y-4 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Field #{index + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCustomField(field.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>Field Label</Label>
                    <Input
                      value={field.label}
                      onChange={(e) => updateCustomField(field.id, { label: e.target.value })}
                      placeholder="e.g., Terms & Conditions"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Text Content</Label>
                    <Textarea
                      value={field.text}
                      onChange={(e) => updateCustomField(field.id, { text: e.target.value })}
                      placeholder="Enter the text to display..."
                      rows={4}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`require-${field.id}`}
                        checked={field.requireCheckbox}
                        onCheckedChange={(checked) =>
                          updateCustomField(field.id, { requireCheckbox: checked as boolean })
                        }
                      />
                      <label htmlFor={`require-${field.id}`} className="text-sm cursor-pointer">
                        Require checkbox acceptance
                      </label>
                    </div>

                    {field.pdfUrl ? (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(field.pdfUrl, '_blank')}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View PDF
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removePdf(field.id, field.pdfUrl!)}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Attach PDF (Optional)</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="file"
                            accept=".pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                handlePdfUpload(field.id, file)
                              }
                            }}
                            disabled={uploading === field.id}
                          />
                          {uploading === field.id && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Users can click to read the full document
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            {/* Registration URL */}
            <div className="space-y-2">
              <Label>Public Registration URL</Label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={registrationUrl}
                  className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={copyRegistrationUrl}
                >
                  Copy
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.open(registrationUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Open this URL on the tablet at the dropzone. The form is public and doesn't require login.
              </p>
            </div>

            {/* Tablet Setup Instructions */}
            <div className="rounded-md border p-4 bg-muted/50 space-y-2">
              <h4 className="text-sm font-medium">Tablet Setup Instructions</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li><strong>iOS:</strong> Use Guided Access (Settings → Accessibility → Guided Access)</li>
                <li><strong>Android:</strong> Use Kiosk Mode or pin the app</li>
                <li>Set the browser to full-screen mode</li>
                <li>Bookmark the registration URL for easy access</li>
                <li>Consider disabling notifications and auto-lock</li>
              </ul>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={saving || !selectedTypeId}
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Settings
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
