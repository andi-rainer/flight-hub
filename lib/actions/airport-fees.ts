'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type {
  AirportInsert,
  AirportUpdate,
  AirportWithAircraftFees,
  AircraftAirportFeeInsert,
  AircraftAirportFeeUpdate
} from '@/lib/database.types'

/**
 * Server actions for Airport Fees management with aircraft-specific pricing
 * Handles airports and aircraft-specific fees CRUD operations (board members only)
 */

// ============================================================================
// AUTHORIZATION HELPER
// ============================================================================

async function verifyBoardMember() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { authorized: false, error: 'Not authenticated' }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile?.role?.includes('board')) {
    return { authorized: false, error: 'Not authorized - board members only' }
  }

  return { authorized: true, supabase, userId: user.id }
}

// ============================================================================
// HELPER - GET PLANES
// ============================================================================

export async function getPlanes() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('planes')
    .select('*')
    .eq('active', true)
    .order('tail_number')

  if (error) {
    console.error('Error fetching planes:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

// ============================================================================
// AIRPORTS MANAGEMENT
// ============================================================================

export async function getAirports() {
  const auth = await verifyBoardMember()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  const { data, error } = await auth.supabase
    .from('airports')
    .select(`
      *,
      aircraft_fees:aircraft_airport_fees(
        *,
        plane:planes(id, tail_number, type)
      )
    `)
    .order('airport_name')

  if (error) {
    console.error('Error fetching airports:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data: data as AirportWithAircraftFees[] }
}

export async function getAirportByICAO(icaoCode: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('airports')
    .select(`
      *,
      aircraft_fees:aircraft_airport_fees(*)
    `)
    .eq('icao_code', icaoCode.toUpperCase())
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching airport:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data: data || null }
}

export async function createAirport(data: AirportInsert) {
  const auth = await verifyBoardMember()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  if (data.icao_code.length !== 4) {
    return { success: false, error: 'ICAO code must be exactly 4 characters' }
  }

  const icaoCode = data.icao_code.toUpperCase()

  const { data: existing } = await auth.supabase
    .from('airports')
    .select('id')
    .eq('icao_code', icaoCode)
    .single()

  if (existing) {
    return { success: false, error: 'An airport with this ICAO code already exists' }
  }

  const { data: airport, error } = await auth.supabase
    .from('airports')
    .insert({
      ...data,
      icao_code: icaoCode,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating airport:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/settings')
  revalidatePath('/billing')
  return { success: true, data: airport }
}

export async function updateAirport(id: string, data: AirportUpdate) {
  const auth = await verifyBoardMember()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  if (data.icao_code) {
    if (data.icao_code.length !== 4) {
      return { success: false, error: 'ICAO code must be exactly 4 characters' }
    }

    const icaoCode = data.icao_code.toUpperCase()

    const { data: existing } = await auth.supabase
      .from('airports')
      .select('id')
      .eq('icao_code', icaoCode)
      .neq('id', id)
      .single()

    if (existing) {
      return { success: false, error: 'An airport with this ICAO code already exists' }
    }

    data.icao_code = icaoCode
  }

  const { data: airport, error } = await auth.supabase
    .from('airports')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating airport:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/settings')
  revalidatePath('/billing')
  return { success: true, data: airport }
}

export async function deleteAirport(id: string) {
  const auth = await verifyBoardMember()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  // Aircraft fees will be automatically deleted due to ON DELETE CASCADE
  const { error } = await auth.supabase
    .from('airports')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting airport:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/settings')
  revalidatePath('/billing')
  return { success: true, message: 'Airport deleted successfully' }
}

// ============================================================================
// AIRCRAFT AIRPORT FEES MANAGEMENT
// ============================================================================

export async function getAircraftAirportFees(airportId: string) {
  const auth = await verifyBoardMember()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  const { data, error } = await auth.supabase
    .from('aircraft_airport_fees')
    .select(`
      *,
      plane:planes(id, tail_number, type, passenger_seats)
    `)
    .eq('airport_id', airportId)

  if (error) {
    console.error('Error fetching aircraft airport fees:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

export async function createAircraftAirportFee(data: AircraftAirportFeeInsert) {
  const auth = await verifyBoardMember()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  const { data: fee, error } = await auth.supabase
    .from('aircraft_airport_fees')
    .insert(data)
    .select()
    .single()

  if (error) {
    console.error('Error creating aircraft airport fee:', error)
    if (error.code === '23505') { // Unique constraint violation
      return { success: false, error: 'Fee configuration for this aircraft at this airport already exists' }
    }
    return { success: false, error: error.message }
  }

  revalidatePath('/settings')
  revalidatePath('/billing')
  return { success: true, data: fee }
}

export async function updateAircraftAirportFee(id: string, data: AircraftAirportFeeUpdate) {
  const auth = await verifyBoardMember()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  const { data: fee, error } = await auth.supabase
    .from('aircraft_airport_fees')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating aircraft airport fee:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/settings')
  revalidatePath('/billing')
  return { success: true, data: fee }
}

export async function deleteAircraftAirportFee(id: string) {
  const auth = await verifyBoardMember()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  const { error } = await auth.supabase
    .from('aircraft_airport_fees')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting aircraft airport fee:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/settings')
  revalidatePath('/billing')
  return { success: true, message: 'Aircraft airport fee deleted successfully' }
}

// ============================================================================
// AIRPORT FEES CALCULATION
// ============================================================================

/**
 * Calculate airport fees for a flight based on aircraft-specific fees
 * @param icaoDeparture - ICAO code of departure airport
 * @param icaoDestination - ICAO code of destination airport
 * @param planeId - Aircraft ID
 * @param landings - Number of landings
 * @param passengers - Number of passengers
 * @returns Total airport fees for the flight
 */
export async function calculateAirportFeesForFlight(
  icaoDeparture: string | null,
  icaoDestination: string | null,
  planeId: string,
  landings: number,
  passengers: number
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated', fees: [] }
  }

  const fees: Array<{
    airport: string
    icao_code: string
    fee_type: string
    amount: number
  }> = []

  let totalAmount = 0

  // Get fees for departure airport (approach only)
  if (icaoDeparture) {
    const { data: feeConfig } = await supabase
      .from('aircraft_airport_fees')
      .select(`
        *,
        airport:airports(*)
      `)
      .eq('airport_id', icaoDeparture)
      .eq('plane_id', planeId)
      .single()

    if (feeConfig && feeConfig.airport) {
      if (feeConfig.approach_fee > 0) {
        fees.push({
          airport: feeConfig.airport.airport_name,
          icao_code: feeConfig.airport.icao_code,
          fee_type: 'Approach',
          amount: feeConfig.approach_fee
        })
        totalAmount += feeConfig.approach_fee
      }
    }
  }

  // Get fees for destination airport (landing, approach, parking, noise, passenger)
  if (icaoDestination) {
    const { data: feeConfig } = await supabase
      .from('aircraft_airport_fees')
      .select(`
        *,
        airport:airports(*)
      `)
      .eq('airport_id', icaoDestination)
      .eq('plane_id', planeId)
      .single()

    if (feeConfig && feeConfig.airport) {
      // Landing fees
      if (feeConfig.landing_fee > 0) {
        const landingAmount = feeConfig.landing_fee * landings
        fees.push({
          airport: feeConfig.airport.airport_name,
          icao_code: feeConfig.airport.icao_code,
          fee_type: `Landing (${landings}x)`,
          amount: landingAmount
        })
        totalAmount += landingAmount
      }

      // Approach fee (only if different from departure)
      if (feeConfig.approach_fee > 0 && icaoDeparture !== icaoDestination) {
        fees.push({
          airport: feeConfig.airport.airport_name,
          icao_code: feeConfig.airport.icao_code,
          fee_type: 'Approach',
          amount: feeConfig.approach_fee
        })
        totalAmount += feeConfig.approach_fee
      }

      // Parking fee
      if (feeConfig.parking_fee > 0) {
        fees.push({
          airport: feeConfig.airport.airport_name,
          icao_code: feeConfig.airport.icao_code,
          fee_type: 'Parking',
          amount: feeConfig.parking_fee
        })
        totalAmount += feeConfig.parking_fee
      }

      // Noise fee
      if (feeConfig.noise_fee > 0) {
        fees.push({
          airport: feeConfig.airport.airport_name,
          icao_code: feeConfig.airport.icao_code,
          fee_type: 'Noise',
          amount: feeConfig.noise_fee
        })
        totalAmount += feeConfig.noise_fee
      }

      // Passenger fees
      if (feeConfig.passenger_fee > 0 && passengers > 0) {
        const passengerAmount = feeConfig.passenger_fee * passengers
        fees.push({
          airport: feeConfig.airport.airport_name,
          icao_code: feeConfig.airport.icao_code,
          fee_type: `Passenger (${passengers}x)`,
          amount: passengerAmount
        })
        totalAmount += passengerAmount
      }
    }
  }

  return {
    success: true,
    fees,
    totalAmount
  }
}
