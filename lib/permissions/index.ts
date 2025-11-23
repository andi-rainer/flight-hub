import { SYSTEM_FUNCTIONS } from '@/lib/constants/system-functions'
import type { User } from '@/lib/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Json } from '@/lib/database.types'

// Minimal type for permission checking - compatible with both User and UserProfile
export interface PermissionUser {
  id: string | null
  role?: string[] | null
  function_codes?: string[] | null
  functions?: Json | null
}

/**
 * Permission Matrix
 *
 * Defines which functions are required for specific permissions.
 * Board members always have all permissions regardless of functions.
 */
export const PERMISSIONS = {
  // Flight Log Permissions
  'flight.log.view': ['*'], // Everyone can view
  'flight.log.create': [SYSTEM_FUNCTIONS.PILOT, SYSTEM_FUNCTIONS.FLIGHT_INSTRUCTOR],
  'flight.log.edit.own': [SYSTEM_FUNCTIONS.PILOT, SYSTEM_FUNCTIONS.FLIGHT_INSTRUCTOR],
  'flight.log.edit.any': ['board'], // Board members can edit any
  'flight.log.delete': ['board'],
  'flight.log.approve': [SYSTEM_FUNCTIONS.CHIEF_PILOT, 'board'],
  'flight.log.lock': [SYSTEM_FUNCTIONS.CHIEF_PILOT, 'board'],

  // Skydive Manifest Permissions
  'manifest.view': ['*'],
  'manifest.operation_days.create': [SYSTEM_FUNCTIONS.MANIFEST_COORDINATOR, 'board'],
  'manifest.operation_days.edit': [SYSTEM_FUNCTIONS.MANIFEST_COORDINATOR, 'board'],
  'manifest.operation_days.delete': ['board'],
  'manifest.flights.create': [SYSTEM_FUNCTIONS.MANIFEST_COORDINATOR, 'board'],
  'manifest.flights.edit': [SYSTEM_FUNCTIONS.MANIFEST_COORDINATOR, 'board'],
  'manifest.flights.delete': [SYSTEM_FUNCTIONS.MANIFEST_COORDINATOR, 'board'],
  'manifest.jumpers.assign': [SYSTEM_FUNCTIONS.MANIFEST_COORDINATOR, 'board'],
  'manifest.jumpers.remove': [SYSTEM_FUNCTIONS.MANIFEST_COORDINATOR, 'board'],
  'manifest.payments.update': [SYSTEM_FUNCTIONS.MANIFEST_COORDINATOR, SYSTEM_FUNCTIONS.TREASURER, 'board'],
  'manifest.reports.view': [SYSTEM_FUNCTIONS.TREASURER, 'board'],

  // Member Management Permissions
  'members.view.all': ['board', SYSTEM_FUNCTIONS.SECRETARY],
  'members.view.basic': ['*'], // All members can see basic info for logging purposes
  'members.edit': ['board', SYSTEM_FUNCTIONS.SECRETARY],
  'members.create': ['board', SYSTEM_FUNCTIONS.SECRETARY],
  'members.delete': ['board', SYSTEM_FUNCTIONS.SECRETARY],

  // Function Management Permissions
  'functions.view': ['board'],
  'functions.create': ['board'],
  'functions.edit': ['board'],
  'functions.delete.custom': ['board'], // Can only delete custom functions
  'functions.toggle.system': ['board'], // Can activate/deactivate system functions

  // Billing & Accounting Permissions
  'billing.view.own': ['*'],
  'billing.view.all': ['board', SYSTEM_FUNCTIONS.TREASURER],
  'billing.manage': ['board', SYSTEM_FUNCTIONS.TREASURER],
  'billing.transactions.create': ['board', SYSTEM_FUNCTIONS.TREASURER],
  'billing.transactions.reverse': ['board', SYSTEM_FUNCTIONS.TREASURER],

  // Voucher Permissions (for future implementation)
  'vouchers.view': ['board', SYSTEM_FUNCTIONS.MANIFEST_COORDINATOR],
  'vouchers.create': ['board'],
  'vouchers.redeem': [
    SYSTEM_FUNCTIONS.TANDEM_MASTER,
    SYSTEM_FUNCTIONS.MANIFEST_COORDINATOR,
    'board',
  ],

  // Aircraft Management
  'aircraft.view': ['*'],
  'aircraft.edit': ['board', SYSTEM_FUNCTIONS.CHIEF_PILOT],
  'aircraft.create': ['board', SYSTEM_FUNCTIONS.CHIEF_PILOT],
  'aircraft.delete': ['board'],
  'aircraft.documents.upload': ['board', SYSTEM_FUNCTIONS.CHIEF_PILOT],

  // Document Management
  'documents.view.own': ['*'],
  'documents.upload.own': ['*'],
  'documents.view.all': ['board'],
  'documents.approve': ['board'],
  'documents.delete': ['board'],

  // Settings & Administration
  'settings.view': ['*'],
  'settings.edit.own': ['*'],
  'settings.edit.system': ['board'],
  'settings.membership.manage': ['board'],
  'settings.tandem.manage': ['board', SYSTEM_FUNCTIONS.MANIFEST_COORDINATOR],
  'settings.airport_fees.manage': ['board', SYSTEM_FUNCTIONS.TREASURER],
} as const

export type Permission = keyof typeof PERMISSIONS

/**
 * Check if a user has a specific permission
 */
export function hasPermission(user: PermissionUser | null | undefined, permission: Permission): boolean {
  if (!user) return false

  // Board members have all permissions
  if (user.role && user.role.includes('board')) {
    return true
  }

  const allowedFunctions = PERMISSIONS[permission] as readonly string[]

  // Permission available to everyone
  if (allowedFunctions.includes('*')) {
    return true
  }

  // Check if user has required role
  if (allowedFunctions.includes('board')) {
    if (user.role && user.role.includes('board')) {
      return true
    }
  }

  // Check if user has any of the required functions
  // Assuming user has a functions field with function codes
  const userFunctionCodes = getUserFunctionCodes(user)
  return allowedFunctions.some(func => userFunctionCodes.includes(func))
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(
  user: PermissionUser | null | undefined,
  permissions: Permission[]
): boolean {
  return permissions.some(permission => hasPermission(user, permission))
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(
  user: PermissionUser | null | undefined,
  permissions: Permission[]
): boolean {
  return permissions.every(permission => hasPermission(user, permission))
}

/**
 * Get function codes from user object
 * This helper extracts function codes from various possible user data structures
 *
 * NOTE: Function codes should be loaded from user_functions table via joins
 * The User type should include a `function_codes` field (TEXT[]) when loaded with functions
 */
function getUserFunctionCodes(user: PermissionUser): string[] {
  // Check if function_codes array is available (from users_with_functions view)
  if ('function_codes' in user && Array.isArray(user.function_codes)) {
    return user.function_codes.filter((code): code is string => typeof code === 'string')
  }

  // Legacy support: If functions are loaded as an array of codes (old format)
  if (Array.isArray(user.functions)) {
    // Check if it's an array of function objects with code property
    if (user.functions.length > 0 && typeof user.functions[0] === 'object' && user.functions[0] !== null) {
      return (user.functions as Array<{ code?: string }>)
        .map(f => f.code)
        .filter((code): code is string => typeof code === 'string')
    }
    // Or array of codes directly
    return user.functions.filter((f): f is string => typeof f === 'string')
  }

  return []
}

/**
 * Check if user can edit a specific flight log entry
 */
export function canEditFlightLog(
  user: PermissionUser | null | undefined,
  flightLog: { pilot_id: string; copilot_id?: string | null; locked?: boolean; charged?: boolean }
): boolean {
  if (!user) return false

  // Board members can edit any flight log
  if (hasPermission(user, 'flight.log.edit.any')) {
    return true
  }

  // Cannot edit if locked
  if (flightLog.locked) {
    return false
  }

  // Cannot edit if charged (billed)
  if (flightLog.charged) {
    return false
  }

  // Can edit own flights
  if (flightLog.pilot_id === user.id || flightLog.copilot_id === user.id) {
    return hasPermission(user, 'flight.log.edit.own')
  }

  return false
}

/**
 * Get all permissions for a user (for debugging/admin UI)
 */
export function getUserPermissions(user: PermissionUser | null | undefined): Permission[] {
  if (!user) return []

  return (Object.keys(PERMISSIONS) as Permission[]).filter(permission =>
    hasPermission(user, permission)
  )
}

/**
 * Permission check hook for use in components
 * Returns a function to check permissions
 */
export function createPermissionChecker(user: PermissionUser | null | undefined) {
  return {
    can: (permission: Permission) => hasPermission(user, permission),
    canAny: (permissions: Permission[]) => hasAnyPermission(user, permissions),
    canAll: (permissions: Permission[]) => hasAllPermissions(user, permissions),
    canEditFlightLog: (flightLog: Parameters<typeof canEditFlightLog>[1]) =>
      canEditFlightLog(user, flightLog),
  }
}

// ============================================================================
// SERVER-SIDE HELPERS
// ============================================================================

/**
 * User type with function codes loaded
 * Use this type when you need permission checks with function data
 */
export type UserWithFunctions = User & {
  function_codes?: string[]
}

/**
 * Load user with their function codes from the database
 * This queries the users_with_functions view which includes function_codes
 *
 * @param supabase Supabase client instance
 * @param userId User ID to load
 * @returns User with function_codes array populated, or null if not found
 */
export async function getUserWithFunctions(
  supabase: SupabaseClient,
  userId: string
): Promise<UserWithFunctions | null> {
  const { data, error } = await supabase
    .from('users_with_functions')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error loading user with functions:', error)
    return null
  }

  return data as UserWithFunctions
}

/**
 * Load current authenticated user with their function codes
 *
 * @param supabase Supabase client instance (server-side)
 * @returns Current user with function_codes, or null if not authenticated
 */
export async function getCurrentUserWithFunctions(
  supabase: SupabaseClient
): Promise<UserWithFunctions | null> {
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    return null
  }

  return getUserWithFunctions(supabase, authUser.id)
}

/**
 * Check if the current user is authenticated and authorized (board member)
 * Useful for server actions that require board access
 *
 * @param supabase Supabase client instance (server-side)
 * @returns Object with user (if authorized) and error message
 */
export async function requireBoardMember(supabase: SupabaseClient): Promise<{
  user: UserWithFunctions | null
  error: string | null
}> {
  const user = await getCurrentUserWithFunctions(supabase)

  if (!user) {
    return { user: null, error: 'Not authenticated' }
  }

  if (!user.role?.includes('board')) {
    return { user: null, error: 'Not authorized - board members only' }
  }

  return { user, error: null }
}

/**
 * Check if the current user has a specific permission
 * Useful for server actions
 *
 * @param supabase Supabase client instance (server-side)
 * @param permission Permission to check
 * @returns Object with user (if has permission) and error message
 */
export async function requirePermission(
  supabase: SupabaseClient,
  permission: Permission
): Promise<{
  user: UserWithFunctions | null
  error: string | null
}> {
  const user = await getCurrentUserWithFunctions(supabase)

  if (!user) {
    return { user: null, error: 'Not authenticated' }
  }

  if (!hasPermission(user, permission)) {
    return { user: null, error: `Permission denied: ${permission}` }
  }

  return { user, error: null }
}

/**
 * Check if the current user has any of the specified permissions
 * Useful for server actions with multiple access paths
 *
 * @param supabase Supabase client instance (server-side)
 * @param permissions Permissions to check (user needs at least one)
 * @returns Object with user (if has any permission) and error message
 */
export async function requireAnyPermission(
  supabase: SupabaseClient,
  permissions: Permission[]
): Promise<{
  user: UserWithFunctions | null
  error: string | null
}> {
  const user = await getCurrentUserWithFunctions(supabase)

  if (!user) {
    return { user: null, error: 'Not authenticated' }
  }

  if (!hasAnyPermission(user, permissions)) {
    return {
      user: null,
      error: `Permission denied. Required one of: ${permissions.join(', ')}`,
    }
  }

  return { user, error: null }
}
