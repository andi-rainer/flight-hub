import { SYSTEM_FUNCTIONS, type SystemFunction } from '@/lib/constants/system-functions'
import type { User } from '@/lib/database.types'

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
  'skydive.manifest.view': ['*'],
  'skydive.manifest.create': [
    SYSTEM_FUNCTIONS.TANDEM_MASTER,
    SYSTEM_FUNCTIONS.SKYDIVE_INSTRUCTOR,
    SYSTEM_FUNCTIONS.MANIFEST_COORDINATOR,
    'board',
  ],
  'skydive.manifest.edit': [
    SYSTEM_FUNCTIONS.TANDEM_MASTER,
    SYSTEM_FUNCTIONS.SKYDIVE_INSTRUCTOR,
    SYSTEM_FUNCTIONS.MANIFEST_COORDINATOR,
    'board',
  ],
  'skydive.manifest.close': [SYSTEM_FUNCTIONS.MANIFEST_COORDINATOR, 'board'],
  'skydive.manifest.delete': ['board'],

  // Member Management Permissions
  'members.view.all': ['board'],
  'members.view.basic': ['*'], // All members can see basic info for logging purposes
  'members.edit': ['board'],
  'members.create': ['board'],
  'members.delete': ['board'],

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
  'aircraft.create': ['board'],
  'aircraft.delete': ['board'],

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
} as const

export type Permission = keyof typeof PERMISSIONS

/**
 * Check if a user has a specific permission
 */
export function hasPermission(user: User | null | undefined, permission: Permission): boolean {
  if (!user) return false

  // Board members have all permissions
  if (user.role && (user.role.includes('board') || user.role === 'board')) {
    return true
  }

  const allowedFunctions = PERMISSIONS[permission]

  // Permission available to everyone
  if (allowedFunctions.includes('*')) {
    return true
  }

  // Check if user has required role
  if (allowedFunctions.includes('board')) {
    if (user.role && (user.role.includes('board') || user.role === 'board')) {
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
  user: User | null | undefined,
  permissions: Permission[]
): boolean {
  return permissions.some(permission => hasPermission(user, permission))
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(
  user: User | null | undefined,
  permissions: Permission[]
): boolean {
  return permissions.every(permission => hasPermission(user, permission))
}

/**
 * Get function codes from user object
 * This helper extracts function codes from various possible user data structures
 */
function getUserFunctionCodes(user: User): string[] {
  // If functions are already loaded as an array of codes
  if (Array.isArray(user.functions)) {
    // Check if it's an array of function objects
    if (user.functions.length > 0 && typeof user.functions[0] === 'object') {
      return (user.functions as any[]).map(f => f.code).filter(Boolean)
    }
    // Or array of codes directly
    return user.functions.filter(f => typeof f === 'string')
  }

  return []
}

/**
 * Check if user can edit a specific flight log entry
 */
export function canEditFlightLog(
  user: User | null | undefined,
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
export function getUserPermissions(user: User | null | undefined): Permission[] {
  if (!user) return []

  return (Object.keys(PERMISSIONS) as Permission[]).filter(permission =>
    hasPermission(user, permission)
  )
}

/**
 * Permission check hook for use in components
 * Returns a function to check permissions
 */
export function createPermissionChecker(user: User | null | undefined) {
  return {
    can: (permission: Permission) => hasPermission(user, permission),
    canAny: (permissions: Permission[]) => hasAnyPermission(user, permissions),
    canAll: (permissions: Permission[]) => hasAllPermissions(user, permissions),
    canEditFlightLog: (flightLog: Parameters<typeof canEditFlightLog>[1]) =>
      canEditFlightLog(user, flightLog),
  }
}
