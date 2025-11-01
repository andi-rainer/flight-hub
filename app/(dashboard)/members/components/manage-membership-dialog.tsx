'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Loader2, CreditCard, UserX, AlertTriangle } from 'lucide-react'
import {
  assignMembership,
  getMembershipTypes,
  cancelMembership,
  getUserMemberships,
  updateMembershipPaymentStatus,
  getPaymentStatusHistory,
} from '@/lib/actions/memberships'
import { deleteMember } from '@/lib/actions/members'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import type { User, MembershipType, UserMembership } from '@/lib/database.types'

type UserMembershipWithType = UserMembership & {
  membership_types: MembershipType | null
}

interface ManageMembershipDialogProps {
  user: User
  activeMembership?: UserMembershipWithType | null
  trigger?: React.ReactNode
}

export function ManageMembershipDialog({ user, activeMembership, trigger }: ManageMembershipDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [membershipTypes, setMembershipTypes] = useState<MembershipType[]>([])
  const [loadingTypes, setLoadingTypes] = useState(true)
  const [membershipHistory, setMembershipHistory] = useState<UserMembershipWithType[]>([])
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showEndDialog, setShowEndDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEnding, setIsEnding] = useState(false)
  const [endReason, setEndReason] = useState('')
  const [userBalance, setUserBalance] = useState<number>(0)
  const [loadingBalance, setLoadingBalance] = useState(true)
  const [createFinalTransaction, setCreateFinalTransaction] = useState(false)
  const [isUpdatingPaymentStatus, setIsUpdatingPaymentStatus] = useState(false)
  const [paymentHistory, setPaymentHistory] = useState<any[]>([])
  const [loadingPaymentHistory, setLoadingPaymentHistory] = useState(true)

  const today = new Date().toISOString().split('T')[0]
  const hasActiveMembership = activeMembership && activeMembership.end_date >= today

  const [formData, setFormData] = useState({
    membership_type_id: '',
    start_date: today,
    auto_renew: false,
    payment_status: 'unpaid' as 'paid' | 'unpaid' | 'pending',
    notes: '',
  })

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open])

  const loadData = async () => {
    setLoadingTypes(true)
    setLoadingBalance(true)
    setLoadingPaymentHistory(true)

    const [typesResult, historyResult] = await Promise.all([
      getMembershipTypes(),
      getUserMemberships(user.id),
    ])

    if (typesResult.success) {
      setMembershipTypes(typesResult.data.filter(t => t.active))
    }

    if (historyResult.success) {
      setMembershipHistory(historyResult.data as UserMembershipWithType[])
    }

    // Fetch user balance
    try {
      const response = await fetch(`/api/users/${user.id}/balance`)
      if (response.ok) {
        const data = await response.json()
        setUserBalance(data.balance || 0)
      }
    } catch (error) {
      console.error('Error fetching user balance:', error)
    }

    // Fetch payment history for active membership
    if (activeMembership) {
      const paymentHistoryResult = await getPaymentStatusHistory(activeMembership.id)
      if (paymentHistoryResult.success) {
        setPaymentHistory(paymentHistoryResult.data)
      }
    }

    setLoadingTypes(false)
    setLoadingBalance(false)
    setLoadingPaymentHistory(false)
  }

  const selectedType = membershipTypes.find(t => t.id === formData.membership_type_id)

  const calculateEndDate = () => {
    if (!selectedType || !formData.start_date) return null

    const startDate = new Date(formData.start_date)
    const endDate = new Date(startDate)

    switch (selectedType.duration_unit) {
      case 'days':
        endDate.setDate(endDate.getDate() + selectedType.duration_value)
        break
      case 'months':
        endDate.setMonth(endDate.getMonth() + selectedType.duration_value)
        break
      case 'years':
        endDate.setFullYear(endDate.getFullYear() + selectedType.duration_value)
        break
    }

    return endDate.toISOString().split('T')[0]
  }

  const handleAssignMembership = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const result = await assignMembership({
      user_id: user.id,
      membership_type_id: formData.membership_type_id,
      start_date: formData.start_date,
      auto_renew: formData.auto_renew,
      payment_status: formData.payment_status,
      notes: formData.notes || undefined,
    })

    if (result.success) {
      toast.success(hasActiveMembership ? 'New membership assigned' : 'Membership assigned')
      setOpen(false)
      setFormData({
        membership_type_id: '',
        start_date: today,
        auto_renew: false,
        payment_status: 'unpaid',
        notes: '',
      })
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to assign membership')
    }

    setIsSubmitting(false)
  }

  const handleEndMembership = async () => {
    if (!activeMembership) return

    setIsEnding(true)
    const result = await cancelMembership(
      activeMembership.id,
      endReason,
      createFinalTransaction
    )

    if (result.success) {
      toast.success(result.message || 'Membership ended successfully')
      setShowEndDialog(false)
      setEndReason('')
      setCreateFinalTransaction(false)
      setOpen(false)
      router.refresh()
    } else {
      // Check if this is a balance error
      if (result.balanceError) {
        toast.error(result.message || result.error)
      } else {
        toast.error(result.error || 'Failed to end membership')
      }
    }

    setIsEnding(false)
  }

  const handleDeleteUser = async () => {
    setIsDeleting(true)
    const result = await deleteMember(user.id)

    if (result.success) {
      toast.success('User deleted successfully')
      setShowDeleteDialog(false)
      setOpen(false)
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to delete user')
    }

    setIsDeleting(false)
  }

  const handlePaymentStatusChange = async (newStatus: 'paid' | 'unpaid' | 'pending') => {
    if (!activeMembership) return

    setIsUpdatingPaymentStatus(true)
    const result = await updateMembershipPaymentStatus(activeMembership.id, newStatus)

    if (result.success) {
      toast.success('Payment status updated')

      // Reload payment history
      const paymentHistoryResult = await getPaymentStatusHistory(activeMembership.id)
      if (paymentHistoryResult.success) {
        setPaymentHistory(paymentHistoryResult.data)
      }

      router.refresh()
    } else {
      toast.error(result.error || 'Failed to update payment status')
    }

    setIsUpdatingPaymentStatus(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm">
              <CreditCard className="h-4 w-4 mr-2" />
              Membership
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Membership - {user.name} {user.surname}</DialogTitle>
            <DialogDescription>
              View membership status, assign new membership, or end current membership
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Current Membership Status */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Current Status</h3>
              {hasActiveMembership ? (
                <div className="rounded-md border p-4 space-y-2 bg-green-50 dark:bg-green-950/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="bg-green-600">Active</Badge>
                      <span className="font-medium">{activeMembership.membership_types?.name}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowEndDialog(true)}
                      className="text-destructive hover:text-destructive"
                    >
                      End Membership
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Member #:</span>{' '}
                      {activeMembership.member_number}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Expires:</span>{' '}
                      {new Date(activeMembership.end_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 items-center text-sm pt-2">
                    <div>
                      <Label htmlFor="payment-status" className="text-muted-foreground text-xs">
                        Payment Status
                      </Label>
                      <Select
                        value={activeMembership.payment_status}
                        onValueChange={(value) => handlePaymentStatusChange(value as 'paid' | 'unpaid' | 'pending')}
                        disabled={isUpdatingPaymentStatus}
                      >
                        <SelectTrigger id="payment-status" className="h-8 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="paid">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-green-600" />
                              Paid
                            </div>
                          </SelectItem>
                          <SelectItem value="unpaid">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-red-600" />
                              Unpaid
                            </div>
                          </SelectItem>
                          <SelectItem value="pending">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-yellow-600" />
                              Pending
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Auto-renew:</span>{' '}
                      {activeMembership.auto_renew ? 'Yes' : 'No'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border p-4 bg-red-50 dark:bg-red-950/20">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">Inactive</Badge>
                    <span className="text-sm text-muted-foreground">No active membership</span>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Status History */}
            {hasActiveMembership && paymentHistory.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Payment Status History</h3>
                  {loadingPaymentHistory ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {paymentHistory.map((history) => (
                        <div
                          key={history.id}
                          className="rounded-md border p-2 text-xs space-y-1 bg-muted/50"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {history.old_status && (
                                <>
                                  <Badge
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {history.old_status}
                                  </Badge>
                                  <span className="text-muted-foreground">→</span>
                                </>
                              )}
                              <Badge
                                variant={
                                  history.new_status === 'paid'
                                    ? 'default'
                                    : history.new_status === 'pending'
                                    ? 'secondary'
                                    : 'destructive'
                                }
                                className={
                                  history.new_status === 'paid'
                                    ? 'bg-green-600'
                                    : history.new_status === 'pending'
                                    ? 'bg-yellow-600'
                                    : ''
                                }
                              >
                                {history.new_status}
                              </Badge>
                            </div>
                            <span className="text-muted-foreground text-xs">
                              {new Date(history.changed_at).toLocaleDateString('de-DE', {
                                day: '2-digit',
                                month: '2-digit',
                                year: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          {history.changed_by_user && (
                            <div className="text-muted-foreground text-xs">
                              by {history.changed_by_user.name} {history.changed_by_user.surname}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            <Separator />

            {/* Assign New Membership Form */}
            <form onSubmit={handleAssignMembership} className="space-y-4">
              <h3 className="text-sm font-medium">
                {hasActiveMembership ? 'Assign New Membership' : 'Assign Membership'}
              </h3>

              {loadingTypes ? (
                <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading membership types...
                </div>
              ) : membershipTypes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active membership types available.
                </p>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="membership_type">Membership Type *</Label>
                    <Select
                      value={formData.membership_type_id}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          membership_type_id: value,
                          auto_renew: membershipTypes.find(t => t.id === value)?.auto_renew || false,
                        })
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select membership type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {membershipTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            <div className="flex items-center gap-2">
                              <span>{type.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({type.duration_value} {type.duration_unit})
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedType && (
                    <div className="rounded-md border p-3 space-y-2 bg-muted/50">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Type Details</span>
                        <Badge variant="outline">{selectedType.member_category}</Badge>
                      </div>
                      {selectedType.description && (
                        <p className="text-xs text-muted-foreground">{selectedType.description}</p>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Duration:</span>{' '}
                          {selectedType.duration_value} {selectedType.duration_unit}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Price:</span>{' '}
                          {selectedType.currency} {selectedType.price?.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />
                  </div>

                  {calculateEndDate() && (
                    <div className="text-sm text-muted-foreground">
                      End Date: <span className="font-medium">{calculateEndDate()}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="payment_status">Payment Status *</Label>
                    <Select
                      value={formData.payment_status}
                      onValueChange={(value: 'paid' | 'unpaid' | 'pending') =>
                        setFormData({ ...formData, payment_status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="auto_renew"
                      checked={formData.auto_renew}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, auto_renew: checked as boolean })
                      }
                    />
                    <label htmlFor="auto_renew" className="text-sm cursor-pointer">
                      Enable auto-renewal
                    </label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Any additional notes..."
                      rows={2}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting || !formData.membership_type_id}
                    className="w-full"
                  >
                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {hasActiveMembership ? 'Assign New Membership' : 'Assign Membership'}
                  </Button>
                </>
              )}
            </form>

            {/* Membership History */}
            {membershipHistory.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Membership History</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {membershipHistory.map((membership) => (
                      <div
                        key={membership.id}
                        className="rounded-md border p-2 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{membership.membership_types?.name}</span>
                          <Badge variant={membership.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                            {membership.status}
                          </Badge>
                        </div>
                        <div className="text-muted-foreground">
                          {membership.member_number} | {new Date(membership.start_date).toLocaleDateString()} -{' '}
                          {new Date(membership.end_date).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Danger Zone - Delete User */}
            {!hasActiveMembership && (
              <>
                <Separator />
                <div className="space-y-2 rounded-md border border-destructive p-4 bg-destructive/5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <h3 className="text-sm font-medium text-destructive">Danger Zone</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This user has no active membership and can be permanently deleted.
                    This action cannot be undone.
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    className="w-full"
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Delete User Permanently
                  </Button>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End Membership Confirmation Dialog */}
      <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Membership?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately end {user.name} {user.surname}&apos;s active membership.
              The user will become inactive and unable to access the system.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            {/* Account Balance Warning */}
            {!loadingBalance && (
              <div className={`rounded-md border p-4 ${
                userBalance < 0
                  ? 'bg-destructive/10 border-destructive'
                  : userBalance > 0
                  ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900'
                  : 'bg-muted'
              }`}>
                <div className="flex items-start gap-3">
                  {userBalance !== 0 && (
                    <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                      userBalance < 0 ? 'text-destructive' : 'text-blue-600'
                    }`} />
                  )}
                  <div className="flex-1 space-y-2">
                    <p className="text-sm font-medium">
                      Account Balance: <span className={
                        userBalance < 0
                          ? 'text-destructive'
                          : userBalance > 0
                          ? 'text-blue-600'
                          : ''
                      }>
                        {new Intl.NumberFormat('de-DE', {
                          style: 'currency',
                          currency: 'EUR'
                        }).format(userBalance)}
                      </span>
                    </p>
                    {userBalance < 0 && (
                      <p className="text-sm text-destructive">
                        User owes money to the club. All debts must be settled before ending membership.
                      </p>
                    )}
                    {userBalance > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Club owes money to the user. A final refund transaction can be created to settle the account.
                        </p>
                        <div className="flex items-center space-x-2 pt-2">
                          <Checkbox
                            id="create_final_tx"
                            checked={createFinalTransaction}
                            onCheckedChange={(checked) => setCreateFinalTransaction(checked as boolean)}
                          />
                          <label
                            htmlFor="create_final_tx"
                            className="text-sm font-medium cursor-pointer"
                          >
                            Create final refund transaction ({new Intl.NumberFormat('de-DE', {
                              style: 'currency',
                              currency: 'EUR'
                            }).format(userBalance)})
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="end_reason">Reason (Optional)</Label>
              <Textarea
                id="end_reason"
                value={endReason}
                onChange={(e) => setEndReason(e.target.value)}
                placeholder="Reason for ending membership..."
                rows={3}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isEnding}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEndMembership}
              disabled={isEnding || (userBalance < 0) || (userBalance > 0 && !createFinalTransaction)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isEnding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              End Membership
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete {user.name} {user.surname}?
              This will remove all user data except flight logs. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
