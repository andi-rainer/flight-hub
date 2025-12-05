'use client'

import { PDFTemplate } from '@/lib/types'
import { QrCode } from 'lucide-react'

interface TemplatePreviewProps {
  template: PDFTemplate
  storeContent?: {
    pdf_voucher_description?: string
    pdf_voucher_description_de?: string
    pdf_label_voucher_code?: string
    pdf_label_booking_code?: string
    pdf_label_valid_until?: string
    pdf_label_redeem_instructions?: string
    pdf_label_terms?: string
    pdf_label_personal_message?: string
    pdf_label_from?: string
  } | null
}

export function TemplatePreview({ template, storeContent }: TemplatePreviewProps) {
  const layoutType = template.layout_type || 'ticket'
  const backgroundColor = template.layout_config?.backgroundColor || '#ffffff'
  const primaryColor = template.layout_config?.primaryColor || '#3b82f6'
  const titleFont = template.font_config?.titleFont || 'helvetica-bold'
  const titleSize = template.font_config?.titleSize || 24
  const titleColor = template.font_config?.titleColor || '#1f2937'
  const bodyFont = template.font_config?.bodyFont || 'helvetica'
  const bodySize = template.font_config?.bodySize || 12
  const bodyColor = template.font_config?.bodyColor || '#4b5563'
  const labelFont = template.font_config?.labelFont || 'helvetica-bold'
  const labelSize = template.font_config?.labelSize || 10
  const labelColor = template.font_config?.labelColor || '#6b7280'
  const borderEnabled = template.border_config?.enabled ?? false
  const borderWidth = template.border_config?.width || 2
  const borderColor = template.border_config?.color || '#e5e7eb'
  const borderRadius = template.border_config?.cornerRadius || 0
  const borderStyle = template.border_config?.style || 'solid'
  const logoPosition = template.logo_position || { x: 50, y: 30, width: 120, height: 60 }
  const logoEnabled = template.logo_enabled ?? true
  const qrConfig = template.qr_config || {
    position: 'right',
    x: 450,
    y: 200,
    size: 80,
    backgroundColor: '#ffffff',
    foregroundColor: '#000000',
  }

  // Calculate QR position based on position preset
  const getQRPosition = () => {
    const size = qrConfig.size || 80
    const padding = 20

    switch (qrConfig.position) {
      case 'right':
        return {
          left: `${595 - size - padding}px`,
          top: `${200}px`,
        }
      case 'bottom':
        return {
          left: `${595 - size - padding}px`,
          top: `${842 - size - padding - 60}px`, // 60px for footer
        }
      case 'center':
        return {
          left: `${(595 - size) / 2}px`,
          top: `${(842 - size) / 2}px`,
        }
      default:
        // Use custom x/y if provided
        return {
          left: `${qrConfig.x}px`,
          top: `${qrConfig.y}px`,
        }
    }
  }

  const qrPosition = getQRPosition()

  const fontFamilyMap: Record<string, string> = {
    'helvetica': 'Arial, sans-serif',
    'helvetica-bold': 'Arial, sans-serif',
    'times': 'Times New Roman, serif',
    'times-bold': 'Times New Roman, serif',
    'courier': 'Courier New, monospace',
    'courier-bold': 'Courier New, monospace',
  }

  const getFontFamily = (font: string) => fontFamilyMap[font] || 'Arial, sans-serif'
  const getFontWeight = (font: string) => font.includes('bold') ? '700' : '400'

  // Use CMS labels or fallback to defaults
  const labels = {
    voucherCode: storeContent?.pdf_label_voucher_code || 'VOUCHER CODE',
    validUntil: storeContent?.pdf_label_valid_until || 'VALID UNTIL',
    recipient: 'RECIPIENT', // This could be added to CMS if needed
  }

  // Get voucher description from CMS or use default
  const voucherDescription = storeContent?.pdf_voucher_description ||
    'Experience the thrill of a tandem skydive from 12,000 feet with our professional instructors. This voucher includes all equipment, training, and an unforgettable freefall experience.'

  // Calculate page height for ticket-style vouchers
  const pageHeight = template.page_height_percentage
    ? (842 * (template.page_height_percentage / 100))
    : 842

  // Get text zone positions or use defaults
  const textZones = template.text_zones || {}
  const descriptionZone = textZones.description || { x: 60, y: 260, width: 475, height: 100, fontSize: 12 }
  const recipientZone = textZones.recipient || { x: 60, y: 200, fontSize: 12 }
  const voucherCodeZone = textZones.voucherCode || { x: 60, y: 150, fontSize: 12 }
  const validUntilZone = textZones.validUntil || { x: 60, y: 180, fontSize: 12 }

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        backgroundColor,
        border: borderEnabled ? `${borderWidth}px ${borderStyle} ${borderColor}` : 'none',
        borderRadius: `${borderRadius}px`,
        height: `${pageHeight}px`,
      }}
    >
      {/* Background Image (for full-photo layout) */}
      {layoutType === 'full-photo' && template.background_image_url && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${template.background_image_url})`,
            opacity: template.background_opacity || 1,
          }}
        />
      )}

      {/* Text Overlay (for full-photo layout) */}
      {layoutType === 'full-photo' && template.text_overlay_enabled && (
        <div
          className="absolute"
          style={{
            left: template.text_overlay_position?.x || 0,
            top: template.text_overlay_position?.y || 500,
            width: template.text_overlay_position?.width || '100%',
            height: template.text_overlay_position?.height || 342,
            backgroundColor: template.text_overlay_color || 'rgba(0,0,0,0.5)',
          }}
        />
      )}

      {/* Logo */}
      {logoEnabled && (
        <div
          className="absolute flex items-center justify-center bg-gray-100 border border-gray-300 rounded overflow-hidden"
          style={{
            left: `${logoPosition.x}px`,
            top: `${logoPosition.y}px`,
            width: `${logoPosition.width}px`,
            height: `${logoPosition.height}px`,
          }}
        >
          {template.logo_url ? (
            <img
              src={template.logo_url}
              alt="Logo"
              className="w-full h-full object-contain"
            />
          ) : (
            <span className="text-xs text-gray-400">LOGO</span>
          )}
        </div>
      )}

      {/* Decorative Images */}
      {template.decorative_images?.map((img, index) => (
        <div
          key={index}
          className="absolute bg-gray-100 border border-gray-300 rounded overflow-hidden flex items-center justify-center"
          style={{
            left: `${img.x}px`,
            top: `${img.y}px`,
            width: `${img.width}px`,
            height: `${img.height}px`,
          }}
        >
          {img.url ? (
            <img
              src={img.url}
              alt={img.name || 'Decorative image'}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xs text-gray-400">{img.name || 'Image'}</span>
          )}
        </div>
      ))}

      {/* Title */}
      <h1
        className="absolute"
        style={{
          left: '60px',
          top: layoutType === 'full-photo' ? '530px' : '30px',
          fontFamily: getFontFamily(titleFont),
          fontWeight: getFontWeight(titleFont),
          fontSize: `${titleSize}px`,
          color: titleColor,
          margin: 0,
        }}
      >
        {template.name}
      </h1>

      {/* Voucher Code */}
      <div
        className="absolute"
        style={{
          left: `${voucherCodeZone.x}px`,
          top: `${voucherCodeZone.y}px`,
        }}
      >
        <div
          style={{
            fontFamily: getFontFamily(labelFont),
            fontWeight: getFontWeight(labelFont),
            fontSize: `${labelSize}px`,
            color: labelColor,
            marginBottom: '4px',
          }}
        >
          {labels.voucherCode}
        </div>
        <div
          style={{
            fontFamily: getFontFamily(bodyFont),
            fontWeight: getFontWeight(bodyFont),
            fontSize: `${voucherCodeZone.fontSize || bodySize}px`,
            color: bodyColor,
          }}
        >
          TANDEM-2025-XXXX
        </div>
      </div>

      {/* Valid Until */}
      <div
        className="absolute"
        style={{
          left: `${validUntilZone.x}px`,
          top: `${validUntilZone.y}px`,
        }}
      >
        <div
          style={{
            fontFamily: getFontFamily(labelFont),
            fontWeight: getFontWeight(labelFont),
            fontSize: `${labelSize}px`,
            color: labelColor,
            marginBottom: '4px',
          }}
        >
          {labels.validUntil}
        </div>
        <div
          style={{
            fontFamily: getFontFamily(bodyFont),
            fontWeight: getFontWeight(bodyFont),
            fontSize: `${validUntilZone.fontSize || bodySize}px`,
            color: bodyColor,
          }}
        >
          December 31, 2025
        </div>
      </div>

      {/* Recipient Name (if enabled) */}
      {template.show_recipient_name && (
        <div
          className="absolute"
          style={{
            left: `${recipientZone.x}px`,
            top: `${recipientZone.y}px`,
          }}
        >
          <div
            style={{
              fontFamily: getFontFamily(labelFont),
              fontWeight: getFontWeight(labelFont),
              fontSize: `${labelSize}px`,
              color: labelColor,
              marginBottom: '4px',
            }}
          >
            {labels.recipient}
          </div>
          <div
            style={{
              fontFamily: getFontFamily(bodyFont),
              fontWeight: getFontWeight(bodyFont),
              fontSize: `${recipientZone.fontSize || bodySize}px`,
              color: bodyColor,
            }}
          >
            John Doe
          </div>
        </div>
      )}

      {/* Voucher Description */}
      <div
        className="absolute"
        style={{
          left: `${descriptionZone.x}px`,
          top: `${descriptionZone.y}px`,
          width: `${descriptionZone.width}px`,
          height: `${descriptionZone.height}px`,
        }}
      >
        <div
          style={{
            fontFamily: getFontFamily(bodyFont),
            fontWeight: getFontWeight(bodyFont),
            fontSize: `${descriptionZone.fontSize || bodySize}px`,
            color: bodyColor,
            lineHeight: '1.6',
          }}
        >
          {voucherDescription}
        </div>
      </div>

      {/* QR Code */}
      <div
        className="absolute flex items-center justify-center rounded"
        style={{
          ...qrPosition,
          width: `${qrConfig.size}px`,
          height: `${qrConfig.size}px`,
          backgroundColor: qrConfig.backgroundColor,
          border: `2px solid ${qrConfig.foregroundColor}`,
        }}
      >
        <QrCode
          className="w-3/4 h-3/4"
          style={{ color: qrConfig.foregroundColor }}
        />
      </div>

      {/* Footer */}
      <div
        className="absolute"
        style={{
          left: '60px',
          bottom: '40px',
          right: '60px',
        }}
      >
        <div
          style={{
            fontFamily: getFontFamily(bodyFont),
            fontWeight: getFontWeight(bodyFont),
            fontSize: `${bodySize - 2}px`,
            color: labelColor,
            textAlign: 'center',
          }}
        >
          www.your-skydive-club.com | info@your-skydive-club.com
        </div>
      </div>

      {/* Cut Line (for ticket-style vouchers) */}
      {template.show_cut_line && (
        <div
          className="absolute left-0 right-0 flex items-center"
          style={{
            bottom: '-15px',
            borderBottom: '1px dashed #999',
          }}
        >
          <div
            className="absolute left-1/2 transform -translate-x-1/2 bg-white px-2"
            style={{
              fontSize: '8px',
              color: '#999',
              bottom: '-4px',
            }}
          >
            ✂ CUT HERE
          </div>
        </div>
      )}

      {/* Layout Type Badge (for preview only) */}
      <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
        {layoutType.charAt(0).toUpperCase() + layoutType.slice(1)} Layout
        {template.page_height_percentage && template.page_height_percentage < 100 && (
          <span className="ml-1">({template.page_height_percentage}% height)</span>
        )}
      </div>
    </div>
  )
}
