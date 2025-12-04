'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Separator } from '@/components/ui/separator'
import { Eye, EyeOff, Copy, RefreshCw } from 'lucide-react'

export function StoreSettingsSection() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showStripeSecret, setShowStripeSecret] = useState(false)
  const [formData, setFormData] = useState({
    redirect_url: '',
    stripe_public_key: '',
    stripe_secret_key: '',
    allow_voucher_sales: true,
    allow_ticket_sales: true,
    default_overbooking_allowed: '0',
  })

  const loadSettings = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('Error loading settings:', error)
      toast.error('Failed to load store settings')
    } else if (data) {
      setFormData({
        redirect_url: data.redirect_url || '',
        stripe_public_key: data.stripe_public_key || '',
        stripe_secret_key: data.stripe_secret_key || '',
        allow_voucher_sales: data.allow_voucher_sales ?? true,
        allow_ticket_sales: data.allow_ticket_sales ?? true,
        default_overbooking_allowed: data.default_overbooking_allowed?.toString() || '0',
      })
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)

    const payload = {
      redirect_url: formData.redirect_url,
      stripe_public_key: formData.stripe_public_key,
      stripe_secret_key: formData.stripe_secret_key,
      allow_voucher_sales: formData.allow_voucher_sales,
      allow_ticket_sales: formData.allow_ticket_sales,
      default_overbooking_allowed: parseInt(formData.default_overbooking_allowed) || 0,
    }

    const supabase = createClient()

    // Check if settings exist
    const { data: existing } = await supabase
      .from('store_settings')
      .select('id')
      .single()

    let error
    if (existing) {
      // Update
      const result = await supabase
        .from('store_settings')
        .update(payload)
        .eq('id', existing.id)
      error = result.error
    } else {
      // Insert
      const result = await supabase
        .from('store_settings')
        .insert(payload)
      error = result.error
    }

    if (error) {
      toast.error('Failed to save settings')
      console.error(error)
    } else {
      toast.success('Settings saved successfully')
    }

    setIsSaving(false)
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Store Settings</CardTitle>
        <CardDescription>
          Configure the online store for voucher and ticket sales
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* General Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">General Settings</h3>

          <div className="space-y-2">
            <Label htmlFor="redirect_url">Redirect URL</Label>
            <Input
              id="redirect_url"
              value={formData.redirect_url}
              onChange={(e) => setFormData({ ...formData, redirect_url: e.target.value })}
              placeholder="https://skydive-salzburg.com"
            />
            <p className="text-xs text-muted-foreground">
              URL to redirect customers after completing a purchase
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="default_overbooking_allowed">Default Overbooking Slots</Label>
            <Input
              id="default_overbooking_allowed"
              type="number"
              min="0"
              value={formData.default_overbooking_allowed}
              onChange={(e) => setFormData({ ...formData, default_overbooking_allowed: e.target.value })}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">
              Default number of additional bookings allowed beyond max capacity
            </p>
          </div>
        </div>

        <Separator />

        {/* Feature Toggles */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Feature Toggles</h3>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allow_voucher_sales">Allow Voucher Sales</Label>
              <p className="text-sm text-muted-foreground">
                Enable customers to purchase vouchers online
              </p>
            </div>
            <Switch
              id="allow_voucher_sales"
              checked={formData.allow_voucher_sales}
              onCheckedChange={(checked) => setFormData({ ...formData, allow_voucher_sales: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allow_ticket_sales">Allow Ticket Sales</Label>
              <p className="text-sm text-muted-foreground">
                Enable customers to book specific operation days online
              </p>
            </div>
            <Switch
              id="allow_ticket_sales"
              checked={formData.allow_ticket_sales}
              onCheckedChange={(checked) => setFormData({ ...formData, allow_ticket_sales: checked })}
            />
          </div>
        </div>

        <Separator />

        {/* Stripe Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Stripe Integration</h3>

          <div className="space-y-2">
            <Label htmlFor="stripe_public_key">Stripe Publishable Key</Label>
            <div className="flex gap-2">
              <Input
                id="stripe_public_key"
                value={formData.stripe_public_key}
                onChange={(e) => setFormData({ ...formData, stripe_public_key: e.target.value })}
                placeholder="pk_live_..."
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(formData.stripe_public_key, 'Public key')}
                disabled={!formData.stripe_public_key}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Public key for client-side Stripe integration
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stripe_secret_key">Stripe Secret Key</Label>
            <div className="flex gap-2">
              <Input
                id="stripe_secret_key"
                type={showStripeSecret ? 'text' : 'password'}
                value={formData.stripe_secret_key}
                onChange={(e) => setFormData({ ...formData, stripe_secret_key: e.target.value })}
                placeholder="sk_live_..."
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowStripeSecret(!showStripeSecret)}
              >
                {showStripeSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(formData.stripe_secret_key, 'Secret key')}
                disabled={!formData.stripe_secret_key}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-destructive">
              Keep this secret! Only store API will use this key.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
