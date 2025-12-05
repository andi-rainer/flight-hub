'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Trash2, Lock, Unlock, ArrowUp, ArrowDown } from 'lucide-react'
import { TemplateElement, TextElement, ImageElement, QRElement, LineElement, LogoElement, CMSTextField, DynamicTextField } from '@/lib/types'
import { ColorPicker } from './color-picker'

const CMS_FIELD_LABELS: Record<CMSTextField, string> = {
  pdf_voucher_description: 'Voucher Description',
  pdf_contact_phone: 'Contact Phone',
  pdf_contact_email: 'Contact Email',
  pdf_contact_website: 'Contact Website',
  pdf_contact_address: 'Contact Address',
  pdf_label_voucher_code: 'Label: Voucher Code',
  pdf_label_booking_code: 'Label: Booking Code',
  pdf_label_valid_until: 'Label: Valid Until',
  pdf_label_redeem_instructions: 'Label: Redeem Instructions',
  pdf_label_terms: 'Label: Terms',
  pdf_label_personal_message: 'Label: Personal Message',
  pdf_label_from: 'Label: From',
}

interface ElementPropertiesPanelProps {
  element: TemplateElement | null
  onUpdateElement: (id: string, updates: Partial<TemplateElement>) => void
  onDeleteElement: (id: string) => void
  onMoveLayer: (id: string, direction: 'up' | 'down') => void
}

export function ElementPropertiesPanel({
  element,
  onUpdateElement,
  onDeleteElement,
  onMoveLayer,
}: ElementPropertiesPanelProps) {
  if (!element) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-sm">Properties</CardTitle>
          <CardDescription>Select an element to edit its properties</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No element selected
          </p>
        </CardContent>
      </Card>
    )
  }

  const renderCommonProperties = () => (
    <>
      {/* Position */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs">X Position</Label>
          <Input
            type="number"
            value={element.x}
            onChange={(e) => onUpdateElement(element.id, { x: parseInt(e.target.value) || 0 })}
            className="h-8"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Y Position</Label>
          <Input
            type="number"
            value={element.y}
            onChange={(e) => onUpdateElement(element.id, { y: parseInt(e.target.value) || 0 })}
            className="h-8"
          />
        </div>
      </div>

      {/* Layer */}
      <div className="space-y-2">
        <Label className="text-xs">Layer</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={element.layer}
            onChange={(e) => onUpdateElement(element.id, { layer: parseInt(e.target.value) || 0 })}
            className="h-8 flex-1"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => onMoveLayer(element.id, 'up')}
          >
            <ArrowUp className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onMoveLayer(element.id, 'down')}
          >
            <ArrowDown className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Lock */}
      <div className="flex items-center justify-between">
        <Label className="text-xs">Locked</Label>
        <Switch
          checked={element.locked || false}
          onCheckedChange={(checked) => onUpdateElement(element.id, { locked: checked })}
        />
      </div>

      <Separator />
    </>
  )

  const renderTextProperties = () => {
    const textElement = element as TextElement
    const contentType = textElement.cmsField ? 'cms' : (textElement.contentField ? 'dynamic' : 'custom')

    return (
      <>
        {/* Content Type */}
        <div className="space-y-2">
          <Label className="text-xs">Content Type</Label>
          <Select
            value={contentType}
            onValueChange={(value) => {
              if (value === 'custom') {
                onUpdateElement(element.id, {
                  contentField: undefined,
                  cmsField: undefined,
                  content: 'New Text',
                })
              } else if (value === 'dynamic') {
                onUpdateElement(element.id, {
                  contentField: 'voucherCode' as DynamicTextField,
                  cmsField: undefined,
                  content: null,
                })
              } else if (value === 'cms') {
                onUpdateElement(element.id, {
                  contentField: undefined,
                  cmsField: 'pdf_voucher_description' as CMSTextField,
                  content: null,
                })
              }
            }}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="custom">Custom Text</SelectItem>
              <SelectItem value="dynamic">Dynamic Field</SelectItem>
              <SelectItem value="cms">CMS Text</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Dynamic Field Selector */}
        {textElement.contentField && (
          <div className="space-y-2">
            <Label className="text-xs">Dynamic Field</Label>
            <Select
              value={textElement.contentField}
              onValueChange={(value) =>
                onUpdateElement(element.id, { contentField: value as DynamicTextField })
              }
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="title">Title (template name)</SelectItem>
                <SelectItem value="voucherCode">Voucher Code</SelectItem>
                <SelectItem value="validUntil">Valid Until</SelectItem>
                <SelectItem value="recipientName">Recipient Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* CMS Field Selector */}
        {textElement.cmsField && (
          <div className="space-y-2">
            <Label className="text-xs">CMS Field</Label>
            <Select
              value={textElement.cmsField}
              onValueChange={(value) =>
                onUpdateElement(element.id, { cmsField: value as CMSTextField })
              }
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CMS_FIELD_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Custom Content with bilingual support */}
        {!textElement.contentField && !textElement.cmsField && (
          <>
            <div className="space-y-2">
              <Label className="text-xs">Text Content (English)</Label>
              <Textarea
                value={textElement.content || ''}
                onChange={(e) => onUpdateElement(element.id, { content: e.target.value })}
                rows={2}
                className="text-sm"
                placeholder="English text..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Text Content (German)</Label>
              <Textarea
                value={textElement.content_de || ''}
                onChange={(e) => onUpdateElement(element.id, { content_de: e.target.value })}
                rows={2}
                className="text-sm"
                placeholder="Deutscher Text..."
              />
            </div>
          </>
        )}

        <Separator />

        {/* Label Type */}
        <div className="space-y-2">
          <Label className="text-xs">Label Type</Label>
          <Select
            value={textElement.labelCmsField ? 'cms' : 'custom'}
            onValueChange={(value) => {
              if (value === 'custom') {
                onUpdateElement(element.id, {
                  labelCmsField: undefined,
                  labelCustom: textElement.label || '',
                })
              } else {
                onUpdateElement(element.id, {
                  labelCmsField: 'pdf_label_voucher_code' as CMSTextField,
                  labelCustom: undefined,
                  labelCustom_de: undefined,
                })
              }
            }}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="custom">Custom Label</SelectItem>
              <SelectItem value="cms">CMS Label</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* CMS Label Selector */}
        {textElement.labelCmsField && (
          <div className="space-y-2">
            <Label className="text-xs">CMS Label Field</Label>
            <Select
              value={textElement.labelCmsField}
              onValueChange={(value) =>
                onUpdateElement(element.id, { labelCmsField: value as CMSTextField })
              }
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CMS_FIELD_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Custom Label with bilingual support */}
        {!textElement.labelCmsField && (
          <>
            <div className="space-y-2">
              <Label className="text-xs">Label (English)</Label>
              <Input
                value={textElement.labelCustom || textElement.label || ''}
                onChange={(e) => onUpdateElement(element.id, { labelCustom: e.target.value, label: undefined })}
                placeholder="e.g., VOUCHER CODE"
                className="h-8"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Label (German)</Label>
              <Input
                value={textElement.labelCustom_de || ''}
                onChange={(e) => onUpdateElement(element.id, { labelCustom_de: e.target.value })}
                placeholder="z.B. GUTSCHEINCODE"
                className="h-8"
              />
            </div>
          </>
        )}

        {/* Size */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs">Width</Label>
            <Input
              type="number"
              value={textElement.width}
              onChange={(e) => onUpdateElement(element.id, { width: parseInt(e.target.value) || 0 })}
              className="h-8"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Height</Label>
            <Input
              type="number"
              value={textElement.height}
              onChange={(e) => onUpdateElement(element.id, { height: parseInt(e.target.value) || 0 })}
              className="h-8"
            />
          </div>
        </div>

        {/* Font Size */}
        <div className="space-y-2">
          <Label className="text-xs">Font Size: {textElement.fontSize}px</Label>
          <Slider
            value={[textElement.fontSize]}
            onValueChange={([value]) => onUpdateElement(element.id, { fontSize: value })}
            min={8}
            max={72}
            step={1}
          />
        </div>

        {/* Font Family */}
        <div className="space-y-2">
          <Label className="text-xs">Font Family</Label>
          <Select
            value={textElement.fontFamily}
            onValueChange={(value) => onUpdateElement(element.id, { fontFamily: value })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Arial, sans-serif">Arial</SelectItem>
              <SelectItem value="Times New Roman, serif">Times New Roman</SelectItem>
              <SelectItem value="Courier New, monospace">Courier New</SelectItem>
              <SelectItem value="Georgia, serif">Georgia</SelectItem>
              <SelectItem value="Verdana, sans-serif">Verdana</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Font Weight */}
        <div className="space-y-2">
          <Label className="text-xs">Font Weight</Label>
          <Select
            value={textElement.fontWeight}
            onValueChange={(value) => onUpdateElement(element.id, { fontWeight: value })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="400">Normal</SelectItem>
              <SelectItem value="600">Semi-Bold</SelectItem>
              <SelectItem value="700">Bold</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Text Align */}
        <div className="space-y-2">
          <Label className="text-xs">Text Align</Label>
          <Select
            value={textElement.align || 'left'}
            onValueChange={(value) => onUpdateElement(element.id, { align: value as 'left' | 'center' | 'right' })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Color */}
        <div className="space-y-2">
          <Label className="text-xs">Text Color</Label>
          <ColorPicker
            color={textElement.color}
            onChange={(color) => onUpdateElement(element.id, { color })}
          />
        </div>
      </>
    )
  }

  const renderImageProperties = () => {
    const imageElement = element as ImageElement | LogoElement
    return (
      <>
        {/* Size */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs">Width</Label>
            <Input
              type="number"
              value={imageElement.width}
              onChange={(e) => onUpdateElement(element.id, { width: parseInt(e.target.value) || 0 })}
              className="h-8"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Height</Label>
            <Input
              type="number"
              value={imageElement.height}
              onChange={(e) => onUpdateElement(element.id, { height: parseInt(e.target.value) || 0 })}
              className="h-8"
            />
          </div>
        </div>

        {/* Image URL */}
        <div className="space-y-2">
          <Label className="text-xs">Image URL</Label>
          <Input
            value={imageElement.url || ''}
            onChange={(e) => onUpdateElement(element.id, { url: e.target.value })}
            placeholder="https://..."
            className="h-8"
          />
        </div>

        {/* Fit */}
        <div className="space-y-2">
          <Label className="text-xs">Fit</Label>
          <Select
            value={imageElement.fit || 'contain'}
            onValueChange={(value) => onUpdateElement(element.id, { fit: value as 'contain' | 'cover' | 'fill' })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="contain">Contain</SelectItem>
              <SelectItem value="cover">Cover</SelectItem>
              <SelectItem value="fill">Fill</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Opacity */}
        <div className="space-y-2">
          <Label className="text-xs">Opacity: {Math.round((imageElement.opacity || 1) * 100)}%</Label>
          <Slider
            value={[(imageElement.opacity || 1) * 100]}
            onValueChange={([value]) => onUpdateElement(element.id, { opacity: value / 100 })}
            min={0}
            max={100}
            step={5}
          />
        </div>

        {/* Border Radius (for images only) */}
        {element.type === 'image' && (
          <div className="space-y-2">
            <Label className="text-xs">Border Radius: {(element as ImageElement).borderRadius || 0}px</Label>
            <Slider
              value={[(element as ImageElement).borderRadius || 0]}
              onValueChange={([value]) => onUpdateElement(element.id, { borderRadius: value })}
              min={0}
              max={50}
              step={1}
            />
          </div>
        )}
      </>
    )
  }

  const renderQRProperties = () => {
    const qrElement = element as QRElement
    return (
      <>
        {/* Size */}
        <div className="space-y-2">
          <Label className="text-xs">Size</Label>
          <Input
            type="number"
            value={qrElement.size}
            onChange={(e) => onUpdateElement(element.id, { size: parseInt(e.target.value) || 0 })}
            className="h-8"
          />
        </div>

        {/* Colors */}
        <div className="space-y-2">
          <Label className="text-xs">Background Color</Label>
          <ColorPicker
            color={qrElement.backgroundColor}
            onChange={(color) => onUpdateElement(element.id, { backgroundColor: color })}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Foreground Color</Label>
          <ColorPicker
            color={qrElement.foregroundColor}
            onChange={(color) => onUpdateElement(element.id, { foregroundColor: color })}
          />
        </div>

        {/* Border Radius */}
        <div className="space-y-2">
          <Label className="text-xs">Border Radius: {qrElement.borderRadius || 0}px</Label>
          <Slider
            value={[qrElement.borderRadius || 0]}
            onValueChange={([value]) => onUpdateElement(element.id, { borderRadius: value })}
            min={0}
            max={20}
            step={1}
          />
        </div>
      </>
    )
  }

  const renderLineProperties = () => {
    const lineElement = element as LineElement
    return (
      <>
        {/* Orientation */}
        <div className="space-y-2">
          <Label className="text-xs">Orientation</Label>
          <Select
            value={lineElement.orientation}
            onValueChange={(value) => onUpdateElement(element.id, { orientation: value as 'horizontal' | 'vertical' })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="horizontal">Horizontal</SelectItem>
              <SelectItem value="vertical">Vertical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Length */}
        <div className="space-y-2">
          <Label className="text-xs">Length</Label>
          <Input
            type="number"
            value={lineElement.length}
            onChange={(e) => onUpdateElement(element.id, { length: parseInt(e.target.value) || 0 })}
            className="h-8"
          />
        </div>

        {/* Thickness */}
        <div className="space-y-2">
          <Label className="text-xs">Thickness: {lineElement.thickness}px</Label>
          <Slider
            value={[lineElement.thickness]}
            onValueChange={([value]) => onUpdateElement(element.id, { thickness: value })}
            min={1}
            max={20}
            step={1}
          />
        </div>

        {/* Style */}
        <div className="space-y-2">
          <Label className="text-xs">Style</Label>
          <Select
            value={lineElement.style}
            onValueChange={(value) => onUpdateElement(element.id, { style: value as 'solid' | 'dashed' | 'dotted' })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="solid">Solid</SelectItem>
              <SelectItem value="dashed">Dashed</SelectItem>
              <SelectItem value="dotted">Dotted</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Color */}
        <div className="space-y-2">
          <Label className="text-xs">Color</Label>
          <ColorPicker
            color={lineElement.color}
            onChange={(color) => onUpdateElement(element.id, { color })}
          />
        </div>
      </>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Properties</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-1"
            onClick={() => onDeleteElement(element.id)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </CardTitle>
        <CardDescription className="capitalize">{element.type} Element</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderCommonProperties()}

        {element.type === 'text' && renderTextProperties()}
        {(element.type === 'image' || element.type === 'logo') && renderImageProperties()}
        {element.type === 'qr' && renderQRProperties()}
        {element.type === 'line' && renderLineProperties()}
      </CardContent>
    </Card>
  )
}
