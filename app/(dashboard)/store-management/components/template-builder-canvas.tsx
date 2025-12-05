'use client'

import { useState, useRef, useEffect } from 'react'
import { TemplateElement, TextElement, ImageElement, QRElement, LineElement, LogoElement } from '@/lib/types'
import { QrCode, Type, Image as ImageIcon, Minus } from 'lucide-react'

interface TemplateBuilderCanvasProps {
  elements: TemplateElement[]
  canvasWidth: number
  canvasHeight: number
  backgroundColor?: string
  backgroundImage?: string
  backgroundOpacity?: number
  borderEnabled?: boolean
  borderWidth?: number
  borderColor?: string
  borderStyle?: string
  borderRadius?: number
  selectedElementId: string | null
  onSelectElement: (id: string | null) => void
  onUpdateElement: (id: string, updates: Partial<TemplateElement>) => void
  onElementDragEnd: (id: string, x: number, y: number) => void
  scale?: number
}

export function TemplateBuilderCanvas({
  elements,
  canvasWidth,
  canvasHeight,
  backgroundColor = '#ffffff',
  backgroundImage,
  backgroundOpacity = 1,
  borderEnabled = false,
  borderWidth = 2,
  borderColor = '#e5e7eb',
  borderStyle = 'solid',
  borderRadius = 0,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onElementDragEnd,
  scale = 1,
}: TemplateBuilderCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [draggingElement, setDraggingElement] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [resizing, setResizing] = useState<{ id: string; handle: string } | null>(null)

  const handleElementMouseDown = (e: React.MouseEvent, elementId: string, element: TemplateElement) => {
    e.stopPropagation()

    // Check if clicking on a resize handle
    const target = e.target as HTMLElement
    if (target.classList.contains('resize-handle')) {
      const handle = target.dataset.handle
      if (handle) {
        setResizing({ id: elementId, handle })
        return
      }
    }

    // Start dragging
    onSelectElement(elementId)
    setDraggingElement(elementId)
    setDragOffset({
      x: e.clientX - element.x * scale,
      y: e.clientY - element.y * scale,
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingElement) {
      const element = elements.find(el => el.id === draggingElement)
      if (!element || element.locked) return

      const newX = Math.max(0, Math.min((e.clientX - dragOffset.x) / scale, canvasWidth - (element.type === 'qr' ? (element as QRElement).size : ('width' in element ? element.width : 0))))
      const newY = Math.max(0, Math.min((e.clientY - dragOffset.y) / scale, canvasHeight - (element.type === 'qr' ? (element as QRElement).size : ('height' in element ? element.height : 0))))

      onUpdateElement(draggingElement, { x: newX, y: newY })
    } else if (resizing) {
      const element = elements.find(el => el.id === resizing.id)
      if (!element || element.locked) return

      if ('width' in element && 'height' in element) {
        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) return

        const mouseX = (e.clientX - rect.left) / scale
        const mouseY = (e.clientY - rect.top) / scale

        let newWidth = element.width
        let newHeight = element.height
        let newX = element.x
        let newY = element.y

        if (resizing.handle.includes('e')) {
          newWidth = Math.max(20, mouseX - element.x)
        }
        if (resizing.handle.includes('s')) {
          newHeight = Math.max(20, mouseY - element.y)
        }
        if (resizing.handle.includes('w')) {
          const deltaX = mouseX - element.x
          newWidth = Math.max(20, element.width - deltaX)
          newX = element.x + deltaX
        }
        if (resizing.handle.includes('n')) {
          const deltaY = mouseY - element.y
          newHeight = Math.max(20, element.height - deltaY)
          newY = element.y + deltaY
        }

        onUpdateElement(resizing.id, {
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        })
      } else if (element.type === 'qr') {
        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) return

        const mouseX = (e.clientX - rect.left) / scale
        const newSize = Math.max(50, mouseX - element.x)

        onUpdateElement(resizing.id, { size: newSize })
      } else if (element.type === 'line') {
        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) return

        const mouseX = (e.clientX - rect.left) / scale
        const mouseY = (e.clientY - rect.top) / scale

        if (element.orientation === 'horizontal') {
          const newLength = Math.max(10, mouseX - element.x)
          onUpdateElement(resizing.id, { length: newLength })
        } else {
          const newLength = Math.max(10, mouseY - element.y)
          onUpdateElement(resizing.id, { length: newLength })
        }
      }
    }
  }

  const handleMouseUp = () => {
    if (draggingElement) {
      const element = elements.find(el => el.id === draggingElement)
      if (element) {
        onElementDragEnd(draggingElement, element.x, element.y)
      }
      setDraggingElement(null)
    }
    setResizing(null)
  }

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      onSelectElement(null)
    }
  }

  const renderElement = (element: TemplateElement) => {
    const isSelected = element.id === selectedElementId
    const commonStyle = {
      position: 'absolute' as const,
      left: `${element.x}px`,
      top: `${element.y}px`,
      cursor: draggingElement === element.id ? 'grabbing' : element.locked ? 'not-allowed' : 'grab',
      border: isSelected ? '2px solid #3b82f6' : '1px solid transparent',
      zIndex: element.layer,
      opacity: element.locked ? 0.5 : 1,
    }

    switch (element.type) {
      case 'text':
        const labelText = element.labelCmsField
          ? `{CMS Label: ${element.labelCmsField}}`
          : (element.labelCustom || element.label || '')

        return (
          <div
            key={element.id}
            style={{
              ...commonStyle,
              width: `${element.width}px`,
              height: `${element.height}px`,
            }}
            onMouseDown={(e) => handleElementMouseDown(e, element.id, element)}
          >
            {labelText && (
              <div
                style={{
                  fontFamily: element.fontFamily,
                  fontWeight: '700',
                  fontSize: `${Math.max(8, element.fontSize * 0.7)}px`,
                  color: '#6b7280',
                  marginBottom: '4px',
                }}
              >
                {labelText}
              </div>
            )}
            <div
              style={{
                fontFamily: element.fontFamily,
                fontWeight: element.fontWeight,
                fontSize: `${element.fontSize}px`,
                color: element.color,
                textAlign: element.align || 'left',
                lineHeight: element.lineHeight || 1.5,
                overflow: 'hidden',
              }}
            >
              {element.content || (element.contentField ? `{${element.contentField}}` : element.cmsField ? `{CMS: ${element.cmsField}}` : 'Text')}
            </div>
            {isSelected && !element.locked && (
              <>
                <div className="resize-handle" data-handle="se" style={{ position: 'absolute', right: -4, bottom: -4, width: 8, height: 8, background: '#3b82f6', cursor: 'se-resize' }} />
                <div className="resize-handle" data-handle="ne" style={{ position: 'absolute', right: -4, top: -4, width: 8, height: 8, background: '#3b82f6', cursor: 'ne-resize' }} />
                <div className="resize-handle" data-handle="sw" style={{ position: 'absolute', left: -4, bottom: -4, width: 8, height: 8, background: '#3b82f6', cursor: 'sw-resize' }} />
                <div className="resize-handle" data-handle="nw" style={{ position: 'absolute', left: -4, top: -4, width: 8, height: 8, background: '#3b82f6', cursor: 'nw-resize' }} />
              </>
            )}
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
            onMouseDown={(e) => handleElementMouseDown(e, element.id, element)}
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
            {isSelected && !element.locked && (
              <>
                <div className="resize-handle" data-handle="se" style={{ position: 'absolute', right: -4, bottom: -4, width: 8, height: 8, background: '#3b82f6', cursor: 'se-resize' }} />
                <div className="resize-handle" data-handle="ne" style={{ position: 'absolute', right: -4, top: -4, width: 8, height: 8, background: '#3b82f6', cursor: 'ne-resize' }} />
                <div className="resize-handle" data-handle="sw" style={{ position: 'absolute', left: -4, bottom: -4, width: 8, height: 8, background: '#3b82f6', cursor: 'sw-resize' }} />
                <div className="resize-handle" data-handle="nw" style={{ position: 'absolute', left: -4, top: -4, width: 8, height: 8, background: '#3b82f6', cursor: 'nw-resize' }} />
              </>
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
            onMouseDown={(e) => handleElementMouseDown(e, element.id, element)}
          >
            <QrCode className="w-3/4 h-3/4" style={{ color: element.foregroundColor }} />
            {isSelected && !element.locked && (
              <div className="resize-handle" data-handle="se" style={{ position: 'absolute', right: -4, bottom: -4, width: 8, height: 8, background: '#3b82f6', cursor: 'se-resize' }} />
            )}
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
            onMouseDown={(e) => handleElementMouseDown(e, element.id, element)}
          >
            {isSelected && !element.locked && (
              <div
                className="resize-handle"
                data-handle="se"
                style={{
                  position: 'absolute',
                  right: element.orientation === 'horizontal' ? -4 : 'auto',
                  bottom: element.orientation === 'vertical' ? -4 : 'auto',
                  width: 8,
                  height: 8,
                  background: '#3b82f6',
                  cursor: element.orientation === 'horizontal' ? 'e-resize' : 's-resize',
                }}
              />
            )}
          </div>
        )

      default:
        return null
    }
  }

  // Sort elements by layer for rendering
  const sortedElements = [...elements].sort((a, b) => a.layer - b.layer)

  return (
    <div
      ref={canvasRef}
      className="relative shadow-lg mx-auto"
      style={{
        width: `${canvasWidth}px`,
        height: `${canvasHeight}px`,
        backgroundColor,
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundOpacity: backgroundOpacity,
        border: borderEnabled ? `${borderWidth}px ${borderStyle} ${borderColor}` : '2px solid #d1d5db',
        borderRadius: `${borderRadius}px`,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        cursor: 'default',
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
    >
      {sortedElements.map(renderElement)}
    </div>
  )
}
