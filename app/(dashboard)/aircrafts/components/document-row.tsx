'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TableCell, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Download, Trash2, Check, X, Edit2, AlertTriangle } from 'lucide-react'
import type { Document as AircraftDocument } from '@/lib/database.types'
import { deleteAircraftDocument, toggleDocumentApproval, updateDocumentName } from '../actions'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical } from 'lucide-react'

interface DocumentRowProps {
  document: AircraftDocument
  aircraftId: string
  isBoardMember: boolean
  mobileView?: boolean
}

function getDocumentExpiryStatus(expiryDate: string | null) {
  if (!expiryDate) return 'none'

  const now = new Date()
  const expiry = new Date(expiryDate)
  const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (daysUntilExpiry < 0) return 'expired'
  if (daysUntilExpiry < 5) return 'critical'
  if (daysUntilExpiry < 45) return 'warning'
  return 'ok'
}

export function DocumentRow({ document, aircraftId, isBoardMember, mobileView = false }: DocumentRowProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [newName, setNewName] = useState(document.name)

  const expiryStatus = getDocumentExpiryStatus(document.expiry_date)

  const handleDelete = async () => {
    startTransition(async () => {
      await deleteAircraftDocument(document.id, aircraftId)
      router.refresh()
      setDeleteDialogOpen(false)
    })
  }

  const handleApprovalToggle = async () => {
    startTransition(async () => {
      await toggleDocumentApproval(document.id, aircraftId, !document.approved)
      router.refresh()
    })
  }

  const handleRename = async () => {
    if (!newName.trim()) return

    startTransition(async () => {
      await updateDocumentName(document.id, aircraftId, newName)
      router.refresh()
      setRenameDialogOpen(false)
    })
  }

  // Mobile view - just return action buttons in dropdown
  if (mobileView) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleApprovalToggle} disabled={isPending}>
              {document.approved ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Unapprove
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Approve
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRenameDialogOpen(true)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setDeleteDialogOpen(true)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Dialogs */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Document</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete &quot;{document.name}&quot;? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
                {isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Document</DialogTitle>
              <DialogDescription>Enter a new name for this document.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="newName">Document Name</Label>
              <Input
                id="newName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="mt-2"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRename} disabled={isPending || !newName.trim()}>
                {isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  // Desktop view - full table row
  const getExpiryClassName = () => {
    if (expiryStatus === 'expired' || expiryStatus === 'critical') {
      return 'bg-red-50 dark:bg-red-950/20 text-red-900 dark:text-red-100'
    }
    if (expiryStatus === 'warning') {
      return 'bg-orange-50 dark:bg-orange-950/20 text-orange-900 dark:text-orange-100'
    }
    return ''
  }

  return (
    <>
      <TableRow className={getExpiryClassName()}>
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            {document.name}
            {document.blocks_aircraft && (
              <Badge variant="destructive" className="text-xs">
                Blocks
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell>
          {document.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {document.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">No tags</span>
          )}
        </TableCell>
        <TableCell>{new Date(document.uploaded_at).toLocaleDateString()}</TableCell>
        <TableCell>
          {document.expiry_date ? (
            <div className="flex items-center gap-2">
              {expiryStatus === 'expired' && <AlertTriangle className="h-4 w-4 text-red-600" />}
              {expiryStatus === 'critical' && <AlertTriangle className="h-4 w-4 text-red-600" />}
              {expiryStatus === 'warning' && <AlertTriangle className="h-4 w-4 text-orange-600" />}
              <span className={expiryStatus === 'expired' ? 'font-semibold' : ''}>
                {new Date(document.expiry_date).toLocaleDateString()}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">No expiry</span>
          )}
        </TableCell>
        <TableCell>
          <Badge variant={document.approved ? 'default' : 'secondary'}>
            {document.approved ? 'Approved' : 'Pending'}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" asChild>
              <a href={document.file_url} download target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4" />
              </a>
            </Button>
            {isBoardMember && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleApprovalToggle}
                  disabled={isPending}
                  title={document.approved ? 'Unapprove' : 'Approve'}
                >
                  {document.approved ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRenameDialogOpen(true)}
                  title="Rename"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={isPending}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </>
            )}
          </div>
        </TableCell>
      </TableRow>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{document.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Document</DialogTitle>
            <DialogDescription>Enter a new name for this document.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="newName">Document Name</Label>
            <Input
              id="newName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={isPending || !newName.trim()}>
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
