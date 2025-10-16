import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Shield, AlertCircle } from 'lucide-react'
import { InviteUserDialog } from './components/invite-user-dialog'
import { EditMemberDialog } from './components/edit-member-dialog'
import { MemberDocumentsDialog } from './components/member-documents-dialog'
import type { User, FunctionMaster, Document } from '@/lib/database.types'

interface UserWithDocuments extends User {
  documents: Document[]
  document_status: 'ok' | 'warning' | 'expired'
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

  // Get all users with their documents
  const { data: users, error } = await supabase
    .from('users')
    .select(`
      *,
      documents:documents!documents_user_id_fkey(*)
    `)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching members:', error)
    return []
  }

  if (!users) return []

  // Calculate document status for each user
  return users.map(user => {
    const userDocs = user.documents as Document[]

    // Check for expired or expiring documents
    let documentStatus: 'ok' | 'warning' | 'expired' = 'ok'

    if (userDocs.length > 0) {
      const now = new Date()

      for (const doc of userDocs) {
        if (doc.expiry_date) {
          const expiry = new Date(doc.expiry_date)
          const daysUntilExpiry = Math.floor(
            (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          )

          if (daysUntilExpiry < 0) {
            documentStatus = 'expired'
            break
          } else if (daysUntilExpiry < 45 && documentStatus === 'ok') {
            documentStatus = 'warning'
          }
        }
      }
    }

    return {
      ...user,
      documents: userDocs,
      document_status: documentStatus,
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

function getDocumentStatusBadge(status: 'ok' | 'warning' | 'expired') {
  switch (status) {
    case 'expired':
      return <Badge variant="destructive">Expired Docs</Badge>
    case 'warning':
      return <Badge className="bg-orange-500 hover:bg-orange-600">Expiring Soon</Badge>
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

  const [members, functions] = await Promise.all([getMembers(), getFunctions()])

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

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Member Management</AlertTitle>
        <AlertDescription>
          Invite new members, assign functions, and approve member documents. Document status
          indicators show if licenses or certifications are expired or expiring soon.
        </AlertDescription>
      </Alert>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Club Members</CardTitle>
          <CardDescription>
            {members.length} {members.length === 1 ? 'member' : 'members'} registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>License</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Functions</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No members found
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.name} {member.surname}
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell className="text-sm">
                        {member.license_number || '-'}
                      </TableCell>
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
                        <div className="flex items-center gap-2">
                          {getDocumentStatusBadge(member.document_status)}
                          <span className="text-sm text-muted-foreground">
                            ({member.documents.length})
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <MemberDocumentsDialog member={member} documents={member.documents} />
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
    </div>
  )
}
