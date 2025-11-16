'use client'

import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { Endorsement } from '@/lib/database.types'

export interface EndorsementSelection {
  endorsementId: string
  expiryDate: string | null
  hasIR: boolean
  irExpiryDate: string | null
}

interface EndorsementSelectorProps {
  value: EndorsementSelection[]
  onChange: (selections: EndorsementSelection[]) => void
  className?: string
  availableEndorsementIds?: string[] // Optional: if provided, only these endorsements can be selected
}

/**
 * EndorsementSelector Component
 *
 * Allows users to select endorsements/ratings with expiry dates and optional IR tracking
 * Shows IR options only for endorsements that support IR (supports_ir = true)
 *
 * @param availableEndorsementIds - If provided, only endorsements with these IDs will be shown
 *                                  If not provided, all active endorsements will be loaded
 */
export function EndorsementSelector({ value, onChange, className, availableEndorsementIds }: EndorsementSelectorProps) {
  const [endorsements, setEndorsements] = useState<Endorsement[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEndorsementId, setSelectedEndorsementId] = useState<string>('none')

  useEffect(() => {
    loadEndorsements()
  }, [availableEndorsementIds])

  const loadEndorsements = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/endorsements')
      const data = await response.json()

      if (response.ok) {
        let allEndorsements = data.endorsements || []

        // If availableEndorsementIds is provided, filter to only those endorsements
        if (availableEndorsementIds && availableEndorsementIds.length > 0) {
          allEndorsements = allEndorsements.filter((e: Endorsement) =>
            availableEndorsementIds.includes(e.id)
          )
        }

        setEndorsements(allEndorsements)
      }
    } catch (error) {
      console.error('Error loading endorsements:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    if (selectedEndorsementId === 'none') return

    // Check if already selected
    if (value.some((s) => s.endorsementId === selectedEndorsementId)) {
      return
    }

    const endorsement = endorsements.find((e) => e.id === selectedEndorsementId)
    if (!endorsement) return

    const newSelection: EndorsementSelection = {
      endorsementId: selectedEndorsementId,
      expiryDate: null,
      hasIR: false,
      irExpiryDate: null,
    }

    onChange([...value, newSelection])
    setSelectedEndorsementId('none')
  }

  const handleRemove = (endorsementId: string) => {
    onChange(value.filter((s) => s.endorsementId !== endorsementId))
  }

  const handleUpdate = (endorsementId: string, updates: Partial<EndorsementSelection>) => {
    onChange(
      value.map((s) =>
        s.endorsementId === endorsementId
          ? { ...s, ...updates }
          : s
      )
    )
  }

  // Get available endorsements (not yet selected)
  const availableEndorsements = endorsements.filter(
    (e) => !value.some((s) => s.endorsementId === e.id)
  )

  return (
    <div className={className}>
      <div className="space-y-4">
        {/* Add endorsement selector */}
        <div className="flex gap-2">
          <Select
            value={selectedEndorsementId}
            onValueChange={setSelectedEndorsementId}
            disabled={loading || availableEndorsements.length === 0}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={loading ? 'Loading...' : 'Select endorsement/rating'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Select endorsement/rating</SelectItem>
              {availableEndorsements.map((endorsement) => (
                <SelectItem key={endorsement.id} value={endorsement.id}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{endorsement.code}</span>
                    <span className="text-muted-foreground">-</span>
                    <span>{endorsement.name}</span>
                    {endorsement.supports_ir && (
                      <Badge variant="outline" className="text-xs ml-2">IR</Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            onClick={handleAdd}
            disabled={selectedEndorsementId === 'none'}
            size="icon"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Selected endorsements */}
        {value.length > 0 && (
          <div className="space-y-3">
            {value.map((selection) => {
              const endorsement = endorsements.find((e) => e.id === selection.endorsementId)
              if (!endorsement) return null

              return (
                <Card key={selection.endorsementId} className="p-4 space-y-3">
                  {/* Header with endorsement name and remove button */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge>{endorsement.code}</Badge>
                      <span className="font-medium text-sm">{endorsement.name}</span>
                      {endorsement.supports_ir && (
                        <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950">
                          IR Capable
                        </Badge>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(selection.endorsementId)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Main expiry date */}
                  <div className="space-y-2">
                    <Label htmlFor={`expiry-${selection.endorsementId}`} className="text-sm">
                      Expiry Date
                    </Label>
                    <Input
                      id={`expiry-${selection.endorsementId}`}
                      type="date"
                      value={selection.expiryDate || ''}
                      onChange={(e) =>
                        handleUpdate(selection.endorsementId, {
                          expiryDate: e.target.value || null,
                          // Default IR expiry to main expiry if IR is enabled
                          ...(selection.hasIR && !selection.irExpiryDate
                            ? { irExpiryDate: e.target.value || null }
                            : {}),
                        })
                      }
                    />
                  </div>

                  {/* IR section - only show if endorsement supports IR */}
                  {endorsement.supports_ir && (
                    <div className="pl-4 border-l-2 border-blue-500 space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`ir-${selection.endorsementId}`}
                          checked={selection.hasIR}
                          onCheckedChange={(checked) =>
                            handleUpdate(selection.endorsementId, {
                              hasIR: !!checked,
                              // Default IR expiry to main expiry when enabling IR
                              irExpiryDate: checked
                                ? selection.irExpiryDate || selection.expiryDate
                                : null,
                            })
                          }
                        />
                        <Label
                          htmlFor={`ir-${selection.endorsementId}`}
                          className="text-sm font-semibold cursor-pointer"
                        >
                          Has IR (Instrument Rating)
                        </Label>
                      </div>

                      {/* IR expiry date - only show if IR is enabled */}
                      {selection.hasIR && (
                        <div className="space-y-2">
                          <Label
                            htmlFor={`ir-expiry-${selection.endorsementId}`}
                            className="text-sm"
                          >
                            IR Expiry Date
                          </Label>
                          <Input
                            id={`ir-expiry-${selection.endorsementId}`}
                            type="date"
                            value={selection.irExpiryDate || ''}
                            onChange={(e) =>
                              handleUpdate(selection.endorsementId, {
                                irExpiryDate: e.target.value || null,
                              })
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            IR expiry can differ from main rating expiry
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}

        {value.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-4 border rounded-lg">
            No endorsements/ratings selected
          </div>
        )}
      </div>
    </div>
  )
}
