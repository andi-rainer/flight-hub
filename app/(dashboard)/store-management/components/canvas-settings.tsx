'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ColorPicker } from './color-picker'

interface CanvasSettingsProps {
  backgroundColor: string
  borderEnabled: boolean
  borderWidth: number
  borderColor: string
  borderStyle: string
  borderRadius: number
  onUpdateSettings: (settings: Partial<{
    backgroundColor: string
    borderEnabled: boolean
    borderWidth: number
    borderColor: string
    borderStyle: string
    borderRadius: number
  }>) => void
}

export function CanvasSettings({
  backgroundColor,
  borderEnabled,
  borderWidth,
  borderColor,
  borderStyle,
  borderRadius,
  onUpdateSettings,
}: CanvasSettingsProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-sm">Canvas Settings</CardTitle>
        <CardDescription>Configure canvas appearance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Background Color */}
        <div className="space-y-2">
          <Label className="text-xs">Background Color</Label>
          <ColorPicker
            color={backgroundColor}
            onChange={(color) => onUpdateSettings({ backgroundColor: color })}
          />
        </div>

        {/* Border Enabled */}
        <div className="flex items-center justify-between">
          <Label className="text-xs">Border</Label>
          <Switch
            checked={borderEnabled}
            onCheckedChange={(checked) => onUpdateSettings({ borderEnabled: checked })}
          />
        </div>

        {borderEnabled && (
          <>
            {/* Border Width */}
            <div className="space-y-2">
              <Label className="text-xs">Border Width: {borderWidth}px</Label>
              <Slider
                value={[borderWidth]}
                onValueChange={([value]) => onUpdateSettings({ borderWidth: value })}
                min={1}
                max={10}
                step={1}
              />
            </div>

            {/* Border Color */}
            <div className="space-y-2">
              <Label className="text-xs">Border Color</Label>
              <ColorPicker
                color={borderColor}
                onChange={(color) => onUpdateSettings({ borderColor: color })}
              />
            </div>

            {/* Border Style */}
            <div className="space-y-2">
              <Label className="text-xs">Border Style</Label>
              <Select
                value={borderStyle}
                onValueChange={(value) => onUpdateSettings({ borderStyle: value })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">Solid</SelectItem>
                  <SelectItem value="dashed">Dashed</SelectItem>
                  <SelectItem value="dotted">Dotted</SelectItem>
                  <SelectItem value="double">Double</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Border Radius */}
            <div className="space-y-2">
              <Label className="text-xs">Border Radius: {borderRadius}px</Label>
              <Slider
                value={[borderRadius]}
                onValueChange={([value]) => onUpdateSettings({ borderRadius: value })}
                min={0}
                max={50}
                step={1}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
