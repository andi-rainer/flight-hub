'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, X } from 'lucide-react'

interface Privilege {
  endorsementId?: string
  customName?: string
  expiryDate?: string
  name: string // For display
  code?: string // For display
}

interface DocumentEndorsement {
  id: string
  name: string
  code: string | null
  description: string | null
}

interface DocumentSubcategory {
  id: string
  name: string
  code: string | null
}

interface DocumentPrivilegeSelectorProps {
  categoryId: string | null
  subcategoryId?: string | null
  requiresEndorsements: boolean
  onPrivilegesChange: (privileges: Privilege[]) => void
  onSubcategoryChange?: (subcategoryId: string | null) => void
  disabled?: boolean
}

export function DocumentPrivilegeSelector({
  categoryId,
  subcategoryId,
  requiresEndorsements,
  onPrivilegesChange,
  onSubcategoryChange,
  disabled = false,
}: DocumentPrivilegeSelectorProps) {
  const [subcategories, setSubcategories] = useState<DocumentSubcategory[]>([])
  const [endorsements, setEndorsements] = useState<DocumentEndorsement[]>([])
  const [privileges, setPrivileges] = useState<Privilege[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Form state for adding a new privilege
  const [selectedEndorsement, setSelectedEndorsement] = useState<string>('')
  const [customEndorsementName, setCustomEndorsementName] = useState('')
  const [privilegeExpiryDate, setPrivilegeExpiryDate] = useState('')
  const [isCustomEndorsement, setIsCustomEndorsement] = useState(false)

  useEffect(() => {
    if (categoryId && requiresEndorsements) {
      loadCategoryData()
    } else {
      setSubcategories([])
      setEndorsements([])
      setPrivileges([])
      onPrivilegesChange([])
    }
  }, [categoryId, requiresEndorsements])

  const loadCategoryData = async () => {
    if (!categoryId) return

    setIsLoading(true)
    try {
      // Load subcategories and endorsements for this category
      const [subcategoriesRes, endorsementsRes] = await Promise.all([
        fetch(`/api/documents/subcategories?categoryId=${categoryId}`),
        fetch(`/api/documents/endorsements?categoryId=${categoryId}`),
      ])

      if (subcategoriesRes.ok) {
        const data = await subcategoriesRes.json()
        setSubcategories(data.subcategories || [])
      }

      if (endorsementsRes.ok) {
        const data = await endorsementsRes.json()
        setEndorsements(data.endorsements || [])
      }
    } catch (error) {
      console.error('Error loading category data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddPrivilege = () => {
    if (isCustomEndorsement) {
      if (!customEndorsementName.trim()) return

      const newPrivilege: Privilege = {
        customName: customEndorsementName.trim(),
        expiryDate: privilegeExpiryDate || undefined,
        name: customEndorsementName.trim(),
      }

      const updated = [...privileges, newPrivilege]
      setPrivileges(updated)
      onPrivilegesChange(updated)

      // Reset form
      setCustomEndorsementName('')
      setPrivilegeExpiryDate('')
      setIsCustomEndorsement(false)
    } else {
      if (!selectedEndorsement) return

      const endorsement = endorsements.find((e) => e.id === selectedEndorsement)
      if (!endorsement) return

      const newPrivilege: Privilege = {
        endorsementId: selectedEndorsement,
        expiryDate: privilegeExpiryDate || undefined,
        name: endorsement.name,
        code: endorsement.code || undefined,
      }

      const updated = [...privileges, newPrivilege]
      setPrivileges(updated)
      onPrivilegesChange(updated)

      // Reset form
      setSelectedEndorsement('')
      setPrivilegeExpiryDate('')
    }
  }

  const handleRemovePrivilege = (index: number) => {
    const updated = privileges.filter((_, i) => i !== index)
    setPrivileges(updated)
    onPrivilegesChange(updated)
  }

  if (!requiresEndorsements || !categoryId) {
    return null
  }

  return (
    <div className="space-y-4 border-t pt-4">
      <div>
        <h4 className="text-sm font-medium mb-3">Privileges / Endorsements</h4>

        {/* Subcategory Selection */}
        {subcategories.length > 0 && (
          <div className="space-y-2 mb-4">
            <Label htmlFor="subcategory">Subcategory</Label>
            <Select
              value={subcategoryId || 'none'}
              onValueChange={(value) => onSubcategoryChange?.(value === 'none' ? null : value)}
              disabled={disabled}
            >
              <SelectTrigger id="subcategory">
                <SelectValue placeholder="Select subcategory (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {subcategories.map((sub) => (
                  <SelectItem key={sub.id} value={sub.id}>
                    {sub.name} {sub.code && `(${sub.code})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Add Privilege Section */}
        <div className="space-y-3 p-3 border rounded-md bg-muted/30">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={!isCustomEndorsement ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setIsCustomEndorsement(false)}
              disabled={disabled}
            >
              Select Endorsement
            </Button>
            <Button
              type="button"
              variant={isCustomEndorsement ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setIsCustomEndorsement(true)}
              disabled={disabled}
            >
              Custom Endorsement
            </Button>
          </div>

          {isCustomEndorsement ? (
            <div className="space-y-2">
              <Label htmlFor="custom-endorsement">Custom Endorsement Name</Label>
              <Input
                id="custom-endorsement"
                placeholder="e.g., Type Rating A320"
                value={customEndorsementName}
                onChange={(e) => setCustomEndorsementName(e.target.value)}
                disabled={disabled}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="endorsement">Select Endorsement</Label>
              <Select
                value={selectedEndorsement}
                onValueChange={setSelectedEndorsement}
                disabled={disabled || isLoading}
              >
                <SelectTrigger id="endorsement">
                  <SelectValue placeholder="Choose an endorsement" />
                </SelectTrigger>
                <SelectContent>
                  {endorsements.map((endorsement) => (
                    <SelectItem key={endorsement.id} value={endorsement.id}>
                      {endorsement.name}
                      {endorsement.code && ` (${endorsement.code})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="privilege-expiry">Expiry Date (Optional)</Label>
            <Input
              id="privilege-expiry"
              type="date"
              value={privilegeExpiryDate}
              onChange={(e) => setPrivilegeExpiryDate(e.target.value)}
              disabled={disabled}
            />
          </div>

          <Button
            type="button"
            size="sm"
            onClick={handleAddPrivilege}
            disabled={
              disabled ||
              (isCustomEndorsement
                ? !customEndorsementName.trim()
                : !selectedEndorsement)
            }
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Privilege
          </Button>
        </div>

        {/* List of Added Privileges */}
        {privileges.length > 0 && (
          <div className="mt-4 space-y-2">
            <Label>Added Privileges ({privileges.length})</Label>
            <div className="space-y-2">
              {privileges.map((privilege, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 border rounded-md bg-background"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{privilege.name}</span>
                    {privilege.code && (
                      <Badge variant="outline" className="text-xs">
                        {privilege.code}
                      </Badge>
                    )}
                    {privilege.customName && (
                      <Badge variant="secondary" className="text-xs">
                        Custom
                      </Badge>
                    )}
                    {privilege.expiryDate && (
                      <span className="text-xs text-muted-foreground">
                        Expires: {new Date(privilege.expiryDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemovePrivilege(index)}
                    disabled={disabled}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
