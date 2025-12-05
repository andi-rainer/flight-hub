'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { PDFTemplate, TemplateElement, TemplateAsset } from '@/lib/types'
import { getPDFTemplates, updatePDFTemplate } from '@/lib/actions/pdf-templates'
import { getStoreContent } from '@/lib/actions/store-content'
import { Save, Eye, ArrowLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'
import { TemplateBuilderCanvas } from '@/app/(dashboard)/store-management/components/template-builder-canvas'
import { ElementToolbar } from '@/app/(dashboard)/store-management/components/element-toolbar'
import { ElementPropertiesPanel } from '@/app/(dashboard)/store-management/components/element-properties-panel'
import { CanvasSettings } from '@/app/(dashboard)/store-management/components/canvas-settings'
import { AssetLibraryBrowser } from '@/app/(dashboard)/store-management/components/asset-library-browser'
import { TemplatePreviewDialog } from '@/app/(dashboard)/store-management/components/template-preview-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface TemplateEditorPageProps {
  templateId: string
}

export function TemplateEditorPage({ templateId }: TemplateEditorPageProps) {
  const router = useRouter()
  const [template, setTemplate] = useState<PDFTemplate | null>(null)
  const [storeContent, setStoreContent] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [scale, setScale] = useState(0.8)
  const [showAssetLibrary, setShowAssetLibrary] = useState(false)
  const [assetLibraryType, setAssetLibraryType] = useState<'logo' | 'image'>('image')
  const [showPreview, setShowPreview] = useState(false)

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
        // Initialize elements if not present
        if (!foundTemplate.elements) {
          foundTemplate.elements = []
        }
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
        name: template.name,
        description: template.description,
        elements: template.elements,
        canvas_width: template.canvas_width,
        canvas_height: template.canvas_height,
        background_image_url: template.background_image_url,
        background_opacity: template.background_opacity,
        background_position: template.background_position,
        font_config: template.font_config,
        border_config: template.border_config,
        layout_config: template.layout_config,
        show_recipient_name: template.show_recipient_name,
        show_cut_line: template.show_cut_line,
        page_height_percentage: template.page_height_percentage,
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

  const handleAddElement = (element: TemplateElement) => {
    if (!template) return
    setTemplate({
      ...template,
      elements: [...(template.elements || []), element],
    })
    setSelectedElementId(element.id)
  }

  const handleUpdateElement = (id: string, updates: Partial<TemplateElement>) => {
    if (!template) return
    setTemplate({
      ...template,
      elements: (template.elements || []).map((el) =>
        el.id === id ? { ...el, ...updates } as TemplateElement : el
      ),
    })
  }

  const handleDeleteElement = (id: string) => {
    if (!template) return
    setTemplate({
      ...template,
      elements: (template.elements || []).filter((el) => el.id !== id),
    })
    if (selectedElementId === id) {
      setSelectedElementId(null)
    }
  }

  const handleMoveLayer = (id: string, direction: 'up' | 'down') => {
    if (!template) return
    const elements = template.elements || []
    const element = elements.find((el) => el.id === id)
    if (!element) return

    const newLayer = direction === 'up' ? element.layer + 1 : element.layer - 1
    handleUpdateElement(id, { layer: newLayer })
  }

  const handleShowAssetLibrary = (type: 'logo' | 'image') => {
    setAssetLibraryType(type)
    setShowAssetLibrary(true)
  }

  const handleAssetSelect = (assets: TemplateAsset[]) => {
    if (!template || assets.length === 0) return

    const currentMaxLayer = Math.max(0, ...(template.elements || []).map(el => el.layer))
    const newElements: TemplateElement[] = assets.map((asset, index) => ({
      id: `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: assetLibraryType,
      x: 50 + index * 20,
      y: 50 + index * 20,
      layer: currentMaxLayer + 1 + index,
      width: 150,
      height: 150,
      url: asset.file_url,
      opacity: 1,
      fit: 'contain' as const,
    }))

    setTemplate({
      ...template,
      elements: [...(template.elements || []), ...newElements],
    })

    setShowAssetLibrary(false)
    toast.success(`${assets.length} ${assetLibraryType}(s) added`)
  }

  const handleCanvasHeightChange = (percentage: number) => {
    if (!template) return
    const newHeight = Math.round(842 * (percentage / 100))
    setTemplate({
      ...template,
      canvas_height: newHeight,
      page_height_percentage: percentage,
    })
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

  const selectedElement = (template.elements || []).find((el) => el.id === selectedElementId) || null
  const canvasWidth = template.canvas_width || 595
  const canvasHeight = template.canvas_height || 842
  const maxLayer = Math.max(0, ...(template.elements || []).map(el => el.layer))

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
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
        {/* Left Panel - Toolbar */}
        <div className="w-[280px] border-r bg-muted/30">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              <ElementToolbar
                onAddElement={handleAddElement}
                onShowAssetLibrary={handleShowAssetLibrary}
                maxLayer={maxLayer}
              />
              <CanvasSettings
                backgroundColor={template.layout_config?.backgroundColor || '#ffffff'}
                borderEnabled={template.border_config?.enabled ?? false}
                borderWidth={template.border_config?.width || 2}
                borderColor={template.border_config?.color || '#e5e7eb'}
                borderStyle={template.border_config?.style || 'solid'}
                borderRadius={template.border_config?.cornerRadius || 0}
                onUpdateSettings={(settings) => {
                  setTemplate({
                    ...template,
                    layout_config: {
                      ...template.layout_config,
                      backgroundColor: settings.backgroundColor ?? template.layout_config?.backgroundColor,
                    },
                    border_config: {
                      ...template.border_config,
                      enabled: settings.borderEnabled ?? template.border_config?.enabled ?? false,
                      width: settings.borderWidth ?? template.border_config?.width ?? 2,
                      color: settings.borderColor ?? template.border_config?.color ?? '#e5e7eb',
                      style: settings.borderStyle ?? template.border_config?.style ?? 'solid',
                      cornerRadius: settings.borderRadius ?? template.border_config?.cornerRadius ?? 0,
                      decorative: false,
                    },
                  })
                }}
              />
            </div>
          </ScrollArea>
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 flex flex-col bg-gray-100">
          {/* Canvas Toolbar */}
          <div className="border-b bg-background px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setScale(Math.max(0.25, scale - 0.1))}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[60px] text-center">
                    {Math.round(scale * 100)}%
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setScale(Math.min(2, scale + 0.1))}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-xs">Canvas Height:</Label>
                  <Slider
                    value={[template.page_height_percentage || 100]}
                    onValueChange={([value]) => handleCanvasHeightChange(value)}
                    min={30}
                    max={100}
                    step={5}
                    className="w-32"
                  />
                  <span className="text-xs text-muted-foreground min-w-[60px]">
                    {template.page_height_percentage || 100}%
                  </span>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                {(template.elements || []).length} element(s)
              </div>
            </div>

            {/* Template Name and Description */}
            <div className="flex items-center gap-4">
              <div className="flex-1 max-w-xs">
                <Label className="text-xs mb-1 block">Template Name</Label>
                <Input
                  value={template.name || ''}
                  onChange={(e) => setTemplate({ ...template, name: e.target.value })}
                  className="h-8"
                  placeholder="Template name..."
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs mb-1 block">Description (optional)</Label>
                <Input
                  value={template.description || ''}
                  onChange={(e) => setTemplate({ ...template, description: e.target.value })}
                  className="h-8"
                  placeholder="Brief description..."
                />
              </div>
            </div>
          </div>

          {/* Canvas */}
          <ScrollArea className="flex-1">
            <div className="p-8">
              <TemplateBuilderCanvas
                elements={template.elements || []}
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
                backgroundColor={template.layout_config?.backgroundColor || '#ffffff'}
                backgroundImage={template.background_image_url || undefined}
                backgroundOpacity={template.background_opacity || 1}
                borderEnabled={template.border_config?.enabled ?? false}
                borderWidth={template.border_config?.width || 2}
                borderColor={template.border_config?.color || '#e5e7eb'}
                borderStyle={template.border_config?.style || 'solid'}
                borderRadius={template.border_config?.cornerRadius || 0}
                selectedElementId={selectedElementId}
                onSelectElement={setSelectedElementId}
                onUpdateElement={handleUpdateElement}
                onElementDragEnd={handleUpdateElement}
                scale={scale}
              />
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Properties */}
        <div className="w-[320px] border-l bg-muted/30">
          <ScrollArea className="h-full">
            <div className="p-4">
              <ElementPropertiesPanel
                element={selectedElement}
                onUpdateElement={handleUpdateElement}
                onDeleteElement={handleDeleteElement}
                onMoveLayer={handleMoveLayer}
              />
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Preview Dialog */}
      <TemplatePreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        template={template}
        storeContent={storeContent}
      />

      {/* Asset Library Dialog */}
      <Dialog open={showAssetLibrary} onOpenChange={setShowAssetLibrary}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Select {assetLibraryType === 'logo' ? 'Logo' : 'Image'}</DialogTitle>
          </DialogHeader>
          <AssetLibraryBrowser
            filterType={assetLibraryType}
            onSelect={handleAssetSelect}
            multiSelect={assetLibraryType === 'image'}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
