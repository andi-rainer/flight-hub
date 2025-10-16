import type { User } from '@/lib/database.types'

/**
 * Check if a user is a board member
 * Board members have 'board' in their role array
 */
export function isBoardMember(user: User | null): boolean {
  if (!user) return false
  return user.role?.includes('board') ?? false
}

/**
 * Check if a user is a member
 * Members have 'member' in their role array
 */
export function isMember(user: User | null): boolean {
  if (!user) return false
  return user.role?.includes('member') ?? false
}

/**
 * Get user initials from their name and surname
 * Used for avatar displays
 */
export function getUserInitials(user: User | null): string {
  if (!user) return '??'

  const firstInitial = user.name?.charAt(0)?.toUpperCase() ?? ''
  const lastInitial = user.surname?.charAt(0)?.toUpperCase() ?? ''

  return `${firstInitial}${lastInitial}` || '??'
}

/**
 * Get user full name
 */
export function getUserFullName(user: User | null): string {
  if (!user) return 'Unknown User'
  return `${user.name} ${user.surname}`.trim() || user.email
}

/**
 * Get user display name (first name or email fallback)
 */
export function getUserDisplayName(user: User | null): string {
  if (!user) return 'Guest'
  return user.name || user.email
}
