import { getUserProfile } from '@/lib/supabase/server'
import { redirect } from '@/navigation'
import { hasPermission, PERMISSIONS, type Permission } from '@/lib/permissions'
import { SYSTEM_FUNCTIONS } from '@/lib/constants/system-functions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, Lock, Eye } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

/**
 * Permissions Viewer Page
 *
 * Read-only view of the complete RBAC permission matrix.
 * Shows which functions are required for each permission.
 * Only accessible to board members.
 */
export default async function PermissionsPage() {
  const currentUser = await getUserProfile()

  if (!currentUser) {
    redirect('/login')
  }

  // Only board members can view permissions
  if (!currentUser.role?.includes('board')) {
    redirect('/dashboard?error=unauthorized')
  }

  // Group permissions by category
  const permissionsByCategory: Record<string, Permission[]> = {
    'Flight Log': [],
    'Skydive Manifest': [],
    'Member Management': [],
    'Function Management': [],
    'Billing & Accounting': [],
    'Vouchers': [],
    'Aircraft Management': [],
    'Document Management': [],
    'Settings & Administration': [],
  }

  // Categorize permissions
  Object.keys(PERMISSIONS).forEach((permission) => {
    const perm = permission as Permission
    if (perm.startsWith('flight.log.')) permissionsByCategory['Flight Log'].push(perm)
    else if (perm.startsWith('skydive.manifest.')) permissionsByCategory['Skydive Manifest'].push(perm)
    else if (perm.startsWith('members.')) permissionsByCategory['Member Management'].push(perm)
    else if (perm.startsWith('functions.')) permissionsByCategory['Function Management'].push(perm)
    else if (perm.startsWith('billing.') || perm.startsWith('vouchers.')) {
      if (perm.startsWith('billing.')) permissionsByCategory['Billing & Accounting'].push(perm)
      else permissionsByCategory['Vouchers'].push(perm)
    }
    else if (perm.startsWith('aircraft.')) permissionsByCategory['Aircraft Management'].push(perm)
    else if (perm.startsWith('documents.')) permissionsByCategory['Document Management'].push(perm)
    else if (perm.startsWith('settings.')) permissionsByCategory['Settings & Administration'].push(perm)
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Permission Matrix</h1>
        </div>
        <p className="text-muted-foreground mt-2">
          View all system permissions and their required functions. This is a read-only reference.
        </p>
      </div>

      {/* Info Alert */}
      <Alert>
        <Eye className="h-4 w-4" />
        <AlertTitle>Read-Only Reference</AlertTitle>
        <AlertDescription>
          Permissions are hardcoded for security and performance. To modify permissions, update the{' '}
          <code className="bg-muted px-1 py-0.5 rounded text-xs">/lib/permissions/index.ts</code> file
          and redeploy.
        </AlertDescription>
      </Alert>

      {/* Permission Categories */}
      <div className="space-y-6">
        {Object.entries(permissionsByCategory).map(([category, permissions]) => {
          if (permissions.length === 0) return null

          return (
            <Card key={category}>
              <CardHeader>
                <CardTitle>{category}</CardTitle>
                <CardDescription>
                  {permissions.length} permission{permissions.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {permissions.map((permission) => {
                    const requiredFunctions = PERMISSIONS[permission] as unknown as string[]
                    const isPublic = requiredFunctions.includes('*')
                    const isBoardOnly = requiredFunctions.includes('board') && requiredFunctions.length === 1

                    return (
                      <div
                        key={permission}
                        className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                              {permission}
                            </code>
                            {isPublic && (
                              <Badge variant="secondary" className="text-xs">
                                Public
                              </Badge>
                            )}
                            {isBoardOnly && (
                              <Badge variant="default" className="text-xs">
                                <Lock className="h-3 w-3 mr-1" />
                                Board Only
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {getPermissionDescription(permission)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 ml-4">
                          {isPublic ? (
                            <Badge variant="outline" className="text-xs">
                              All Users
                            </Badge>
                          ) : (
                            requiredFunctions.map((func) => (
                              <Badge key={func} variant="outline" className="text-xs">
                                {func === 'board' ? 'Board Member' : formatFunctionName(func)}
                              </Badge>
                            ))
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Get a human-readable description for a permission
 */
function getPermissionDescription(permission: Permission): string {
  const descriptions: Record<string, string> = {
    // Flight Log
    'flight.log.view': 'View flight log entries',
    'flight.log.create': 'Create new flight log entries',
    'flight.log.edit.own': 'Edit own flight log entries (as pilot or copilot)',
    'flight.log.edit.any': 'Edit any flight log entry',
    'flight.log.delete': 'Delete flight log entries',
    'flight.log.approve': 'Approve and lock flight log entries',
    'flight.log.lock': 'Lock flight log entries for billing',

    // Skydive Manifest
    'manifest.view': 'View skydive manifests',
    'manifest.operation_days.create': 'Create operation days',
    'manifest.operation_days.edit': 'Edit operation days',
    'manifest.flights.manage': 'Manage flights',
    'manifest.jumpers.manage': 'Manage jumpers',

    // Members
    'members.view.all': 'View all member details and documents',
    'members.view.basic': 'View basic member information',
    'members.edit': 'Edit member profiles and roles',
    'members.create': 'Invite and create new members',
    'members.delete': 'Delete member accounts',

    // Functions
    'functions.view': 'View all functions and assignments',
    'functions.create': 'Create custom functions',
    'functions.edit': 'Edit function details',
    'functions.delete.custom': 'Delete custom functions',
    'functions.toggle.system': 'Activate/deactivate system functions',

    // Billing
    'billing.view.own': 'View own account balance',
    'billing.view.all': 'View all member accounts and balances',
    'billing.manage': 'Manage billing and charge flights',
    'billing.transactions.create': 'Create manual transactions',
    'billing.transactions.reverse': 'Reverse transactions',

    // Vouchers
    'vouchers.view': 'View voucher records',
    'vouchers.create': 'Create new vouchers',
    'vouchers.redeem': 'Redeem vouchers for flights',

    // Aircraft
    'aircraft.view': 'View aircraft list and details',
    'aircraft.edit': 'Edit aircraft information',
    'aircraft.create': 'Add new aircraft',
    'aircraft.delete': 'Delete aircraft',
    'aircraft.documents.upload': 'Upload documents for aircraft',

    // Documents
    'documents.view.own': 'View and upload own documents',
    'documents.upload.own': 'Upload own documents',
    'documents.view.all': 'View all member documents',
    'documents.approve': 'Approve or reject documents',
    'documents.delete': 'Delete documents',

    // Settings
    'settings.view': 'View settings pages',
    'settings.edit.own': 'Edit own profile settings',
    'settings.edit.system': 'Edit system settings',
    'settings.membership.manage': 'Manage user memberships',
    'settings.tandem.manage': 'Manage tandem registration settings',
    'settings.airport_fees.manage': 'Manage airport fees and aircraft-specific pricing',
  }

  return descriptions[permission] || 'No description available'
}

/**
 * Format function code to human-readable name
 */
function formatFunctionName(code: string): string {
  return code
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
