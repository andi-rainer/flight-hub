'use client'

import { useState, useTransition } from 'react'
import { TableCell, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Download, Edit2, Trash2, Check, X } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import { deleteDocument, updateDocumentName } from '../actions'
import { toast } from 'sonner'

interface DocumentRowProps {
  document: any
  isBoardMember: boolean
  mobileView?: boolean
}

export default function DocumentRow({ document, isBoardMember, mobileView }: DocumentRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [newName, setNewName] = useState(document.name)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isPending, startTransition] = useTransition()

  const uploader = document.uploader
  const uploaderName = uploader
    ? `${uploader.name || ''} ${uploader.surname || ''}`.trim() || uploader.email
    : 'Unknown'

  const handleDownload = () => {
    window.open(document.file_url, '_blank')
  }

  const handleRename = () => {
    if (newName.trim() && newName !== document.name) {
      startTransition(async () => {
        const result = await updateDocumentName(document.id, newName.trim())
        if (result.error) {
          toast.error('Failed to rename document', { description: result.error })
        } else {
          toast.success('Document renamed successfully')
          setIsEditing(false)
        }
      })
    } else {
      setIsEditing(false)
      setNewName(document.name)
    }
  }

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteDocument(document.id)
      if (result.error) {
        toast.error('Failed to delete document', { description: result.error })
      } else {
        toast.success('Document deleted successfully')
      }
      setShowDeleteDialog(false)
    })
  }

  if (mobileView) {
    return (
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
        {isBoardMember && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(true)}
              disabled={isPending}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
        <DeleteDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={handleDelete}
          documentName={document.name}
        />
      </div>
    )
  }

  return (
    <>
      <TableRow>
        <TableCell>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-8"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename()
                  if (e.key === 'Escape') {
                    setIsEditing(false)
                    setNewName(document.name)
                  }
                }}
              />
              <Button size="sm" variant="ghost" onClick={handleRename} disabled={isPending}>
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsEditing(false)
                  setNewName(document.name)
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <span className="font-medium">{document.name}</span>
          )}
        </TableCell>
        <TableCell>
          <Badge variant={getCategoryVariant(document.category)}>
            {document.category}
          </Badge>
        </TableCell>
        <TableCell>
          {document.tags && document.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {document.tags.map((tag: string, i: number) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </TableCell>
        <TableCell>{uploaderName}</TableCell>
        <TableCell>{formatDate(document.uploaded_at)}</TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
            {isBoardMember && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditing(true)}
                  disabled={isPending}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </TableCell>
      </TableRow>
      <DeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        documentName={document.name}
      />
    </>
  )
}

function getCategoryVariant(category: string | null): 'default' | 'secondary' | 'outline' {
  switch (category) {
    case 'Regulations':
      return 'default'
    case 'Procedures':
      return 'secondary'
    case 'Forms':
      return 'outline'
    default:
      return 'secondary'
  }
}

function DeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  documentName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  documentName: string
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Document</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{documentName}"? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
