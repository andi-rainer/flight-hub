'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Pipette } from 'lucide-react'

interface ColorPickerProps {
  color: string
  onChange: (color: string) => void
}

const PRESET_COLORS = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#64748b', '#78716c', '#57534e', '#44403c', '#1c1917',
]

export function ColorPicker({ color, onChange }: ColorPickerProps) {
  const [localColor, setLocalColor] = useState(color)

  const handleColorChange = (newColor: string) => {
    setLocalColor(newColor)
    onChange(newColor)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal"
        >
          <div className="w-full flex items-center gap-2">
            <div
              className="h-6 w-6 rounded border"
              style={{ backgroundColor: localColor }}
            />
            <span className="text-xs flex-1">{localColor}</span>
            <Pipette className="h-4 w-4" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium">Hex Color</label>
            <Input
              type="text"
              value={localColor}
              onChange={(e) => handleColorChange(e.target.value)}
              placeholder="#000000"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium">Color Picker</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={localColor}
                onChange={(e) => handleColorChange(e.target.value)}
                className="h-10 w-full rounded border cursor-pointer"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium mb-2 block">Preset Colors</label>
            <div className="grid grid-cols-8 gap-2">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  className="h-6 w-6 rounded border hover:scale-110 transition-transform"
                  style={{ backgroundColor: presetColor }}
                  onClick={() => handleColorChange(presetColor)}
                  title={presetColor}
                />
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
