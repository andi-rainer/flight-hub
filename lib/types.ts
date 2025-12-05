/**
 * Additional TypeScript types for the application
 * This file supplements the auto-generated database.types.ts
 */

import { Database } from './database.types'

// Re-export Database type for components that need it
export type { Database }

// Helper type to get Insert types from Tables
type InsertType<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

// Helper type to get Update types from Tables
type UpdateType<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

// Helper type to get Row types from Tables
type RowType<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

// Helper type to get Row types from Views
type ViewType<T extends keyof Database['public']['Views']> =
  Database['public']['Views'][T]['Row']

// ============================================================================
// Insert Types
// ============================================================================

export type AccountInsert = InsertType<'accounts'>
export type ReservationInsert = InsertType<'reservations'>
export type CostCenterInsert = InsertType<'cost_centers'>
export type CostCenterTransactionInsert = InsertType<'cost_center_transactions'>
export type MembershipTypeInsert = InsertType<'membership_types'>
export type UserMembershipInsert = InsertType<'user_memberships'>
export type AirportInsert = InsertType<'airports'>
export type AircraftAirportFeeInsert = InsertType<'aircraft_airport_fees'>
export type FunctionMasterInsert = InsertType<'functions_master'>
export type OperationTypeInsert = InsertType<'operation_types'>

// ============================================================================
// Update Types
// ============================================================================

export type AccountUpdate = UpdateType<'accounts'>
export type ReservationUpdate = UpdateType<'reservations'>
export type CostCenterUpdate = UpdateType<'cost_centers'>
export type MembershipTypeUpdate = UpdateType<'membership_types'>
export type AirportUpdate = UpdateType<'airports'>
export type AircraftAirportFeeUpdate = UpdateType<'aircraft_airport_fees'>
export type FunctionMasterUpdate = UpdateType<'functions_master'>
export type OperationTypeUpdate = UpdateType<'operation_types'>

// ============================================================================
// Row Types (basic table types)
// ============================================================================

export type Plane = RowType<'planes'>
export type User = RowType<'users'>
export type Document = RowType<'documents'>
export type OperationType = RowType<'operation_types'>
export type MembershipType = RowType<'membership_types'>
export type UserMembership = RowType<'user_memberships'>
export type DocumentDefinition = RowType<'document_definitions'>
export type DocumentEndorsementPrivilege = RowType<'document_endorsement_privileges'>
export type FlightlogWithTimes = ViewType<'flightlog_with_times'>
export type ReservationStatus = Database['public']['Enums']['reservation_status']
export type FunctionMaster = RowType<'functions_master'>
export type Endorsement = RowType<'endorsements'>
export type VoucherType = RowType<'voucher_types'>
export type AircraftCgLimit = RowType<'aircraft_cg_limits'>
export type AircraftStation = RowType<'aircraft_stations'>

// User types with additional fields
export type UserProfile = User & { function_codes?: string[] }
export type UsersWithFunctions = ViewType<'users_with_functions'>

// Additional Insert types for commonly used tables
export type PlaneInsert = InsertType<'planes'>
export type PlaneUpdate = UpdateType<'planes'>
export type FlightlogInsert = InsertType<'flightlog'>
export type FlightlogUpdate = UpdateType<'flightlog'>

// Tables update type (generic)
export type TablesUpdate<T extends keyof Database['public']['Tables']> = UpdateType<T>

// ============================================================================
// View Types
// ============================================================================

export type ActiveReservation = ViewType<'active_reservations'>

// ============================================================================
// Custom Types
// ============================================================================

/**
 * Uncharged flight with all computed fields
 */
export interface UnchargedFlight extends RowType<'flightlog'> {
  // Computed fields from the view
  billing_unit: string | null
  operation_rate: number | null
  plane_default_rate: number | null
  calculated_amount: number | null
  flight_amount: number | null
  default_cost_center_id: string | null
  default_cost_center_name: string | null
  flight_time_hours: number | null
  // Aircraft info
  tail_number: string | null
  plane_type: string | null
  // Pilot info
  pilot_name: string | null
  pilot_surname: string | null
  pilot_email: string | null
  copilot_name: string | null
  copilot_surname: string | null
  copilot_email: string | null
  // Operation type info
  operation_type_name: string | null
}

/**
 * Airport with aircraft fees
 */
export interface AirportWithAircraftFees extends RowType<'airports'> {
  aircraft_fees: Array<RowType<'aircraft_airport_fees'> & {
    plane: {
      id: string
      tail_number: string
    }
  }>
}

/**
 * Aircraft airport fee row type
 */
export type AircraftAirportFee = RowType<'aircraft_airport_fees'>

/**
 * Function with statistics
 */
export interface FunctionWithStats extends Omit<RowType<'functions_master'>, 'active'> {
  active: boolean | null
  category_name_en: string | null
  category_name_de: string | null
  category_code: string | null
  user_count: number | null
  active_user_count: number | null
}

/**
 * Timeframe type for bookings
 */
export interface Timeframe {
  id: string
  operation_day_id: string | null
  start_time: string
  end_time: string
  max_bookings: number | null
  current_bookings: number | null
  overbooking_allowed: number | null
  active: boolean | null
  created_by: string | null
  created_at: string | null
  updated_at: string | null
}

/**
 * Ticket type from store
 */
export interface TicketType extends Omit<RowType<'ticket_types'>, 'features' | 'active'> {
  active: boolean | null
  features: Array<{ text: string; text_de: string }>
}

/**
 * User balance from view
 */
export type UserBalance = ViewType<'user_balances'>

/**
 * Cost center row type
 */
export type CostCenter = RowType<'cost_centers'>

/**
 * Component with status for maintenance
 */
export interface ComponentWithStatus {
  id: string
  plane_id: string
  component_type: 'engine' | 'propeller' | 'avionics' | 'landing_gear' | 'other' | null
  serial_number: string | null
  manufacturer: string | null
  model: string | null
  hours_at_installation: number | null
  cycles_at_installation: number | null
  installation_date: string | null
  last_overhaul_date: string | null
  last_overhaul_hours: number | null
  life_limit_hours: number | null
  life_limit_cycles: number | null
  life_limit_years: number | null
  tbo_hours: number | null
  tbo_cycles: number | null
  notes: string | null
  created_by: string
  created_at: string | null
  updated_at: string | null
  component_hours_offset: number | null
  removal_date: string | null
  removal_reason: string | null
  removed_by: string | null
  status: 'current' | 'removed' | null
  component_name: string | null
  component_type_name: string | null
  aircraft_total_hours: number | null
  component_current_hours: number | null
  position: string | null
}

/**
 * Aircraft with availability information
 */
export interface AircraftWithAvailability extends RowType<'planes'> {
  has_upcoming_reservations: boolean
  blocking_documents_count: number
}

/**
 * PDF Design Template - Enhanced with Visual Designer
 */
export interface PDFTemplate extends RowType<'pdf_design_templates'> {
  layout_type?: 'ticket' | 'full-photo' | 'certificate' | 'minimal'
  background_image_url?: string | null
  background_opacity?: number | null
  background_position?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'stretch' | null
  logo_url?: string | null
  logo_position?: {
    x: number
    y: number
    width: number
    height: number
  }
  logo_enabled?: boolean | null
  text_overlay_enabled?: boolean | null
  text_overlay_color?: string | null
  text_overlay_position?: {
    x: number
    y: number
    width: string | number
    height: number
  }
  decorative_images?: Array<{
    url: string
    x: number
    y: number
    width: number
    height: number
    name?: string
  }>
  qr_config?: {
    position: string
    x: number
    y: number
    size: number
    backgroundColor: string
    foregroundColor: string
    includeMargin: boolean
  }
  font_config?: {
    titleFont: string
    titleSize: number
    titleColor: string
    bodyFont: string
    bodySize: number
    bodyColor: string
    labelFont: string
    labelSize: number
    labelColor: string
  }
  border_config?: {
    enabled: boolean
    style: string
    width: number
    color: string
    cornerRadius: number
    decorative: boolean
  }
  content_zones?: {
    header: { x: number; y: number; width: number; height: number }
    body: { x: number; y: number; width: number; height: number }
    footer: { x: number; y: number; width: number; height: number }
  }
  page_config?: {
    width: number
    height: number
    orientation: 'portrait' | 'landscape'
    margins: { top: number; right: number; bottom: number; left: number }
  }
  layout_config: {
    primaryColor?: string
    secondaryColor?: string
    accentColor?: string
    textColor?: string
    backgroundColor?: string
    headerHeight?: number
    qrPosition?: 'right' | 'bottom' | 'center'
    qrSize?: number
    fontFamily?: string
    headerFont?: string
  }
}

/**
 * Template Asset for designer
 */
export interface TemplateAsset extends RowType<'template_assets'> {
  asset_type: 'background' | 'decorative' | 'logo' | 'border'
  tags?: string[]
}

/**
 * Voucher with related data
 */
export interface VoucherWithDetails extends RowType<'vouchers'> {
  voucher_type: VoucherType | null
  design_template: PDFTemplate | null
}
