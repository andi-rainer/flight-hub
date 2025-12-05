'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { PDFTemplate } from '@/lib/types'
import { getPDFTemplates, updatePDFTemplate } from '@/lib/actions/pdf-templates'
import { getStoreContent } from '@/lib/actions/store-content'
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
  Plus,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react'
import { TemplatePreview } from '@/app/(dashboard)/store-management/components/template-preview'
import { ColorPicker } from '@/app/(dashboard)/store-management/components/color-picker'
import { AssetLibraryBrowser } from '@/app/(dashboard)/store-management/components/asset-library-browser'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TemplateAsset } from '@/lib/types'

interface TemplateEditorPageProps {
  templateId: string
}

export function TemplateEditorPage({ templateId }: TemplateEditorPageProps) {
  const router = useRouter()
  const [template, setTemplate] = useState<PDFTemplate | null>(null)
  const [storeContent, setStoreContent] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showLogoLibrary, setShowLogoLibrary] = useState(false)
  const [showBackgroundLibrary, setShowBackgroundLibrary] = useState(false)
  const [showDecorativeLibrary, setShowDecorativeLibrary] = useState(false)

  useEffect(() => {
    loadTemplate()
    loadStoreContent()
  }, [templateId])

  const loadStoreContent = async () => {
    const result = await getStoreContent()
    if (result.success && result.data) {
      setStoreContent(result.data)
    }
  }

  const loadTemplate = async () => {
    setIsLoading(true)
    const result = await getPDFTemplates()
    if (result.success && result.data) {
      const foundTemplate = result.data.find((t) => t.id === templateId)
      if (foundTemplate) {
        setTemplate(foundTemplate)
      } else {
        toast.error('Template not found')
        router.push('/store-management?tab=templates')
      }
    } else {
      toast.error(result.error || 'Failed to load template')
    }
    setIsLoading(false)
  }

  const handleSave = async () => {
    if (!template) return

    setIsSaving(true)
    try {
      const result = await updatePDFTemplate(template.id, {
        layout_type: template.layout_type,
        background_image_url: template.background_image_url,
        background_opacity: template.background_opacity,
        background_position: template.background_position,
        logo_url: template.logo_url,
        logo_position: template.logo_position,
        logo_enabled: template.logo_enabled,
        text_overlay_enabled: template.text_overlay_enabled,
        text_overlay_color: template.text_overlay_color,
        text_overlay_position: template.text_overlay_position,
        decorative_images: template.decorative_images,
        qr_config: template.qr_config,
        font_config: template.font_config,
        border_config: template.border_config,
        content_zones: template.content_zones,
        page_config: template.page_config,
        layout_config: template.layout_config,
      })

      if (result.success) {
        toast.success('Template saved successfully')
        router.push('/store-management?tab=templates')
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
    if (!template) return
    setTemplate({
      ...template,
      layout_config: {
        ...template.layout_config,
        [key]: value,
      },
    })
  }

  const updateFontConfig = (key: string, value: any) => {
    if (!template) return
    setTemplate({
      ...template,
      font_config: {
        ...template.font_config,
        [key]: value,
      },
    })
  }

  const updateBorderConfig = (key: string, value: any) => {
    if (!template) return
    setTemplate({
      ...template,
      border_config: {
        ...template.border_config,
        [key]: value,
      },
    })
  }

  const updateQRConfig = (key: string, value: any) => {
    if (!template) return
    setTemplate({
      ...template,
      qr_config: {
        ...template.qr_config,
        [key]: value,
      },
    })
  }

  const updateLogoPosition = (key: string, value: number) => {
    if (!template) return
    setTemplate({
      ...template,
      logo_position: {
        ...template.logo_position,
        [key]: value,
      },
    })
  }

  const handleLogoSelect = (asset: TemplateAsset) => {
    if (!template) return
    setTemplate({
      ...template,
      logo_url: asset.file_url,
    })
    setShowLogoLibrary(false)
    toast.success('Logo selected')
  }

  const handleBackgroundSelect = (asset: TemplateAsset) => {
    if (!template) return
    setTemplate({
      ...template,
      background_image_url: asset.file_url,
    })
    setShowBackgroundLibrary(false)
    toast.success('Background image selected')
  }

  const handleDecorativeSelect = (assets: TemplateAsset[]) => {
    if (!template) return
    const newImages = assets.map((asset, index) => ({
      url: asset.file_url,
      x: 50 + index * 20,
      y: 200 + index * 20,
      width: 100,
      height: 100,
      name: asset.name,
    }))
    setTemplate({
      ...template,
      decorative_images: [...(template.decorative_images || []), ...newImages],
    })
    setShowDecorativeLibrary(false)
    toast.success(`${assets.length} decorative image(s) added`)
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading template...</p>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Template not found</p>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header with Breadcrumbs */}
      <div className="border-b bg-background">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/store-management?tab=templates')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span
                className="hover:text-foreground cursor-pointer"
                onClick={() => router.push('/store-management')}
              >
                Store Management
              </span>
              <ChevronRight className="h-4 w-4" />
              <span
                className="hover:text-foreground cursor-pointer"
                onClick={() => router.push('/store-management?tab=templates')}
              >
                PDF Templates
              </span>
              <ChevronRight className="h-4 w-4" />
              <span className="text-foreground font-medium">{template.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowPreview(true)}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Template'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Configuration */}
        <div className="w-[400px] border-r bg-muted/30">
          <ScrollArea className="h-full">
            <div className="p-6">
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
                <TabsContent value="layout" className="space-y-4 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Layout Type</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Select
                        value={template.layout_type || 'ticket'}
                        onValueChange={(value: any) =>
                          setTemplate({ ...template, layout_type: value })
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
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Enabled</Label>
                        <Switch
                          checked={template.logo_enabled ?? true}
                          onCheckedChange={(checked) =>
                            setTemplate({ ...template, logo_enabled: checked })
                          }
                        />
                      </div>
                      {template.logo_url && (
                        <div className="relative">
                          <img
                            src={template.logo_url}
                            alt="Logo"
                            className="w-full h-32 object-contain rounded border"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            className="absolute top-2 right-2"
                            onClick={() =>
                              setTemplate({ ...template, logo_url: null })
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowLogoLibrary(true)}
                      >
                        <ImageIcon className="h-4 w-4 mr-2" />
                        {template.logo_url ? 'Change Logo' : 'Select Logo'}
                      </Button>
                      <div className="space-y-2">
                        <Label className="text-sm">X Position</Label>
                        <Slider
                          value={[template.logo_position?.x || 50]}
                          onValueChange={([value]) => updateLogoPosition('x', value)}
                          max={500}
                          step={5}
                        />
                        <span className="text-xs text-muted-foreground">
                          {template.logo_position?.x || 50}px
                        </span>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Y Position</Label>
                        <Slider
                          value={[template.logo_position?.y || 30]}
                          onValueChange={([value]) => updateLogoPosition('y', value)}
                          max={800}
                          step={5}
                        />
                        <span className="text-xs text-muted-foreground">
                          {template.logo_position?.y || 30}px
                        </span>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Width</Label>
                        <Slider
                          value={[template.logo_position?.width || 120]}
                          onValueChange={([value]) => updateLogoPosition('width', value)}
                          max={300}
                          step={5}
                        />
                        <span className="text-xs text-muted-foreground">
                          {template.logo_position?.width || 120}px
                        </span>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Height</Label>
                        <Slider
                          value={[template.logo_position?.height || 60]}
                          onValueChange={([value]) => updateLogoPosition('height', value)}
                          max={200}
                          step={5}
                        />
                        <span className="text-xs text-muted-foreground">
                          {template.logo_position?.height || 60}px
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">QR Code</CardTitle>
                      <CardDescription>Configure QR code placement</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Position</Label>
                        <Select
                          value={template.qr_config?.position || 'right'}
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
                      <div className="space-y-2">
                        <Label className="text-sm">Size</Label>
                        <Slider
                          value={[template.qr_config?.size || 80]}
                          onValueChange={([value]) => updateQRConfig('size', value)}
                          min={50}
                          max={150}
                          step={5}
                        />
                        <span className="text-xs text-muted-foreground">
                          {template.qr_config?.size || 80}px
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Colors Tab */}
                <TabsContent value="colors" className="space-y-4 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Background Colors</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Primary Color</Label>
                        <ColorPicker
                          color={template.layout_config?.primaryColor || '#3b82f6'}
                          onChange={(color) => updateLayoutConfig('primaryColor', color)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Secondary Color</Label>
                        <ColorPicker
                          color={template.layout_config?.secondaryColor || '#8b5cf6'}
                          onChange={(color) => updateLayoutConfig('secondaryColor', color)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Accent Color</Label>
                        <ColorPicker
                          color={template.layout_config?.accentColor || '#10b981'}
                          onChange={(color) => updateLayoutConfig('accentColor', color)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Background Color</Label>
                        <ColorPicker
                          color={template.layout_config?.backgroundColor || '#ffffff'}
                          onChange={(color) => updateLayoutConfig('backgroundColor', color)}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">QR Code Colors</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Foreground</Label>
                        <ColorPicker
                          color={template.qr_config?.foregroundColor || '#000000'}
                          onChange={(color) => updateQRConfig('foregroundColor', color)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Background</Label>
                        <ColorPicker
                          color={template.qr_config?.backgroundColor || '#ffffff'}
                          onChange={(color) => updateQRConfig('backgroundColor', color)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Typography Tab */}
                <TabsContent value="typography" className="space-y-4 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Title Font</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Font Family</Label>
                        <Select
                          value={template.font_config?.titleFont || 'helvetica-bold'}
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
                      <div className="space-y-2">
                        <Label className="text-sm">Font Size</Label>
                        <Slider
                          value={[template.font_config?.titleSize || 24]}
                          onValueChange={([value]) => updateFontConfig('titleSize', value)}
                          min={12}
                          max={48}
                          step={1}
                        />
                        <span className="text-xs text-muted-foreground">
                          {template.font_config?.titleSize || 24}pt
                        </span>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Color</Label>
                        <ColorPicker
                          color={template.font_config?.titleColor || '#1f2937'}
                          onChange={(color) => updateFontConfig('titleColor', color)}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Body Font</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Font Family</Label>
                        <Select
                          value={template.font_config?.bodyFont || 'helvetica'}
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
                      <div className="space-y-2">
                        <Label className="text-sm">Font Size</Label>
                        <Slider
                          value={[template.font_config?.bodySize || 12]}
                          onValueChange={([value]) => updateFontConfig('bodySize', value)}
                          min={8}
                          max={24}
                          step={1}
                        />
                        <span className="text-xs text-muted-foreground">
                          {template.font_config?.bodySize || 12}pt
                        </span>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Color</Label>
                        <ColorPicker
                          color={template.font_config?.bodyColor || '#4b5563'}
                          onChange={(color) => updateFontConfig('bodyColor', color)}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Label Font</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Font Family</Label>
                        <Select
                          value={template.font_config?.labelFont || 'helvetica-bold'}
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
                      <div className="space-y-2">
                        <Label className="text-sm">Font Size</Label>
                        <Slider
                          value={[template.font_config?.labelSize || 10]}
                          onValueChange={([value]) => updateFontConfig('labelSize', value)}
                          min={8}
                          max={18}
                          step={1}
                        />
                        <span className="text-xs text-muted-foreground">
                          {template.font_config?.labelSize || 10}pt
                        </span>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Color</Label>
                        <ColorPicker
                          color={template.font_config?.labelColor || '#6b7280'}
                          onChange={(color) => updateFontConfig('labelColor', color)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Images Tab */}
                <TabsContent value="images" className="space-y-4 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Background Image</CardTitle>
                      <CardDescription>Upload a background image for full-photo layouts</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {template.background_image_url && (
                        <div className="relative">
                          <img
                            src={template.background_image_url}
                            alt="Background"
                            className="w-full h-32 object-cover rounded"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            className="absolute top-2 right-2"
                            onClick={() =>
                              setTemplate({ ...template, background_image_url: null })
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowBackgroundLibrary(true)}
                      >
                        <ImageIcon className="h-4 w-4 mr-2" />
                        {template.background_image_url ? 'Change Background' : 'Select Background'}
                      </Button>
                      <div className="space-y-2">
                        <Label className="text-sm">Opacity</Label>
                        <Slider
                          value={[(template.background_opacity || 1) * 100]}
                          onValueChange={([value]) =>
                            setTemplate({ ...template, background_opacity: value / 100 })
                          }
                          max={100}
                          step={5}
                        />
                        <span className="text-xs text-muted-foreground">
                          {Math.round((template.background_opacity || 1) * 100)}%
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
                        {template.decorative_images?.map((img, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 border rounded">
                            <ImageIcon className="h-4 w-4" />
                            <span className="text-xs flex-1">{img.name || 'Decorative image'}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const newImages = [...(template.decorative_images || [])]
                                newImages.splice(index, 1)
                                setTemplate({ ...template, decorative_images: newImages })
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        className="w-full mt-3"
                        onClick={() => setShowDecorativeLibrary(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Decorative Images
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Border Tab */}
                <TabsContent value="border" className="space-y-4 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Border Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Enabled</Label>
                        <Switch
                          checked={template.border_config?.enabled ?? false}
                          onCheckedChange={(checked) => updateBorderConfig('enabled', checked)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Style</Label>
                        <Select
                          value={template.border_config?.style || 'solid'}
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
                      <div className="space-y-2">
                        <Label className="text-sm">Width</Label>
                        <Slider
                          value={[template.border_config?.width || 2]}
                          onValueChange={([value]) => updateBorderConfig('width', value)}
                          min={1}
                          max={10}
                          step={1}
                        />
                        <span className="text-xs text-muted-foreground">
                          {template.border_config?.width || 2}px
                        </span>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Color</Label>
                        <ColorPicker
                          color={template.border_config?.color || '#e5e7eb'}
                          onChange={(color) => updateBorderConfig('color', color)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Corner Radius</Label>
                        <Slider
                          value={[template.border_config?.cornerRadius || 0]}
                          onValueChange={([value]) => updateBorderConfig('cornerRadius', value)}
                          max={20}
                          step={1}
                        />
                        <span className="text-xs text-muted-foreground">
                          {template.border_config?.cornerRadius || 0}px
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Preview */}
        <div className="flex-1 flex flex-col bg-gray-50">
          <div className="p-6">
            <div className="flex items-center justify-center">
              <div
                className="bg-white shadow-2xl"
                style={{
                  width: '595px',
                  height: '842px',
                  transform: 'scale(0.85)',
                  transformOrigin: 'top center',
                }}
              >
                <TemplatePreview template={template} storeContent={storeContent} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full Preview Modal */}
      {showPreview && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8"
          onClick={() => setShowPreview(false)}
        >
          <div className="relative">
            <Button
              variant="secondary"
              className="absolute -top-12 right-0"
              onClick={() => setShowPreview(false)}
            >
              Close
            </Button>
            <div
              className="bg-white shadow-2xl"
              style={{
                width: '595px',
                height: '842px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <TemplatePreview template={template} storeContent={storeContent} />
            </div>
          </div>
        </div>
      )}

      {/* Logo Library Dialog */}
      <Dialog open={showLogoLibrary} onOpenChange={setShowLogoLibrary}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Select Logo</DialogTitle>
          </DialogHeader>
          <AssetLibraryBrowser
            filterType="logo"
            allowMultiple={false}
            onSelectAsset={handleLogoSelect}
          />
        </DialogContent>
      </Dialog>

      {/* Background Library Dialog */}
      <Dialog open={showBackgroundLibrary} onOpenChange={setShowBackgroundLibrary}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Select Background Image</DialogTitle>
          </DialogHeader>
          <AssetLibraryBrowser
            filterType="background"
            allowMultiple={false}
            onSelectAsset={handleBackgroundSelect}
          />
        </DialogContent>
      </Dialog>

      {/* Decorative Images Library Dialog */}
      <Dialog open={showDecorativeLibrary} onOpenChange={setShowDecorativeLibrary}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Select Decorative Images</DialogTitle>
          </DialogHeader>
          <AssetLibraryBrowser
            filterType="decorative"
            allowMultiple={true}
            onSelectAsset={handleDecorativeSelect}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
