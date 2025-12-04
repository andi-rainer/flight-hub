'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Server actions for voucher management
 */

// ============================================================================
// AUTHORIZATION HELPER
// ============================================================================

async function verifyBoardOrManifest() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { authorized: false, error: 'Not authenticated', supabase: null, userId: null }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const isBoard = profile?.role?.includes('board')

  // Check if user is manifest coordinator
  const { data: manifestCoordFunc } = await supabase
    .from('functions_master')
    .select('id')
    .eq('code', 'manifest_coordinator')
    .single()

  const manifestFuncId = manifestCoordFunc?.id

  let isManifest = false
  if (manifestFuncId) {
    const { data: manifestFunc } = await supabase
      .from('user_functions')
      .select('function_id')
      .eq('user_id', user.id)
      .eq('function_id', manifestFuncId)
      .single()

    isManifest = !!manifestFunc
  }

  if (!isBoard && !isManifest) {
    return { authorized: false, error: 'Not authorized - board or manifest coordinator only', supabase: null, userId: null }
  }

  return { authorized: true, supabase, userId: user.id }
}

// ============================================================================
// GET VOUCHERS
// ============================================================================

export async function getVouchers(filters?: {
  status?: string
  voucherTypeId?: string
  searchCode?: string
  searchEmail?: string
  dateFrom?: string
  dateTo?: string
}) {
  const auth = await verifyBoardOrManifest()
  if (!auth.authorized || !auth.supabase) {
    return { success: false, error: auth.error }
  }

  let query = auth.supabase
    .from('vouchers')
    .select(`
      *,
      voucher_type:voucher_types(*),
      redeemed_by_user:users!vouchers_redeemed_by_fkey(id, name, surname),
      redeemed_for_user:users!vouchers_redeemed_for_user_id_fkey(id, name, surname),
      reserved_booking:ticket_bookings!vouchers_reserved_booking_id_fkey(
        id,
        booking_code,
        operation_day:skydive_operation_days(operation_date),
        timeframe:manifest_booking_timeframes(start_time, end_time)
      )
    `)

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.voucherTypeId) {
    query = query.eq('voucher_type_id', filters.voucherTypeId)
  }

  if (filters?.searchCode) {
    query = query.ilike('voucher_code', `%${filters.searchCode}%`)
  }

  if (filters?.searchEmail) {
    query = query.ilike('purchaser_email', `%${filters.searchEmail}%`)
  }

  if (filters?.dateFrom) {
    query = query.gte('purchase_date', filters.dateFrom)
  }

  if (filters?.dateTo) {
    query = query.lte('purchase_date', filters.dateTo)
  }

  const { data, error } = await query.order('purchase_date', { ascending: false })

  if (error) {
    console.error('Error fetching vouchers:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

// ============================================================================
// VALIDATE VOUCHER
// ============================================================================

export async function validateVoucherCode(code: string) {
  const supabase = await createClient()

  const { data: voucher, error } = await supabase
    .from('vouchers')
    .select(`
      *,
      voucher_type:voucher_types(*)
    `)
    .eq('voucher_code', code.toUpperCase())
    .single()

  if (error || !voucher) {
    return { valid: false, error: 'Voucher not found' }
  }

  if (voucher.status !== 'active') {
    return { valid: false, error: `Voucher is ${voucher.status}` }
  }

  if (voucher.valid_until && new Date(voucher.valid_until) < new Date()) {
    return { valid: false, error: 'Voucher has expired' }
  }

  return { valid: true, voucher }
}

// ============================================================================
// REDEEM VOUCHER
// ============================================================================

export async function redeemVoucher(data: {
  voucherId: string
  flightJumperId: string
  userId: string
}) {
  const auth = await verifyBoardOrManifest()
  if (!auth.authorized || !auth.supabase) {
    return { success: false, error: auth.error }
  }

  // Verify voucher is valid
  const { data: voucher } = await auth.supabase
    .from('vouchers')
    .select('*')
    .eq('id', data.voucherId)
    .single()

  if (!voucher) {
    return { success: false, error: 'Voucher not found' }
  }

  if (voucher.status !== 'active') {
    return { success: false, error: `Cannot redeem voucher - status is ${voucher.status}` }
  }

  // Redeem voucher
  const { error } = await auth.supabase
    .from('vouchers')
    .update({
      status: 'redeemed',
      redeemed_at: new Date().toISOString(),
      redeemed_by: auth.userId,
      redeemed_for_user_id: data.userId,
      redeemed_for_flight_jumper_id: data.flightJumperId,
    })
    .eq('id', data.voucherId)

  if (error) {
    console.error('Error redeeming voucher:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/vouchers')
  revalidatePath('/manifest')
  return { success: true }
}

// ============================================================================
// CANCEL VOUCHER
// ============================================================================

export async function cancelVoucher(voucherId: string, reason: string) {
  const auth = await verifyBoardOrManifest()
  if (!auth.authorized || !auth.supabase) {
    return { success: false, error: auth.error }
  }

  const { error } = await auth.supabase
    .from('vouchers')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: auth.userId,
      cancellation_reason: reason,
    })
    .eq('id', voucherId)

  if (error) {
    console.error('Error cancelling voucher:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/vouchers')
  return { success: true }
}

// ============================================================================
// CREATE MANUAL VOUCHER (Board only)
// ============================================================================

export async function createManualVoucher(data: {
  voucherTypeId: string
  purchaserName: string
  purchaserEmail: string
  purchaserPhone?: string
  pricePaid: number
  validUntil?: string
  notes?: string
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile?.role?.includes('board')) {
    return { success: false, error: 'Not authorized - board members only' }
  }

  // Get voucher type to use its code prefix
  const { data: voucherType } = await supabase
    .from('voucher_types')
    .select('code_prefix')
    .eq('id', data.voucherTypeId)
    .single()

  if (!voucherType) {
    return { success: false, error: 'Voucher type not found' }
  }

  const prefix = voucherType.code_prefix || 'TDM'

  // Generate voucher code
  const year = new Date().getFullYear()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  const voucherCode = `${prefix}-${year}-${random}`

  const { data: voucher, error } = await supabase
    .from('vouchers')
    .insert({
      voucher_code: voucherCode,
      voucher_type_id: data.voucherTypeId,
      purchaser_name: data.purchaserName,
      purchaser_email: data.purchaserEmail,
      purchaser_phone: data.purchaserPhone || null,
      price_paid_eur: data.pricePaid,
      status: 'active',
      valid_from: new Date().toISOString(),
      valid_until: data.validUntil || null,
      notes: data.notes || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating voucher:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/vouchers')
  return { success: true, data: voucher }
}
