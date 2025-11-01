/**
 * Formatting utilities for consistent display across the application
 */

/**
 * Format hours as hh:mm (e.g., 123.5 → "123:30")
 * @param hours - Decimal hours
 * @returns Formatted string in hh:mm format
 */
export function formatHours(hours: number | null | undefined): string {
  if (hours === null || hours === undefined || isNaN(hours)) {
    return '-'
  }

  const wholeHours = Math.floor(hours)
  const minutes = Math.round((hours - wholeHours) * 60)

  return `${wholeHours}:${minutes.toString().padStart(2, '0')}`
}

/**
 * Format currency as Euro (e.g., 1234.56 → "€1,234.56")
 * @param amount - Amount in decimal
 * @param showCurrency - Whether to show the € symbol (default: true)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number | null | undefined, showCurrency: boolean = true): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return showCurrency ? '€0.00' : '0.00'
  }

  const formatted = new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)

  return showCurrency ? `€${formatted}` : formatted
}

/**
 * Format currency as Euro with symbol prefix (alternative version using Intl with currency)
 * @param amount - Amount in decimal
 * @returns Formatted currency string
 */
export function formatEuro(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '€0,00'
  }

  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

/**
 * Parse hh:mm format back to decimal hours
 * @param timeString - Time string in hh:mm format (e.g., "123:30")
 * @returns Decimal hours (e.g., 123.5)
 */
export function parseHoursFromFormat(timeString: string): number {
  const parts = timeString.split(':')
  if (parts.length !== 2) {
    return 0
  }

  const hours = parseInt(parts[0], 10)
  const minutes = parseInt(parts[1], 10)

  if (isNaN(hours) || isNaN(minutes)) {
    return 0
  }

  return hours + (minutes / 60)
}

/**
 * Format percentage (e.g., 0.75 → "75%")
 * @param value - Decimal value (0-1) or percentage (0-100)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number | null | undefined, decimals: number = 1): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '-'
  }

  return `${value.toFixed(decimals)}%`
}
