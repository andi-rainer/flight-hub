'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Type, Image, QrCode, Minus, FileImage, FileText } from 'lucide-react'
import { TemplateElement, TextElement, QRElement, LineElement, CMSTextField, DynamicTextField } from '@/lib/types'

interface ElementToolbarProps {
  onAddElement: (element: TemplateElement) => void
  onShowAssetLibrary: (type: 'logo' | 'image') => void
  maxLayer: number
}

export function ElementToolbar({ onAddElement, onShowAssetLibrary, maxLayer }: ElementToolbarProps) {
  const generateId = () => `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const nextLayer = maxLayer + 1

  const addTextElement = (contentField?: DynamicTextField, cmsField?: CMSTextField) => {
    const element: TextElement = {
      id: generateId(),
      type: 'text',
      x: 50,
      y: 50,
      layer: nextLayer,
      width: 200,
      height: 40,
      content: contentField || cmsField ? null : 'New Text',
      contentField,
      cmsField,
      label: contentField ? contentField.toUpperCase() : undefined,
      fontSize: 14,
      fontFamily: 'Arial, sans-serif',
      fontWeight: '400',
      color: '#000000',
      align: 'left',
    }
    onAddElement(element)
  }

  const addImageElement = () => {
    onShowAssetLibrary('image')
  }

  const addLogoElement = () => {
    onShowAssetLibrary('logo')
  }

  const addQRElement = () => {
    const element: QRElement = {
      id: generateId(),
      type: 'qr',
      x: 450,
      y: 200,
      layer: nextLayer,
      size: 80,
      backgroundColor: '#ffffff',
      foregroundColor: '#000000',
      borderRadius: 0,
      includeMargin: true,
    }
    onAddElement(element)
  }

  const addLineElement = (orientation: 'horizontal' | 'vertical') => {
    const element: LineElement = {
      id: generateId(),
      type: 'line',
      x: 50,
      y: 50,
      layer: nextLayer,
      orientation,
      length: orientation === 'horizontal' ? 200 : 100,
      thickness: 2,
      color: '#000000',
      style: 'solid',
    }
    onAddElement(element)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-sm">Add Elements</CardTitle>
        <CardDescription>Click to add elements to the canvas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Text Elements */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground">Text</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-auto py-2 flex flex-col items-center gap-1"
              onClick={() => addTextElement()}
            >
              <Type className="h-4 w-4" />
              <span className="text-xs">Custom Text</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-auto py-2 flex flex-col items-center gap-1"
              onClick={() => addTextElement(undefined, 'pdf_voucher_description')}
            >
              <FileText className="h-4 w-4" />
              <span className="text-xs">CMS Text</span>
            </Button>
          </div>
        </div>

        <Separator />

        {/* Dynamic Fields */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground">Dynamic Fields</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-auto py-2 flex flex-col items-center gap-1"
              onClick={() => addTextElement('voucherCode')}
            >
              <Type className="h-4 w-4" />
              <span className="text-xs">Voucher Code</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-auto py-2 flex flex-col items-center gap-1"
              onClick={() => addTextElement('validUntil')}
            >
              <Type className="h-4 w-4" />
              <span className="text-xs">Valid Until</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-auto py-2 flex flex-col items-center gap-1"
              onClick={() => addTextElement('recipientName')}
            >
              <Type className="h-4 w-4" />
              <span className="text-xs">Recipient</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-auto py-2 flex flex-col items-center gap-1"
              onClick={() => addTextElement('personalMessage')}
            >
              <Type className="h-4 w-4" />
              <span className="text-xs">Personal Message</span>
            </Button>
          </div>
        </div>

        <Separator />

        {/* Images */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground">Images</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-auto py-2 flex flex-col items-center gap-1"
              onClick={addLogoElement}
            >
              <FileImage className="h-4 w-4" />
              <span className="text-xs">Logo</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-auto py-2 flex flex-col items-center gap-1"
              onClick={addImageElement}
            >
              <Image className="h-4 w-4" />
              <span className="text-xs">Image</span>
            </Button>
          </div>
        </div>

        <Separator />

        {/* QR Code */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground">QR Code</h4>
          <Button
            variant="outline"
            size="sm"
            className="w-full h-auto py-2 flex flex-col items-center gap-1"
            onClick={addQRElement}
          >
            <QrCode className="h-4 w-4" />
            <span className="text-xs">QR Code</span>
          </Button>
        </div>

        <Separator />

        {/* Lines */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground">Lines</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-auto py-2 flex flex-col items-center gap-1"
              onClick={() => addLineElement('horizontal')}
            >
              <Minus className="h-4 w-4" />
              <span className="text-xs">Horizontal</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-auto py-2 flex flex-col items-center gap-1"
              onClick={() => addLineElement('vertical')}
            >
              <Minus className="h-4 w-4 rotate-90" />
              <span className="text-xs">Vertical</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
