'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { PDFTemplate } from '@/lib/types'
import { updatePDFTemplate } from '@/lib/actions/pdf-templates'
import {
  Palette,
  Type,
  Image as ImageIcon,
  Layout,
  Square,
  Save,
  Eye,
  Upload,
  Trash2,
  Move,
  Plus,
} from 'lucide-react'
import { TemplatePreview } from './template-preview'
import { ColorPicker } from './color-picker'

interface TemplateEditorDialogProps {
  template: PDFTemplate | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function TemplateEditorDialog({
  template,
  open,
  onOpenChange,
  onSaved,
}: TemplateEditorDialogProps) {
  const [editedTemplate, setEditedTemplate] = useState<PDFTemplate | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    if (template) {
      setEditedTemplate({ ...template })
    }
  }, [template])

  if (!editedTemplate) return null

  const handleSave = async () => {
    if (!editedTemplate) return

    setIsSaving(true)
    try {
      const result = await updatePDFTemplate(editedTemplate.id, {
        layout_type: editedTemplate.layout_type,
        background_image_url: editedTemplate.background_image_url,
        background_opacity: editedTemplate.background_opacity,
        background_position: editedTemplate.background_position,
        logo_position: editedTemplate.logo_position,
        logo_enabled: editedTemplate.logo_enabled,
        text_overlay_enabled: editedTemplate.text_overlay_enabled,
        text_overlay_color: editedTemplate.text_overlay_color,
        text_overlay_position: editedTemplate.text_overlay_position,
        decorative_images: editedTemplate.decorative_images,
        qr_config: editedTemplate.qr_config,
        font_config: editedTemplate.font_config,
        border_config: editedTemplate.border_config,
        content_zones: editedTemplate.content_zones,
        page_config: editedTemplate.page_config,
        layout_config: editedTemplate.layout_config,
      })

      if (result.success) {
        toast.success('Template saved successfully')
        onSaved()
        onOpenChange(false)
      } else {
        toast.error(result.error || 'Failed to save template')
      }
    } catch (error) {
      toast.error('An error occurred while saving')
    } finally {
      setIsSaving(false)
    }
  }

  const updateLayoutConfig = (key: string, value: any) => {
    setEditedTemplate({
      ...editedTemplate,
      layout_config: {
        ...editedTemplate.layout_config,
        [key]: value,
      },
    })
  }

  const updateFontConfig = (key: string, value: any) => {
    setEditedTemplate({
      ...editedTemplate,
      font_config: {
        ...editedTemplate.font_config,
        [key]: value,
      },
    })
  }

  const updateBorderConfig = (key: string, value: any) => {
    setEditedTemplate({
      ...editedTemplate,
      border_config: {
        ...editedTemplate.border_config,
        [key]: value,
      },
    })
  }

  const updateQRConfig = (key: string, value: any) => {
    setEditedTemplate({
      ...editedTemplate,
      qr_config: {
        ...editedTemplate.qr_config,
        [key]: value,
      },
    })
  }

  const updateLogoPosition = (key: string, value: number) => {
    setEditedTemplate({
      ...editedTemplate,
      logo_position: {
        ...editedTemplate.logo_position,
        [key]: value,
      },
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-7xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>Edit Template: {editedTemplate.name}</DialogTitle>
            <DialogDescription>
              Customize the visual design of your PDF template
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-4 h-full overflow-hidden">
            {/* Left Panel - Configuration */}
            <div className="w-1/3 border-r pr-4">
              <ScrollArea className="h-[calc(90vh-120px)]">
                <Tabs defaultValue="layout" className="w-full">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="layout">
                      <Layout className="h-4 w-4" />
                    </TabsTrigger>
                    <TabsTrigger value="colors">
                      <Palette className="h-4 w-4" />
                    </TabsTrigger>
                    <TabsTrigger value="typography">
                      <Type className="h-4 w-4" />
                    </TabsTrigger>
                    <TabsTrigger value="images">
                      <ImageIcon className="h-4 w-4" />
                    </TabsTrigger>
                    <TabsTrigger value="border">
                      <Square className="h-4 w-4" />
                    </TabsTrigger>
                  </TabsList>

                  {/* Layout Tab */}
                  <TabsContent value="layout" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Layout Type</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Select
                          value={editedTemplate.layout_type || 'ticket'}
                          onValueChange={(value: any) =>
                            setEditedTemplate({ ...editedTemplate, layout_type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ticket">Ticket Style</SelectItem>
                            <SelectItem value="full-photo">Full Photo Background</SelectItem>
                            <SelectItem value="certificate">Certificate Style</SelectItem>
                            <SelectItem value="minimal">Minimal</SelectItem>
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Logo Position</CardTitle>
                        <CardDescription>Adjust logo placement and size</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Enabled</Label>
                          <Switch
                            checked={editedTemplate.logo_enabled ?? true}
                            onCheckedChange={(checked) =>
                              setEditedTemplate({ ...editedTemplate, logo_enabled: checked })
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs">X Position</Label>
                          <Slider
                            value={[editedTemplate.logo_position?.x || 50]}
                            onValueChange={([value]) => updateLogoPosition('x', value)}
                            max={500}
                            step={5}
                            className="mt-2"
                          />
                          <span className="text-xs text-muted-foreground">
                            {editedTemplate.logo_position?.x || 50}px
                          </span>
                        </div>
                        <div>
                          <Label className="text-xs">Y Position</Label>
                          <Slider
                            value={[editedTemplate.logo_position?.y || 30]}
                            onValueChange={([value]) => updateLogoPosition('y', value)}
                            max={800}
                            step={5}
                            className="mt-2"
                          />
                          <span className="text-xs text-muted-foreground">
                            {editedTemplate.logo_position?.y || 30}px
                          </span>
                        </div>
                        <div>
                          <Label className="text-xs">Width</Label>
                          <Slider
                            value={[editedTemplate.logo_position?.width || 120]}
                            onValueChange={([value]) => updateLogoPosition('width', value)}
                            max={300}
                            step={5}
                            className="mt-2"
                          />
                          <span className="text-xs text-muted-foreground">
                            {editedTemplate.logo_position?.width || 120}px
                          </span>
                        </div>
                        <div>
                          <Label className="text-xs">Height</Label>
                          <Slider
                            value={[editedTemplate.logo_position?.height || 60]}
                            onValueChange={([value]) => updateLogoPosition('height', value)}
                            max={200}
                            step={5}
                            className="mt-2"
                          />
                          <span className="text-xs text-muted-foreground">
                            {editedTemplate.logo_position?.height || 60}px
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">QR Code</CardTitle>
                        <CardDescription>Configure QR code placement</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <Label className="text-xs">Position</Label>
                          <Select
                            value={editedTemplate.qr_config?.position || 'right'}
                            onValueChange={(value) => updateQRConfig('position', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="right">Right</SelectItem>
                              <SelectItem value="bottom">Bottom</SelectItem>
                              <SelectItem value="center">Center</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Size</Label>
                          <Slider
                            value={[editedTemplate.qr_config?.size || 80]}
                            onValueChange={([value]) => updateQRConfig('size', value)}
                            min={50}
                            max={150}
                            step={5}
                            className="mt-2"
                          />
                          <span className="text-xs text-muted-foreground">
                            {editedTemplate.qr_config?.size || 80}px
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Colors Tab */}
                  <TabsContent value="colors" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Background Colors</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <Label className="text-xs">Primary Color</Label>
                          <ColorPicker
                            color={editedTemplate.layout_config?.primaryColor || '#3b82f6'}
                            onChange={(color) => updateLayoutConfig('primaryColor', color)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Secondary Color</Label>
                          <ColorPicker
                            color={editedTemplate.layout_config?.secondaryColor || '#8b5cf6'}
                            onChange={(color) => updateLayoutConfig('secondaryColor', color)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Accent Color</Label>
                          <ColorPicker
                            color={editedTemplate.layout_config?.accentColor || '#10b981'}
                            onChange={(color) => updateLayoutConfig('accentColor', color)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Background Color</Label>
                          <ColorPicker
                            color={editedTemplate.layout_config?.backgroundColor || '#ffffff'}
                            onChange={(color) => updateLayoutConfig('backgroundColor', color)}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">QR Code Colors</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <Label className="text-xs">Foreground</Label>
                          <ColorPicker
                            color={editedTemplate.qr_config?.foregroundColor || '#000000'}
                            onChange={(color) => updateQRConfig('foregroundColor', color)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Background</Label>
                          <ColorPicker
                            color={editedTemplate.qr_config?.backgroundColor || '#ffffff'}
                            onChange={(color) => updateQRConfig('backgroundColor', color)}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Typography Tab */}
                  <TabsContent value="typography" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Title Font</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <Label className="text-xs">Font Family</Label>
                          <Select
                            value={editedTemplate.font_config?.titleFont || 'helvetica-bold'}
                            onValueChange={(value) => updateFontConfig('titleFont', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="helvetica">Helvetica</SelectItem>
                              <SelectItem value="helvetica-bold">Helvetica Bold</SelectItem>
                              <SelectItem value="times">Times</SelectItem>
                              <SelectItem value="times-bold">Times Bold</SelectItem>
                              <SelectItem value="courier">Courier</SelectItem>
                              <SelectItem value="courier-bold">Courier Bold</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Font Size</Label>
                          <Slider
                            value={[editedTemplate.font_config?.titleSize || 24]}
                            onValueChange={([value]) => updateFontConfig('titleSize', value)}
                            min={12}
                            max={48}
                            step={1}
                            className="mt-2"
                          />
                          <span className="text-xs text-muted-foreground">
                            {editedTemplate.font_config?.titleSize || 24}pt
                          </span>
                        </div>
                        <div>
                          <Label className="text-xs">Color</Label>
                          <ColorPicker
                            color={editedTemplate.font_config?.titleColor || '#1f2937'}
                            onChange={(color) => updateFontConfig('titleColor', color)}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Body Font</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <Label className="text-xs">Font Family</Label>
                          <Select
                            value={editedTemplate.font_config?.bodyFont || 'helvetica'}
                            onValueChange={(value) => updateFontConfig('bodyFont', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="helvetica">Helvetica</SelectItem>
                              <SelectItem value="helvetica-bold">Helvetica Bold</SelectItem>
                              <SelectItem value="times">Times</SelectItem>
                              <SelectItem value="times-bold">Times Bold</SelectItem>
                              <SelectItem value="courier">Courier</SelectItem>
                              <SelectItem value="courier-bold">Courier Bold</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Font Size</Label>
                          <Slider
                            value={[editedTemplate.font_config?.bodySize || 12]}
                            onValueChange={([value]) => updateFontConfig('bodySize', value)}
                            min={8}
                            max={24}
                            step={1}
                            className="mt-2"
                          />
                          <span className="text-xs text-muted-foreground">
                            {editedTemplate.font_config?.bodySize || 12}pt
                          </span>
                        </div>
                        <div>
                          <Label className="text-xs">Color</Label>
                          <ColorPicker
                            color={editedTemplate.font_config?.bodyColor || '#4b5563'}
                            onChange={(color) => updateFontConfig('bodyColor', color)}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Label Font</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <Label className="text-xs">Font Family</Label>
                          <Select
                            value={editedTemplate.font_config?.labelFont || 'helvetica-bold'}
                            onValueChange={(value) => updateFontConfig('labelFont', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="helvetica">Helvetica</SelectItem>
                              <SelectItem value="helvetica-bold">Helvetica Bold</SelectItem>
                              <SelectItem value="times">Times</SelectItem>
                              <SelectItem value="times-bold">Times Bold</SelectItem>
                              <SelectItem value="courier">Courier</SelectItem>
                              <SelectItem value="courier-bold">Courier Bold</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Font Size</Label>
                          <Slider
                            value={[editedTemplate.font_config?.labelSize || 10]}
                            onValueChange={([value]) => updateFontConfig('labelSize', value)}
                            min={8}
                            max={18}
                            step={1}
                            className="mt-2"
                          />
                          <span className="text-xs text-muted-foreground">
                            {editedTemplate.font_config?.labelSize || 10}pt
                          </span>
                        </div>
                        <div>
                          <Label className="text-xs">Color</Label>
                          <ColorPicker
                            color={editedTemplate.font_config?.labelColor || '#6b7280'}
                            onChange={(color) => updateFontConfig('labelColor', color)}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Images Tab */}
                  <TabsContent value="images" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Background Image</CardTitle>
                        <CardDescription>Upload a background image for full-photo layouts</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {editedTemplate.background_image_url && (
                          <div className="relative">
                            <img
                              src={editedTemplate.background_image_url}
                              alt="Background"
                              className="w-full h-32 object-cover rounded"
                            />
                            <Button
                              size="sm"
                              variant="destructive"
                              className="absolute top-2 right-2"
                              onClick={() =>
                                setEditedTemplate({ ...editedTemplate, background_image_url: null })
                              }
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        <Button variant="outline" className="w-full">
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Background
                        </Button>
                        <div>
                          <Label className="text-xs">Opacity</Label>
                          <Slider
                            value={[(editedTemplate.background_opacity || 1) * 100]}
                            onValueChange={([value]) =>
                              setEditedTemplate({ ...editedTemplate, background_opacity: value / 100 })
                            }
                            max={100}
                            step={5}
                            className="mt-2"
                          />
                          <span className="text-xs text-muted-foreground">
                            {Math.round((editedTemplate.background_opacity || 1) * 100)}%
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Decorative Images</CardTitle>
                        <CardDescription>Add decorative elements to your template</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {editedTemplate.decorative_images?.map((img, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 border rounded">
                              <ImageIcon className="h-4 w-4" />
                              <span className="text-xs flex-1">{img.name || 'Decorative image'}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const newImages = [...(editedTemplate.decorative_images || [])]
                                  newImages.splice(index, 1)
                                  setEditedTemplate({ ...editedTemplate, decorative_images: newImages })
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        <Button variant="outline" className="w-full mt-3">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Decorative Image
                        </Button>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Border Tab */}
                  <TabsContent value="border" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Border Settings</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Enabled</Label>
                          <Switch
                            checked={editedTemplate.border_config?.enabled ?? false}
                            onCheckedChange={(checked) => updateBorderConfig('enabled', checked)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Style</Label>
                          <Select
                            value={editedTemplate.border_config?.style || 'solid'}
                            onValueChange={(value) => updateBorderConfig('style', value)}
                          >
                            <SelectTrigger>
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
                        <div>
                          <Label className="text-xs">Width</Label>
                          <Slider
                            value={[editedTemplate.border_config?.width || 2]}
                            onValueChange={([value]) => updateBorderConfig('width', value)}
                            min={1}
                            max={10}
                            step={1}
                            className="mt-2"
                          />
                          <span className="text-xs text-muted-foreground">
                            {editedTemplate.border_config?.width || 2}px
                          </span>
                        </div>
                        <div>
                          <Label className="text-xs">Color</Label>
                          <ColorPicker
                            color={editedTemplate.border_config?.color || '#e5e7eb'}
                            onChange={(color) => updateBorderConfig('color', color)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Corner Radius</Label>
                          <Slider
                            value={[editedTemplate.border_config?.cornerRadius || 0]}
                            onValueChange={([value]) => updateBorderConfig('cornerRadius', value)}
                            max={20}
                            step={1}
                            className="mt-2"
                          />
                          <span className="text-xs text-muted-foreground">
                            {editedTemplate.border_config?.cornerRadius || 0}px
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </ScrollArea>
            </div>

            {/* Right Panel - Preview */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Live Preview</h3>
                <Button variant="outline" size="sm" onClick={() => setShowPreview(true)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Full Preview
                </Button>
              </div>
              <div className="flex-1 border rounded-lg bg-gray-50 flex items-center justify-center overflow-auto p-4">
                <div
                  className="bg-white shadow-lg"
                  style={{
                    width: '595px',
                    height: '842px',
                    transform: 'scale(0.7)',
                    transformOrigin: 'top center',
                  }}
                >
                  <TemplatePreview template={editedTemplate} />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Template'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Preview Modal */}
      {showPreview && (
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Template Preview</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center p-4">
              <div
                className="bg-white shadow-lg"
                style={{
                  width: '595px',
                  height: '842px',
                }}
              >
                <TemplatePreview template={editedTemplate} />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
