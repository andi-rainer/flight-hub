import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Shield, AlertCircle } from 'lucide-react'
import { InviteUserDialog } from './components/invite-user-dialog'
import { EditMemberDialog } from './components/edit-member-dialog'
import { MemberDocumentsDialog } from './components/member-documents-dialog'
import { ManageMembershipDialog } from './components/manage-membership-dialog'
import { FunctionsSection } from './components/functions-section'
import type { User, FunctionMaster, Document, UserMembership, MembershipType } from '@/lib/database.types'

type UserMembershipWithType = UserMembership & {
  membership_types: MembershipType | null
}

interface UserWithDocuments extends User {
  documents: Document[]
  document_status: 'ok' | 'warning' | 'expired' | 'pending'
  mandatory_uploaded: number
  mandatory_required: number
  active_membership: UserMembershipWithType | null
  is_active: boolean
}

async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}

async function getMembers(): Promise<UserWithDocuments[]> {
  const supabase = await createClient()

  // Get all users with their documents, document types, and active memberships
  const [usersResult, documentTypesResult] = await Promise.all([
    supabase
      .from('users')
      .select(`
        *,
        documents:documents!documents_user_id_fkey(*)
      `)
      .order('name', { ascending: true }),
    supabase
      .from('document_types')
      .select('id, name, mandatory, required_for_functions')
  ])

  if (usersResult.error) {
    console.error('Error fetching members:', usersResult.error)
    return []
  }

  if (!usersResult.data) return []

  const documentTypes = documentTypesResult.data || []

  // Fetch active memberships for all users
  const { data: memberships } = await supabase
    .from('user_memberships')
    .select('*, membership_types(*)')
    .eq('status', 'active')
    .order('end_date', { ascending: false })

  const membershipsMap = new Map<string, UserMembershipWithType>()
  if (memberships) {
    for (const membership of memberships) {
      // Keep only the first (latest) active membership per user
      if (!membershipsMap.has(membership.user_id)) {
        membershipsMap.set(membership.user_id, membership as UserMembershipWithType)
      }
    }
  }

  // Calculate document status and active status for each user
  const today = new Date().toISOString().split('T')[0]

  return usersResult.data.map(user => {
    const userDocs = user.documents as Document[]
    const userFunctions = user.functions || []
    const activeMembership = membershipsMap.get(user.id)

    // Get mandatory document types for this user's functions
    const mandatoryForUser = documentTypes.filter(docType => {
      if (!docType.mandatory) return false
      if (!docType.required_for_functions || docType.required_for_functions.length === 0) return false
      return docType.required_for_functions.some((reqFunc: string) => userFunctions.includes(reqFunc))
    })

    const mandatoryCount = mandatoryForUser.length

    // Count uploaded(!) mandatory documents
    const uploadedMandatoryCount = userDocs.filter(doc => {
      return mandatoryForUser.some(mandatoryDocType => mandatoryDocType.id === doc.document_type_id)
    }).length

    // Check for expired or expiring documents and mandatory document approval
    let documentStatus: 'ok' | 'warning' | 'expired' | 'pending' = 'ok'

    // If user has mandatory docs but hasn't uploaded all, mark as incomplete
    if (mandatoryCount > 0 && uploadedMandatoryCount < mandatoryCount) {
      documentStatus = 'pending' // Will show "Incomplete"
    } else if (userDocs.length > 0) {
      const now = new Date()

      // Check if any documents are pending approval
      const hasPendingDocs = userDocs.some(doc => !doc.approved)

      // Check for expired or expiring documents (only approved ones)
      let hasExpired = false
      let hasExpiring = false

      for (const doc of userDocs) {
        // Only check expiry for approved documents
        if (!doc.approved) continue

        if (doc.expiry_date) {
          const expiry = new Date(doc.expiry_date)
          const daysUntilExpiry = Math.floor(
            (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          )

          if (daysUntilExpiry < 0) {
            hasExpired = true
            break
          } else if (daysUntilExpiry < 45) {
            hasExpiring = true
          }
        }
      }

      // Determine status based on priority:
      // 1. Expired (highest priority)
      // 2. Pending approval
      // 3. Expiring soon
      // 4. OK
      if (hasExpired) {
        documentStatus = 'expired'
      } else if (hasPendingDocs && hasExpiring) {
        // Show both pending and expiring
        documentStatus = 'warning' // Will show "Pending / Expiring"
      } else if (hasPendingDocs) {
        documentStatus = 'pending'
      } else if (hasExpiring) {
        documentStatus = 'warning'
      }
    }

    // Determine if user is active based on membership status
    const isActive = activeMembership ? activeMembership.end_date >= today : false

    return {
      ...user,
      documents: userDocs,
      document_status: documentStatus,
      mandatory_uploaded: uploadedMandatoryCount,
      mandatory_required: mandatoryCount,
      active_membership: activeMembership || null,
      is_active: isActive,
    }
  })
}

async function getFunctions(): Promise<FunctionMaster[]> {
  const supabase = await createClient()

  const { data: functions, error } = await supabase
    .from('functions_master')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching functions:', error)
    return []
  }

  return functions || []
}


function getFunctionNames(functionIds: string[], allFunctions: FunctionMaster[]): string {
  if (!functionIds || functionIds.length === 0) return '-'

  const names = functionIds
    .map(id => allFunctions.find(f => f.id === id)?.name)
    .filter(Boolean)

  return names.length > 0 ? names.join(', ') : '-'
}

function getDocumentStatusBadge(status: 'ok' | 'warning' | 'expired' | 'pending', user: UserWithDocuments) {
  const hasPendingDocs = user.documents.some(doc => !doc.approved)
  const hasExpiring = user.documents.some(doc => {
    if (!doc.approved || !doc.expiry_date) return false
    const expiry = new Date(doc.expiry_date)
    const now = new Date()
    const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry >= 0 && daysUntilExpiry < 45
  })

  // Check if user is missing mandatory documents
  const isMissingMandatory = user.mandatory_required > 0 && user.mandatory_uploaded < user.mandatory_required

  switch (status) {
    case 'expired':
      return <Badge variant="destructive">Expired Docs</Badge>
    case 'warning':
      // Both pending and expiring
      if (hasPendingDocs && hasExpiring) {
        return (
          <div className="flex gap-1">
            <Badge className="bg-blue-500 hover:bg-blue-600">Pending</Badge>
            <Badge className="bg-orange-500 hover:bg-orange-600">Expiring Soon</Badge>
          </div>
        )
      }
      return <Badge className="bg-orange-500 hover:bg-orange-600">Expiring Soon</Badge>
    case 'pending':
      // Show "Incomplete" if missing mandatory docs, otherwise "Pending"
      if (isMissingMandatory && hasPendingDocs) {
        return (
            <div className="flex gap-1">
                <Badge className="bg-red-500 hover:bg-red-600">Incomplete</Badge>
                <Badge className="bg-blue-500 hover:bg-blue-600">Pending</Badge>
            </div>
        )
      }
      else if (hasPendingDocs && hasExpiring) {
        return (
          <div className="flex gap-1">
            <Badge className="bg-blue-500 hover:bg-blue-600">Pending</Badge>
            <Badge className="bg-orange-500 hover:bg-orange-600">Expiring Soon</Badge>
          </div>
        )
      }
      else if (isMissingMandatory) {
        return <Badge className="bg-red-500 hover:bg-red-600">Incomplete</Badge>
      }
      else {
        return <Badge className="bg-blue-500 hover:bg-blue-600">Pending</Badge>
      }
    case 'ok':
    default:
      return <Badge variant="outline">Valid</Badge>
  }
}

export default async function MembersPage() {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    redirect('/login')
  }

  const isBoardMember = currentUser.role?.includes('board') ?? false

  if (!isBoardMember) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Members</h1>
          <p className="text-muted-foreground">Manage club members and roles</p>
        </div>
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertTitle>Board Members Only</AlertTitle>
          <AlertDescription>
            You do not have permission to access this page. Only board members can view and manage
            club members.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const [members, functions] = await Promise.all([
    getMembers(),
    getFunctions(),
  ])

  // Separate active and inactive members
  const activeMembers = members.filter(m => m.is_active)
  const inactiveMembers = members.filter(m => !m.is_active)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Members</h1>
          <p className="text-muted-foreground">Manage club members, roles, and documents</p>
        </div>
        <InviteUserDialog functions={functions} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active" className="space-y-6">
        <TabsList>
          <TabsTrigger value="active">
            Active Members
            <Badge variant="secondary" className="ml-2">{activeMembers.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="inactive">
            Inactive Members
            <Badge variant="outline" className="ml-2">{inactiveMembers.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="functions">Functions</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {/* Info Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Member Management</AlertTitle>
            <AlertDescription>
              Invite new members, assign functions, and approve member documents. Document status
              indicators show if licenses or certifications are expired or expiring soon.
            </AlertDescription>
          </Alert>

          {/* Active Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Club Members</CardTitle>
          <CardDescription>
            {activeMembers.length} active {activeMembers.length === 1 ? 'member' : 'members'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Functions</TableHead>
                  <TableHead>Membership</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No active members found
                    </TableCell>
                  </TableRow>
                ) : (
                  activeMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.name} {member.surname}
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {member.role?.includes('board') && (
                            <Badge>Board</Badge>
                          )}
                          <Badge variant="outline">Member</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm max-w-xs truncate">
                        {getFunctionNames(member.functions || [], functions)}
                      </TableCell>
                      <TableCell>
                        {member.active_membership ? (
                          <div className="flex flex-col gap-1">
                            <Badge variant="default">
                              {member.active_membership.membership_types?.name || 'Active'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {member.active_membership.member_number}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {member.active_membership.auto_renew ? 'Renewal' : 'Until'}: {new Date(member.active_membership.end_date).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">No membership</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {member.active_membership ? (
                          <Badge
                            variant={
                              member.active_membership.payment_status === 'paid'
                                ? 'default'
                                : member.active_membership.payment_status === 'pending'
                                ? 'secondary'
                                : 'destructive'
                            }
                            className={
                              member.active_membership.payment_status === 'paid'
                                ? 'bg-green-600'
                                : member.active_membership.payment_status === 'pending'
                                ? 'bg-yellow-600'
                                : ''
                            }
                          >
                            {member.active_membership.payment_status}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getDocumentStatusBadge(member.document_status, member)}
                          <span className="text-sm text-muted-foreground">
                            {member.mandatory_required > 0 ? (
                              `(${member.mandatory_uploaded}/${member.mandatory_required})`
                            ) : (
                              `(${member.documents.length})`
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <MemberDocumentsDialog member={member} documents={member.documents} />
                          <ManageMembershipDialog user={member} activeMembership={member.active_membership} />
                          <EditMemberDialog member={member} functions={functions} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="inactive" className="space-y-4">
          {/* Info Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Inactive Members</AlertTitle>
            <AlertDescription>
              These members have expired or cancelled memberships and cannot access the system or be selected for flights.
              Board members can renew memberships to reactivate these users.
            </AlertDescription>
          </Alert>

          {/* Inactive Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inactive Club Members</CardTitle>
          <CardDescription>
            {inactiveMembers.length} inactive {inactiveMembers.length === 1 ? 'member' : 'members'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Membership Status</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inactiveMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No inactive members
                    </TableCell>
                  </TableRow>
                ) : (
                  inactiveMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.name} {member.surname}
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>
                        {member.active_membership ? (
                          <div className="flex flex-col gap-1">
                            <Badge variant="destructive">Expired</Badge>
                            <span className="text-xs text-muted-foreground">
                              {member.active_membership.member_number}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Ended: {new Date(member.active_membership.end_date).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <Badge variant="outline">No membership</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {member.active_membership
                          ? new Date(member.active_membership.end_date).toLocaleDateString()
                          : 'Never'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <ManageMembershipDialog user={member} activeMembership={member.active_membership} />
                          <EditMemberDialog member={member} functions={functions} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="functions" className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertTitle>Board Member Access</AlertTitle>
            <AlertDescription>
              Manage member functions for classification and role assignment. These functions help
              organize and categorize club members.
            </AlertDescription>
          </Alert>
          <FunctionsSection functions={functions} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
