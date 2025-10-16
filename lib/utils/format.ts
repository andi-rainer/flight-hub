import { format, formatDistance, differenceInMinutes } from 'date-fns'

/**
 * Formats a date for display in the UI
 * @param date - Date string or Date object
 * @returns Formatted date string (e.g., "Oct 16, 2025")
 */
export function formatDate(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy')
}

/**
 * Formats a time for display in the UI (24-hour format)
 * @param date - Date string or Date object
 * @returns Formatted time string (e.g., "14:30")
 */
export function formatTime(date: string | Date): string {
  return format(new Date(date), 'HH:mm')
}

/**
 * Formats a date and time for display
 * @param date - Date string or Date object
 * @returns Formatted datetime string (e.g., "Oct 16, 2025 14:30")
 */
export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy HH:mm')
}

/**
 * Formats a relative time (e.g., "2 hours ago")
 * @param date - Date string or Date object
 * @returns Relative time string
 */
export function formatRelativeTime(date: string | Date): string {
  return formatDistance(new Date(date), new Date(), { addSuffix: true })
}

/**
 * Formats a currency amount
 * @param amount - Numeric amount
 * @param showSign - Whether to show + for positive amounts
 * @returns Formatted currency string (e.g., "$123.45" or "+$123.45")
 */
export function formatCurrency(amount: number, showSign = false): string {
  const formatted = `$${Math.abs(amount).toFixed(2)}`
  if (amount >= 0 && showSign) {
    return `+${formatted}`
  } else if (amount < 0) {
    return `-${formatted}`
  }
  return formatted
}

/**
 * Calculates flight time in hours from two timestamps
 * @param startTime - Start time string or Date object
 * @param endTime - End time string or Date object
 * @returns Flight time in hours (rounded to 1 decimal)
 */
export function calculateFlightHours(
  startTime: string | Date,
  endTime: string | Date
): number {
  const minutes = differenceInMinutes(new Date(endTime), new Date(startTime))
  return Math.round((minutes / 60) * 10) / 10 // Round to 1 decimal place
}

/**
 * Formats flight duration in hours
 * @param hours - Duration in hours
 * @returns Formatted string (e.g., "2.5h")
 */
export function formatFlightHours(hours: number): string {
  return `${hours.toFixed(1)}h`
}

/**
 * Formats a month name
 * @param date - Date string or Date object
 * @returns Month name (e.g., "October")
 */
export function formatMonth(date: string | Date): string {
  return format(new Date(date), 'MMMM')
}

/**
 * Formats a month and year
 * @param date - Date string or Date object
 * @returns Month and year (e.g., "October 2025")
 */
export function formatMonthYear(date: string | Date): string {
  return format(new Date(date), 'MMMM yyyy')
}
