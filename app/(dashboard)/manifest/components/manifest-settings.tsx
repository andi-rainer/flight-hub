'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { updateManifestSettings } from '@/lib/actions/manifest'
import { useRouter } from 'next/navigation'
import { Plane, Clock, DollarSign } from 'lucide-react'

interface ManifestSettingsProps {
  settings: any
}

export function ManifestSettings({ settings }: ManifestSettingsProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    default_jump_altitude_feet: settings?.default_jump_altitude_feet || 13000,
    min_jump_altitude_feet: settings?.min_jump_altitude_feet || 3000,
    max_jump_altitude_feet: settings?.max_jump_altitude_feet || 15000,
    default_flight_interval_minutes: settings?.default_flight_interval_minutes || 30,
    default_operation_start_time: settings?.default_operation_start_time?.substring(0, 5) || '09:00',
    default_operation_end_time: settings?.default_operation_end_time?.substring(0, 5) || '18:00',
    default_tandem_price_eur: settings?.default_tandem_price_eur || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const result = await updateManifestSettings(formData)

      if (result.success) {
        toast.success('Settings updated successfully')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to update settings')
      }
    } catch (error) {
      console.error('Error updating settings:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Plane className="h-5 w-5" />
            <CardTitle>Jump Altitude Settings</CardTitle>
          </div>
          <CardDescription>
            Configure default jump altitudes for skydive operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="default_jump_altitude_feet">Default Altitude (feet)</Label>
              <Input
                id="default_jump_altitude_feet"
                type="number"
                min={formData.min_jump_altitude_feet}
                max={formData.max_jump_altitude_feet}
                step="500"
                value={formData.default_jump_altitude_feet}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    default_jump_altitude_feet: parseInt(e.target.value) || 0,
                  })
                }
                required
              />
              <p className="text-xs text-muted-foreground">
                Standard drop altitude for new flights
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="min_jump_altitude_feet">Minimum Altitude (feet)</Label>
              <Input
                id="min_jump_altitude_feet"
                type="number"
                min="1000"
                step="500"
                value={formData.min_jump_altitude_feet}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    min_jump_altitude_feet: parseInt(e.target.value) || 0,
                  })
                }
                required
              />
              <p className="text-xs text-muted-foreground">Minimum allowed altitude</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_jump_altitude_feet">Maximum Altitude (feet)</Label>
              <Input
                id="max_jump_altitude_feet"
                type="number"
                max="20000"
                step="500"
                value={formData.max_jump_altitude_feet}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    max_jump_altitude_feet: parseInt(e.target.value) || 0,
                  })
                }
                required
              />
              <p className="text-xs text-muted-foreground">Maximum allowed altitude</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <CardTitle>Flight Scheduling</CardTitle>
          </div>
          <CardDescription>
            Configure default times and intervals for flight scheduling
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="default_flight_interval_minutes">
                Default Interval (minutes)
              </Label>
              <Input
                id="default_flight_interval_minutes"
                type="number"
                min="10"
                max="240"
                step="5"
                value={formData.default_flight_interval_minutes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    default_flight_interval_minutes: parseInt(e.target.value) || 0,
                  })
                }
                required
              />
              <p className="text-xs text-muted-foreground">
                Time between flights (for series creation)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_operation_start_time">
                Default Start Time
              </Label>
              <Input
                id="default_operation_start_time"
                type="time"
                value={formData.default_operation_start_time}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    default_operation_start_time: e.target.value,
                  })
                }
                required
              />
              <p className="text-xs text-muted-foreground">Suggested first flight time</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_operation_end_time">Default End Time</Label>
              <Input
                id="default_operation_end_time"
                type="time"
                value={formData.default_operation_end_time}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    default_operation_end_time: e.target.value,
                  })
                }
                required
              />
              <p className="text-xs text-muted-foreground">
                Suggested last flight time
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            <CardTitle>Pricing (Optional)</CardTitle>
          </div>
          <CardDescription>
            Configure default prices for tandem jumps
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="default_tandem_price_eur">
              Default Tandem Price (EUR)
            </Label>
            <Input
              id="default_tandem_price_eur"
              type="number"
              min="0"
              step="0.01"
              value={formData.default_tandem_price_eur}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  default_tandem_price_eur: e.target.value,
                })
              }
              placeholder="e.g., 250.00"
            />
            <p className="text-xs text-muted-foreground">
              Optional: Default price for tandem jumps (can be overridden per jump)
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </form>
  )
}
