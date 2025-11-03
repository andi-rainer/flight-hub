'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, AlertCircle } from 'lucide-react'
import { uploadAircraftDocument } from '../actions'
import { useRouter } from 'next/navigation'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface DocumentUploadDialogProps {
  aircraftId: string
}

export function DocumentUploadDialog({ aircraftId }: DocumentUploadDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    const file = formData.get('file') as File

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024 // 10MB in bytes
    if (file && file.size > maxSize) {
      setError('File size must be less than 10MB')
      return
    }

    formData.append('planeId', aircraftId)

    startTransition(async () => {
      const result = await uploadAircraftDocument(formData)

      if (result.error) {
        setError(result.error)
      } else {
        router.refresh()
        setOpen(false)
        // Reset form
        ;(e.target as HTMLFormElement).reset()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a document for this aircraft. Supported formats: PDF, images, etc.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="file">File *</Label>
            <Input id="file" name="file" type="file" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Document Name *</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g., Certificate of Airworthiness"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              name="tags"
              placeholder="e.g., maintenance, certification"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiryDate">Expiry Date</Label>
            <Input id="expiryDate" name="expiryDate" type="date" />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="blocksAircraft"
              name="blocksAircraft"
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="blocksAircraft" className="text-sm font-normal">
              This document blocks aircraft when expired
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
