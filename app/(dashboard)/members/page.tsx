import { createClient, getUserProfile } from '@/lib/supabase/server'
import { redirect } from '@/navigation'
import { getTranslations } from 'next-intl/server'
import { hasPermission } from '@/lib/permissions'
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
import type { User, Document, UserMembership, MembershipType, FunctionWithStats } from '@/lib/database.types'

type UserMembershipWithType = UserMembership & {
  membership_types: MembershipType | null
}

interface UserWithDocuments extends User {
  documents: Document[]
  document_status: 'ok' | 'warning' | 'expired' | 'pending'
  mandatory_uploaded: number
  mandatory_required: number
  active_membership: UserMembershipWithType | null
  last_membership: UserMembershipWithType | null
  is_active: boolean
}

// Removed - using getUserProfile from lib/supabase/server instead

async function getMembers(): Promise<UserWithDocuments[]> {
  const supabase = await createClient()

  // Get all users with their documents, document definitions, and active memberships
  // Exclude deleted users (those with @deleted.local emails)
  const [usersResult, documentDefinitionsResult, userFunctionsResult] = await Promise.all([
    supabase
      .from('users')
      .select(`
        *,
        documents:documents!documents_user_id_fkey(*)
      `)
      .not('email', 'like', '%@deleted.local')
      .order('name', { ascending: true }),
    supabase
      .from('document_definitions')
      .select('id, name, mandatory, required_for_functions'),
    supabase
      .from('user_functions')
      .select('user_id, function_id, functions_master(id, code, name)')
  ])

  if (usersResult.error) {
    console.error('Error fetching members:', usersResult.error)
    return []
  }

  if (!usersResult.data) return []

  const documentDefinitions = documentDefinitionsResult.data || []

  // Create a map of user functions
  const userFunctionsMap = new Map<string, string[]>()
  const userFunctionCodesMap = new Map<string, string[]>()
  const userFunctionNamesMap = new Map<string, string[]>()
  if (userFunctionsResult.data) {
    for (const uf of userFunctionsResult.data) {
      if (!userFunctionsMap.has(uf.user_id)) {
        userFunctionsMap.set(uf.user_id, [])
        userFunctionCodesMap.set(uf.user_id, [])
        userFunctionNamesMap.set(uf.user_id, [])
      }
      userFunctionsMap.get(uf.user_id)!.push(uf.function_id)
      if (uf.functions_master) {
        const func = uf.functions_master as any
        if (func.code) {
          userFunctionCodesMap.get(uf.user_id)!.push(func.code)
        }
        if (func.name) {
          userFunctionNamesMap.get(uf.user_id)!.push(func.name)
        }
      }
    }
  }

  // Fetch active memberships for all users
  const { data: activeMemberships } = await supabase
    .from('user_memberships')
    .select('*, membership_types(*)')
    .eq('status', 'active')
    .order('end_date', { ascending: false })

  // Fetch last membership for ALL users (for inactive categorization)
  const { data: allMemberships } = await supabase
    .from('user_memberships')
    .select('*, membership_types(*)')
    .order('end_date', { ascending: false })

  const membershipsMap = new Map<string, UserMembershipWithType>()
  const lastMembershipMap = new Map<string, UserMembershipWithType>()

  if (activeMemberships) {
    for (const membership of activeMemberships) {
      // Keep only the first (latest) active membership per user
      if (!membershipsMap.has(membership.user_id)) {
        membershipsMap.set(membership.user_id, membership as UserMembershipWithType)
      }
    }
  }

  if (allMemberships) {
    for (const membership of allMemberships) {
      // Keep only the most recent membership per user (for inactive categorization)
      if (!lastMembershipMap.has(membership.user_id)) {
        lastMembershipMap.set(membership.user_id, membership as UserMembershipWithType)
      }
    }
  }

  // Calculate document status and active status for each user
  const today = new Date().toISOString().split('T')[0]

  return usersResult.data.map(user => {
    const userDocs = user.documents as Document[]
    const userFunctionIds = userFunctionsMap.get(user.id) || []
    const userFunctionCodes = userFunctionCodesMap.get(user.id) || []
    const userFunctionNames = userFunctionNamesMap.get(user.id) || []
    const activeMembership = membershipsMap.get(user.id)
    const lastMembership = lastMembershipMap.get(user.id)

    // Override the old functions field with new function IDs
    const userWithFunctions = {
      ...user,
      functions: userFunctionIds,
      function_codes: userFunctionCodes,
    }

    // Get mandatory document definitions for this user's functions
    // Check both codes and names for backward compatibility
    const mandatoryForUser = documentDefinitions.filter(docDef => {
      if (!docDef.mandatory) return false
      if (!docDef.required_for_functions || docDef.required_for_functions.length === 0) return false
      return docDef.required_for_functions.some((reqFunc: string) => {
        // Check if user has this function by code, name, or ID
        return userFunctionCodes.includes(reqFunc) ||
               userFunctionNames.includes(reqFunc) ||
               userFunctionIds.includes(reqFunc)
      })
    })

    const mandatoryCount = mandatoryForUser.length

    // Count uploaded(!) mandatory documents
    const uploadedMandatoryCount = userDocs.filter(doc => {
      return mandatoryForUser.some(mandatoryDocDef => mandatoryDocDef.id === doc.document_definition_id)
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
      ...userWithFunctions,
      documents: userDocs,
      document_status: documentStatus,
      mandatory_uploaded: uploadedMandatoryCount,
      mandatory_required: mandatoryCount,
      active_membership: activeMembership || null,
      last_membership: lastMembership || null,
      is_active: isActive,
    }
  })
}

async function getFunctions(): Promise<FunctionWithStats[]> {
  const supabase = await createClient()

  // Get functions with user counts using the view created in migration
  const { data: functions, error } = await supabase
    .from('functions_with_stats')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching functions:', error)
    return []
  }

  return functions || []
}

async function getFunctionCategories() {
  const supabase = await createClient()

  const { data: categories, error } = await supabase
    .from('function_categories')
    .select('id, name_en, name_de, code')
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching function categories:', error)
    return []
  }

  return categories || []
}


function getFunctionNames(functionIds: string[], allFunctions: FunctionWithStats[]): string {
  if (!functionIds || functionIds.length === 0) return '-'

  const names = functionIds
    .map(id => allFunctions.find(f => f.id === id)?.name)
    .filter(Boolean)

  return names.length > 0 ? names.join(', ') : '-'
}

function getDocumentStatusBadge(
  status: 'ok' | 'warning' | 'expired' | 'pending',
  user: UserWithDocuments,
  tDocuments: any
) {
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
      return <Badge variant="destructive">{tDocuments('expiredDocs')}</Badge>
    case 'warning':
      // Both pending and expiring
      if (hasPendingDocs && hasExpiring) {
        return (
          <div className="flex gap-1">
            <Badge className="bg-blue-500 hover:bg-blue-600">{tDocuments('pending')}</Badge>
            <Badge className="bg-orange-500 hover:bg-orange-600">{tDocuments('expiringSoon')}</Badge>
          </div>
        )
      }
      return <Badge className="bg-orange-500 hover:bg-orange-600">{tDocuments('expiringSoon')}</Badge>
    case 'pending':
      // Show "Incomplete" if missing mandatory docs, otherwise "Pending"
      if (isMissingMandatory && hasPendingDocs) {
        return (
            <div className="flex gap-1">
                <Badge className="bg-red-500 hover:bg-red-600">{tDocuments('incomplete')}</Badge>
                <Badge className="bg-blue-500 hover:bg-blue-600">{tDocuments('pending')}</Badge>
            </div>
        )
      }
      else if (hasPendingDocs && hasExpiring) {
        return (
          <div className="flex gap-1">
            <Badge className="bg-blue-500 hover:bg-blue-600">{tDocuments('pending')}</Badge>
            <Badge className="bg-orange-500 hover:bg-orange-600">{tDocuments('expiringSoon')}</Badge>
          </div>
        )
      }
      else if (isMissingMandatory) {
        return <Badge className="bg-red-500 hover:bg-red-600">{tDocuments('incomplete')}</Badge>
      }
      else {
        return <Badge className="bg-blue-500 hover:bg-blue-600">{tDocuments('pending')}</Badge>
      }
    case 'ok':
    default:
      return <Badge variant="outline">{tDocuments('valid')}</Badge>
  }
}

export default async function MembersPage() {
  const t = await getTranslations('members')
  const tCommon = await getTranslations('common')
  const tRoles = await getTranslations('roles')
  const tMembership = await getTranslations('membership')
  const tDocuments = await getTranslations('documents')
  const currentUser = await getUserProfile()

  if (!currentUser) {
    redirect('/login')
  }

  // Check permission to view all members
  if (!hasPermission(currentUser, 'members.view.all')) {
    redirect('/dashboard?error=unauthorized')
  }

  const isBoardMember = currentUser.role?.includes('board') ?? false

  const [members, functions, categories] = await Promise.all([
    getMembers(),
    getFunctions(),
    getFunctionCategories(),
  ])

  // Separate active and inactive members
  const activeMembers = members.filter(m => m.is_active)
  const inactiveMembers = members.filter(m => !m.is_active)

  // Filter active members by category
  const regularMembers = activeMembers.filter(m =>
    m.active_membership?.membership_types?.member_category === 'regular'
  )
  const shortTermMembers = activeMembers.filter(m =>
    m.active_membership?.membership_types?.member_category === 'short-term'
  )

  // Filter inactive members by category (based on their last membership)
  const inactiveRegularMembers = inactiveMembers.filter(m =>
    m.last_membership?.membership_types?.member_category === 'regular'
  )
  const inactiveShortTermMembers = inactiveMembers.filter(m =>
    m.last_membership?.membership_types?.member_category === 'short-term'
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <InviteUserDialog functions={functions} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active" className="space-y-6">
        <TabsList>
          <TabsTrigger value="active">
            {t('activeMembers')}
            <Badge variant="secondary" className="ml-2">{activeMembers.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="inactive">
            {t('inactiveMembers')}
            <Badge variant="outline" className="ml-2">{inactiveMembers.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="functions">{tRoles('functions')}</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {/* Info Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('memberManagement')}</AlertTitle>
            <AlertDescription>
              {t('memberManagementDescription')}
            </AlertDescription>
          </Alert>

          {/* Member Category Tabs */}
          <Tabs defaultValue="regular" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">
                {t('allMembers')}
                <Badge variant="secondary" className="ml-2">{activeMembers.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="regular">
                {t('regularMembers')}
                <Badge variant="secondary" className="ml-2">{regularMembers.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="short-term">
                {t('shortTermMembers')}
                <Badge variant="secondary" className="ml-2">{shortTermMembers.length}</Badge>
              </TabsTrigger>
            </TabsList>

            {/* All Members */}
            <TabsContent value="all">
              <Card>
                <CardHeader>
                  <CardTitle>{t('allActiveMembers')}</CardTitle>
                  <CardDescription>
                    {activeMembers.length} {tCommon('active')} {activeMembers.length === 1 ? t('member') : t('members')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{tCommon('name')}</TableHead>
                          <TableHead>{tCommon('email')}</TableHead>
                          <TableHead>{tRoles('roles')}</TableHead>
                          <TableHead>{tRoles('functions')}</TableHead>
                          <TableHead>{tMembership('membership')}</TableHead>
                          <TableHead>{tMembership('payment')}</TableHead>
                          <TableHead>{tDocuments('documents')}</TableHead>
                          <TableHead className="text-right">{tCommon('actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeMembers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center text-muted-foreground">
                              {t('noActiveMembersFound')}
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
                                    <Badge>{tRoles('board')}</Badge>
                                  )}
                                  <Badge variant="outline">{tRoles('member')}</Badge>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm max-w-xs truncate">
                                {getFunctionNames(member.functions || [], functions)}
                              </TableCell>
                              <TableCell>
                                {member.active_membership ? (
                                  <div className="flex flex-col gap-1">
                                    <Badge variant="default">
                                      {member.active_membership.membership_types?.name || tCommon('active')}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {member.active_membership.member_number}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {member.active_membership.auto_renew ? tMembership('renewal') : tMembership('until')}: {new Date(member.active_membership.end_date).toLocaleDateString()}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">{tMembership('noMembership')}</span>
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
                                    {tMembership(`paymentStatus.${member.active_membership.payment_status}`)}
                                  </Badge>
                                ) : (
                                  <span className="text-sm text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {getDocumentStatusBadge(member.document_status, member, tDocuments)}
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

            {/* Regular Members */}
            <TabsContent value="regular">
              <Card>
                <CardHeader>
                  <CardTitle>{t('regularMembers')}</CardTitle>
                  <CardDescription>
                    {regularMembers.length} {tMembership('category.regular').toLowerCase()} {regularMembers.length === 1 ? t('member') : t('members')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{tCommon('name')}</TableHead>
                          <TableHead>{tCommon('email')}</TableHead>
                          <TableHead>{tRoles('roles')}</TableHead>
                          <TableHead>{tRoles('functions')}</TableHead>
                          <TableHead>{tMembership('membership')}</TableHead>
                          <TableHead>{tMembership('payment')}</TableHead>
                          <TableHead>{tDocuments('documents')}</TableHead>
                          <TableHead className="text-right">{tCommon('actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {regularMembers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center text-muted-foreground">
                              {t('noRegularMembersFound')}
                            </TableCell>
                          </TableRow>
                        ) : (
                          regularMembers.map((member) => (
                            <TableRow key={member.id}>
                              <TableCell className="font-medium">
                                {member.name} {member.surname}
                              </TableCell>
                              <TableCell>{member.email}</TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {member.role?.includes('board') && (
                                    <Badge>{tRoles('board')}</Badge>
                                  )}
                                  <Badge variant="outline">{tRoles('member')}</Badge>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm max-w-xs truncate">
                                {getFunctionNames(member.functions || [], functions)}
                              </TableCell>
                              <TableCell>
                                {member.active_membership ? (
                                  <div className="flex flex-col gap-1">
                                    <Badge variant="default">
                                      {member.active_membership.membership_types?.name || tCommon('active')}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {member.active_membership.member_number}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {member.active_membership.auto_renew ? tMembership('renewal') : tMembership('until')}: {new Date(member.active_membership.end_date).toLocaleDateString()}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">{tMembership('noMembership')}</span>
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
                                    {tMembership(`paymentStatus.${member.active_membership.payment_status}`)}
                                  </Badge>
                                ) : (
                                  <span className="text-sm text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {getDocumentStatusBadge(member.document_status, member, tDocuments)}
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

            {/* Short-term Members */}
            <TabsContent value="short-term">
              <Card>
                <CardHeader>
                  <CardTitle>{t('shortTermMembers')}</CardTitle>
                  <CardDescription>
                    {shortTermMembers.length} {tMembership('category.shortTerm').toLowerCase()} {shortTermMembers.length === 1 ? t('member') : t('members')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{tCommon('name')}</TableHead>
                          <TableHead>{tCommon('email')}</TableHead>
                          <TableHead>{tRoles('roles')}</TableHead>
                          <TableHead>{tRoles('functions')}</TableHead>
                          <TableHead>{tMembership('membership')}</TableHead>
                          <TableHead>{tMembership('payment')}</TableHead>
                          <TableHead>{tDocuments('documents')}</TableHead>
                          <TableHead className="text-right">{tCommon('actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {shortTermMembers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center text-muted-foreground">
                              {t('noShortTermMembersFound')}
                            </TableCell>
                          </TableRow>
                        ) : (
                          shortTermMembers.map((member) => (
                            <TableRow key={member.id}>
                              <TableCell className="font-medium">
                                {member.name} {member.surname}
                              </TableCell>
                              <TableCell>{member.email}</TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {member.role?.includes('board') && (
                                    <Badge>{tRoles('board')}</Badge>
                                  )}
                                  <Badge variant="outline">{tRoles('member')}</Badge>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm max-w-xs truncate">
                                {getFunctionNames(member.functions || [], functions)}
                              </TableCell>
                              <TableCell>
                                {member.active_membership ? (
                                  <div className="flex flex-col gap-1">
                                    <Badge variant="default">
                                      {member.active_membership.membership_types?.name || tCommon('active')}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {member.active_membership.member_number}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {member.active_membership.auto_renew ? tMembership('renewal') : tMembership('until')}: {new Date(member.active_membership.end_date).toLocaleDateString()}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">{tMembership('noMembership')}</span>
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
                                    {tMembership(`paymentStatus.${member.active_membership.payment_status}`)}
                                  </Badge>
                                ) : (
                                  <span className="text-sm text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {getDocumentStatusBadge(member.document_status, member, tDocuments)}
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
          </Tabs>
        </TabsContent>

        <TabsContent value="inactive" className="space-y-4">
          {/* Info Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('inactiveMembers')}</AlertTitle>
            <AlertDescription>
              {t('inactiveMembersDescription')}
            </AlertDescription>
          </Alert>

          {/* Member Category Tabs */}
          <Tabs defaultValue="regular" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">
                {t('allMembers')}
                <Badge variant="secondary" className="ml-2">{inactiveMembers.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="regular">
                {t('regularMembers')}
                <Badge variant="secondary" className="ml-2">{inactiveRegularMembers.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="short-term">
                {t('shortTermMembers')}
                <Badge variant="secondary" className="ml-2">{inactiveShortTermMembers.length}</Badge>
              </TabsTrigger>
            </TabsList>

            {/* All Inactive Members */}
            <TabsContent value="all">
              <Card>
                <CardHeader>
                  <CardTitle>{t('allInactiveMembers')}</CardTitle>
                  <CardDescription>
                    {inactiveMembers.length} {tCommon('inactive')} {inactiveMembers.length === 1 ? t('member') : t('members')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{tCommon('name')}</TableHead>
                          <TableHead>{tCommon('email')}</TableHead>
                          <TableHead>{tMembership('membershipStatus')}</TableHead>
                          <TableHead>{tMembership('lastActive')}</TableHead>
                          <TableHead className="text-right">{tCommon('actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inactiveMembers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                              {t('noInactiveMembers')}
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
                                    <Badge variant="destructive">{tMembership('expired')}</Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {member.active_membership.member_number}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {tMembership('ended')}: {new Date(member.active_membership.end_date).toLocaleDateString()}
                                    </span>
                                  </div>
                                ) : (
                                  <Badge variant="outline">{tMembership('noMembership')}</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {member.active_membership
                                  ? new Date(member.active_membership.end_date).toLocaleDateString()
                                  : t('never')}
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

            {/* Inactive Regular Members */}
            <TabsContent value="regular">
              <Card>
                <CardHeader>
                  <CardTitle>{t('inactiveRegularMembers')}</CardTitle>
                  <CardDescription>
                    {inactiveRegularMembers.length} {tCommon('inactive')} {tMembership('category.regular').toLowerCase()} {inactiveRegularMembers.length === 1 ? t('member') : t('members')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{tCommon('name')}</TableHead>
                          <TableHead>{tCommon('email')}</TableHead>
                          <TableHead>{tMembership('membershipStatus')}</TableHead>
                          <TableHead>{tMembership('lastActive')}</TableHead>
                          <TableHead className="text-right">{tCommon('actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inactiveRegularMembers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                              {t('noInactiveRegularMembers')}
                            </TableCell>
                          </TableRow>
                        ) : (
                          inactiveRegularMembers.map((member) => (
                            <TableRow key={member.id}>
                              <TableCell className="font-medium">
                                {member.name} {member.surname}
                              </TableCell>
                              <TableCell>{member.email}</TableCell>
                              <TableCell>
                                {member.active_membership ? (
                                  <div className="flex flex-col gap-1">
                                    <Badge variant="destructive">{tMembership('expired')}</Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {member.active_membership.member_number}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {tMembership('ended')}: {new Date(member.active_membership.end_date).toLocaleDateString()}
                                    </span>
                                  </div>
                                ) : (
                                  <Badge variant="outline">{tMembership('noMembership')}</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {member.active_membership
                                  ? new Date(member.active_membership.end_date).toLocaleDateString()
                                  : t('never')}
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

            {/* Inactive Short-term Members */}
            <TabsContent value="short-term">
              <Card>
                <CardHeader>
                  <CardTitle>{t('inactiveShortTermMembers')}</CardTitle>
                  <CardDescription>
                    {inactiveShortTermMembers.length} {tCommon('inactive')} {tMembership('category.shortTerm').toLowerCase()} {inactiveShortTermMembers.length === 1 ? t('member') : t('members')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{tCommon('name')}</TableHead>
                          <TableHead>{tCommon('email')}</TableHead>
                          <TableHead>{tMembership('membershipStatus')}</TableHead>
                          <TableHead>{tMembership('lastActive')}</TableHead>
                          <TableHead className="text-right">{tCommon('actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inactiveShortTermMembers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                              {t('noInactiveShortTermMembers')}
                            </TableCell>
                          </TableRow>
                        ) : (
                          inactiveShortTermMembers.map((member) => (
                            <TableRow key={member.id}>
                              <TableCell className="font-medium">
                                {member.name} {member.surname}
                              </TableCell>
                              <TableCell>{member.email}</TableCell>
                              <TableCell>
                                {member.active_membership ? (
                                  <div className="flex flex-col gap-1">
                                    <Badge variant="destructive">{tMembership('expired')}</Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {member.active_membership.member_number}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {tMembership('ended')}: {new Date(member.active_membership.end_date).toLocaleDateString()}
                                    </span>
                                  </div>
                                ) : (
                                  <Badge variant="outline">{tMembership('noMembership')}</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {member.active_membership
                                  ? new Date(member.active_membership.end_date).toLocaleDateString()
                                  : t('never')}
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
          </Tabs>
        </TabsContent>

        <TabsContent value="functions" className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertTitle>{t('boardMemberAccess')}</AlertTitle>
            <AlertDescription>
              {t('boardMemberAccessDescription')}
            </AlertDescription>
          </Alert>
          <FunctionsSection functions={functions} categories={categories} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
