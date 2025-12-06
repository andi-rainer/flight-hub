'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createPDFTemplate } from '@/lib/actions/pdf-templates'
import { Loader2 } from 'lucide-react'

interface CreateTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateTemplateDialog({ open, onOpenChange }: CreateTemplateDialogProps) {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    template_type: 'voucher' as 'voucher' | 'ticket',
  })

  const handleCreate = async () => {
    // Validate
    if (!formData.name.trim()) {
      toast.error('Please enter a template name')
      return
    }

    if (!formData.code.trim()) {
      toast.error('Please enter a template code')
      return
    }

    setIsCreating(true)
    try {
      const result = await createPDFTemplate(formData)

      if (result.success && result.data) {
        toast.success('Template created successfully')
        onOpenChange(false)

        // Reset form
        setFormData({
          name: '',
          code: '',
          description: '',
          template_type: 'voucher',
        })

        // Redirect to template editor
        router.push(`/store-management?tab=pdf-templates&template=${result.data.id}`)
      } else {
        toast.error(result.error || 'Failed to create template')
      }
    } catch (error) {
      console.error('Error creating template:', error)
      toast.error('Failed to create template')
    } finally {
      setIsCreating(false)
    }
  }

  const generateCode = () => {
    if (formData.name) {
      const code = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      setFormData({ ...formData, code })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create PDF Template</DialogTitle>
          <DialogDescription>
            Create a new PDF template for vouchers or tickets. You'll be able to customize the design after creation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="template_type">Template Type</Label>
            <Select
              value={formData.template_type}
              onValueChange={(value: 'voucher' | 'ticket') =>
                setFormData({ ...formData, template_type: value })
              }
            >
              <SelectTrigger id="template_type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="voucher">Voucher</SelectItem>
                <SelectItem value="ticket">Ticket</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Template Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              onBlur={generateCode}
              placeholder="e.g., Modern Blue Design"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Template Code</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="e.g., modern-blue-design"
            />
            <p className="text-xs text-muted-foreground">
              A unique identifier for this template (auto-generated from name)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this template..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Template'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
