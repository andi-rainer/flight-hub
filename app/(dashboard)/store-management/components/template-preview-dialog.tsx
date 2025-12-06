'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { PDFTemplate, TemplateElement, TextElement, CMSTextField, VoucherType } from '@/lib/types'
import { QrCode, Image as ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface TemplatePreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: PDFTemplate
  storeContent: any
}

export function TemplatePreviewDialog({
  open,
  onOpenChange,
  template,
  storeContent,
}: TemplatePreviewDialogProps) {
  const [language, setLanguage] = useState<'en' | 'de'>('en')
  const [voucherTypes, setVoucherTypes] = useState<VoucherType[]>([])
  const [selectedVoucherTypeId, setSelectedVoucherTypeId] = useState<string | null>(null)

  const canvasWidth = template.canvas_width || 595
  const canvasHeight = template.canvas_height || 842

  // Fetch voucher/ticket types when dialog opens
  useEffect(() => {
    if (open && template.template_type) {
      loadTypes()
    }
  }, [open, template.template_type])

  const loadTypes = async () => {
    const supabase = createClient()
    const tableName = template.template_type === 'voucher' ? 'voucher_types' : 'ticket_types'

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })

    if (!error && data) {
      setVoucherTypes(data as VoucherType[])
      // Auto-select first type
      if (data.length > 0 && !selectedVoucherTypeId) {
        setSelectedVoucherTypeId(data[0].id)
      }
    }
  }

  const selectedType = voucherTypes.find(v => v.id === selectedVoucherTypeId)

  // Mock data for preview with selected voucher/ticket data
  const mockData = {
    title: template.name,
    voucherCode: template.template_type === 'voucher' ? 'TANDEM-2025-1234' : 'TKT-2025-5678',
    validUntil: 'December 31, 2025',
    recipientName: 'John Doe',
    personalMessage: 'Wishing you an unforgettable adventure! Happy Birthday!',
  }

  const getCMSContent = (field: CMSTextField): string => {
    // Special handling for pdf_voucher_* fields - get from selected voucher/ticket type
    if (selectedType) {
      if (field === 'pdf_voucher_name') {
        if (language === 'de') {
          return selectedType.name_de || selectedType.name || `{${field}}`
        }
        return selectedType.name || `{${field}}`
      }

      if (field === 'pdf_voucher_description') {
        if (language === 'de') {
          return selectedType.description_de || selectedType.description || `{${field}}`
        }
        return selectedType.description || `{${field}}`
      }

      if (field === 'pdf_voucher_features') {
        // Format features as a bulleted list
        const features = selectedType.features as Array<{ text: string; text_de?: string }> || []
        if (features.length === 0) return `{${field}}`

        return features
          .map(f => `• ${language === 'de' ? (f.text_de || f.text) : f.text}`)
          .join('\n')
      }
    }

    if (!storeContent) return `{${field}}`

    // For German, try the _de suffix field first, otherwise fall back to English
    if (language === 'de') {
      const deField = `${field}_de`
      const fieldValue = storeContent[deField] || storeContent[field]
      return fieldValue || `{${field}}`
    }

    // For English, use the base field
    const fieldValue = storeContent[field]
    return fieldValue || `{${field}}`
  }

  const getTextLabel = (element: TextElement): string | null => {
    // CMS Label
    if (element.labelCmsField) {
      return getCMSContent(element.labelCmsField)
    }

    // Custom Label with language support
    if (language === 'de' && element.labelCustom_de) {
      return element.labelCustom_de
    }

    // Fallback to English label or old label field
    return element.labelCustom || element.label || null
  }

  const getTextContent = (element: TextElement): string => {
    // Dynamic field
    if (element.contentField) {
      return mockData[element.contentField] || `{${element.contentField}}`
    }

    // CMS field
    if (element.cmsField) {
      return getCMSContent(element.cmsField)
    }

    // Custom content with language support
    if (language === 'de' && element.content_de) {
      return element.content_de
    }

    // Fallback to English content
    return element.content || 'Text'
  }

  const renderElement = (element: TemplateElement) => {
    const commonStyle = {
      position: 'absolute' as const,
      left: `${element.x}px`,
      top: `${element.y}px`,
      zIndex: element.layer,
    }

    switch (element.type) {
      case 'text':
        const textElement = element as TextElement
        const label = getTextLabel(textElement)
        return (
          <div
            key={element.id}
            style={{
              ...commonStyle,
              width: `${textElement.width}px`,
              height: `${textElement.height}px`,
            }}
          >
            {label && (
              <div
                style={{
                  fontFamily: textElement.fontFamily,
                  fontWeight: '700',
                  fontSize: `${Math.max(8, textElement.fontSize * 0.7)}px`,
                  color: '#6b7280',
                  marginBottom: '4px',
                }}
              >
                {label}
              </div>
            )}
            <div
              style={{
                fontFamily: textElement.fontFamily,
                fontWeight: textElement.fontWeight,
                fontSize: `${textElement.fontSize}px`,
                color: textElement.color,
                textAlign: textElement.align || 'left',
                lineHeight: textElement.lineHeight || 1.5,
                overflow: 'hidden',
              }}
            >
              {getTextContent(textElement)}
            </div>
          </div>
        )

      case 'image':
      case 'logo':
        return (
          <div
            key={element.id}
            style={{
              ...commonStyle,
              width: `${element.width}px`,
              height: `${element.height}px`,
              borderRadius: `${element.type === 'image' && element.borderRadius ? element.borderRadius : 0}px`,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f3f4f6',
            }}
          >
            {element.url ? (
              <img
                src={element.url}
                alt={element.type}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: element.fit || 'contain',
                  opacity: element.opacity || 1,
                }}
              />
            ) : (
              <ImageIcon className="w-8 h-8 text-gray-400" />
            )}
          </div>
        )

      case 'qr':
        return (
          <div
            key={element.id}
            style={{
              ...commonStyle,
              width: `${element.size}px`,
              height: `${element.size}px`,
              borderRadius: `${element.borderRadius || 0}px`,
              backgroundColor: element.backgroundColor,
              border: `2px solid ${element.foregroundColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <QrCode className="w-3/4 h-3/4" style={{ color: element.foregroundColor }} />
          </div>
        )

      case 'line':
        return (
          <div
            key={element.id}
            style={{
              ...commonStyle,
              width: element.orientation === 'horizontal' ? `${element.length}px` : `${element.thickness}px`,
              height: element.orientation === 'horizontal' ? `${element.thickness}px` : `${element.length}px`,
              backgroundColor: element.color,
              borderStyle: element.style,
            }}
          />
        )

      default:
        return null
    }
  }

  const sortedElements = [...(template.elements || [])].sort((a, b) => a.layer - b.layer)

  // Calculate scale to fit in dialog - leave room for header and padding
  const maxWidth = 950 // max width for preview (accounting for dialog padding)
  const maxHeight = 700 // max height for preview
  const scaleX = maxWidth / canvasWidth
  const scaleY = maxHeight / canvasHeight
  const previewScale = Math.min(scaleX, scaleY, 1) // Don't scale up, only down

  const scaledWidth = canvasWidth * previewScale
  const scaledHeight = canvasHeight * previewScale

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 gap-0 max-w-[calc(100vw-4rem)]"
        style={{
          width: `${scaledWidth + 48}px`, // canvas width + padding
          maxWidth: '1200px'
        }}
      >
        <DialogHeader className="px-6 pt-6 pb-4 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle>Preview: {template.name}</DialogTitle>
              <div className="text-xs text-muted-foreground mt-1">
                Scale: {Math.round(previewScale * 100)}% | Canvas: {canvasWidth}x{canvasHeight}px
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={language === 'en' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLanguage('en')}
              >
                EN
              </Button>
              <Button
                variant={language === 'de' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLanguage('de')}
              >
                DE
              </Button>
            </div>
          </div>

          {/* Voucher/Ticket Type Selector */}
          {voucherTypes.length > 0 && (
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium whitespace-nowrap">
                {template.template_type === 'voucher' ? 'Voucher Type:' : 'Ticket Type:'}
              </Label>
              <Select
                value={selectedVoucherTypeId || undefined}
                onValueChange={setSelectedVoucherTypeId}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {voucherTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {language === 'de' ? (type.name_de || type.name) : type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </DialogHeader>
        <div className="px-6 pb-6">
          <div
            className="relative mx-auto"
            style={{
              width: `${scaledWidth}px`,
              height: `${scaledHeight}px`,
            }}
          >
            <div
              className="absolute shadow-2xl"
              style={{
                width: `${canvasWidth}px`,
                height: `${canvasHeight}px`,
                backgroundColor: template.layout_config?.backgroundColor || '#ffffff',
                backgroundImage: template.background_image_url ? `url(${template.background_image_url})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                border: template.border_config?.enabled
                  ? `${template.border_config.width}px ${template.border_config.style} ${template.border_config.color}`
                  : '2px solid #d1d5db',
                borderRadius: `${template.border_config?.cornerRadius || 0}px`,
                transform: `scale(${previewScale})`,
                transformOrigin: 'top left',
              }}
            >
              {sortedElements.map(renderElement)}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
