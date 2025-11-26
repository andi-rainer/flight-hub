'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/permissions'
import type { AircraftCgLimit, AircraftStation } from '@/lib/database.types'

/**
 * Server actions for Weight & Balance management
 * Handles CG limits and loading stations for aircraft
 */

// ============================================================================
// AIRCRAFT CG LIMITS
// ============================================================================

export async function createCgLimit(data: {
  plane_id: string
  weight: number
  arm: number
  limit_type: 'forward' | 'aft'
  sort_order: number
  notes?: string
}) {
  const supabase = await createClient()

  // Check permission (board or chief pilot can edit aircraft)
  const { user, error: permError } = await requirePermission(supabase, 'aircraft.edit')
  if (permError || !user) {
    return { success: false, error: permError || 'Not authenticated' }
  }

  const { data: cgLimit, error } = await supabase
    .from('aircraft_cg_limits')
    .insert({
      plane_id: data.plane_id,
      weight: data.weight,
      arm: data.arm,
      limit_type: data.limit_type,
      sort_order: data.sort_order,
      notes: data.notes || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating CG limit:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/aircrafts/${data.plane_id}`)
  return { success: true, data: cgLimit }
}

export async function updateCgLimit(data: {
  id: string
  weight?: number
  arm?: number
  limit_type?: 'forward' | 'aft'
  sort_order?: number
  notes?: string
}) {
  const supabase = await createClient()

  // Check permission
  const { user, error: permError } = await requirePermission(supabase, 'aircraft.edit')
  if (permError || !user) {
    return { success: false, error: permError || 'Not authenticated' }
  }

  // Get the CG limit to find plane_id for revalidation
  const { data: existingLimit } = await supabase
    .from('aircraft_cg_limits')
    .select('plane_id')
    .eq('id', data.id)
    .single()

  if (!existingLimit) {
    return { success: false, error: 'CG limit not found' }
  }

  const updateData: any = {}
  if (data.weight !== undefined) updateData.weight = data.weight
  if (data.arm !== undefined) updateData.arm = data.arm
  if (data.limit_type !== undefined) updateData.limit_type = data.limit_type
  if (data.sort_order !== undefined) updateData.sort_order = data.sort_order
  if (data.notes !== undefined) updateData.notes = data.notes

  const { data: cgLimit, error } = await supabase
    .from('aircraft_cg_limits')
    .update(updateData)
    .eq('id', data.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating CG limit:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/aircrafts/${existingLimit.plane_id}`)
  return { success: true, data: cgLimit }
}

export async function deleteCgLimit(id: string) {
  const supabase = await createClient()

  // Check permission
  const { user, error: permError } = await requirePermission(supabase, 'aircraft.edit')
  if (permError || !user) {
    return { success: false, error: permError || 'Not authenticated' }
  }

  // Get the CG limit to find plane_id for revalidation
  const { data: existingLimit } = await supabase
    .from('aircraft_cg_limits')
    .select('plane_id')
    .eq('id', id)
    .single()

  if (!existingLimit) {
    return { success: false, error: 'CG limit not found' }
  }

  const { error } = await supabase
    .from('aircraft_cg_limits')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting CG limit:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/aircrafts/${existingLimit.plane_id}`)
  return { success: true }
}

// ============================================================================
// AIRCRAFT STATIONS
// ============================================================================

export async function createStation(data: {
  plane_id: string
  name: string
  station_type: 'seat' | 'cargo' | 'fuel' | 'aircraft_item'
  arm: number
  weight_limit: number
  basic_weight: number
  sort_order: number
  notes?: string
}) {
  const supabase = await createClient()

  // Check permission
  const { user, error: permError } = await requirePermission(supabase, 'aircraft.edit')
  if (permError || !user) {
    return { success: false, error: permError || 'Not authenticated' }
  }

  const { data: station, error } = await supabase
    .from('aircraft_stations')
    .insert({
      plane_id: data.plane_id,
      name: data.name,
      station_type: data.station_type,
      arm: data.arm,
      weight_limit: data.weight_limit,
      basic_weight: data.basic_weight,
      sort_order: data.sort_order,
      notes: data.notes || null,
      active: true,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating station:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/aircrafts/${data.plane_id}`)
  return { success: true, data: station }
}

export async function updateStation(data: {
  id: string
  name?: string
  station_type?: 'seat' | 'cargo' | 'fuel' | 'aircraft_item'
  arm?: number
  weight_limit?: number
  basic_weight?: number
  sort_order?: number
  active?: boolean
  notes?: string
}) {
  const supabase = await createClient()

  // Check permission
  const { user, error: permError } = await requirePermission(supabase, 'aircraft.edit')
  if (permError || !user) {
    return { success: false, error: permError || 'Not authenticated' }
  }

  // Get the station to find plane_id for revalidation
  const { data: existingStation } = await supabase
    .from('aircraft_stations')
    .select('plane_id')
    .eq('id', data.id)
    .single()

  if (!existingStation) {
    return { success: false, error: 'Station not found' }
  }

  const updateData: any = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.station_type !== undefined) updateData.station_type = data.station_type
  if (data.arm !== undefined) updateData.arm = data.arm
  if (data.weight_limit !== undefined) updateData.weight_limit = data.weight_limit
  if (data.basic_weight !== undefined) updateData.basic_weight = data.basic_weight
  if (data.sort_order !== undefined) updateData.sort_order = data.sort_order
  if (data.active !== undefined) updateData.active = data.active
  if (data.notes !== undefined) updateData.notes = data.notes

  const { data: station, error } = await supabase
    .from('aircraft_stations')
    .update(updateData)
    .eq('id', data.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating station:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/aircrafts/${existingStation.plane_id}`)
  return { success: true, data: station }
}

export async function deleteStation(id: string) {
  const supabase = await createClient()

  // Check permission
  const { user, error: permError } = await requirePermission(supabase, 'aircraft.edit')
  if (permError || !user) {
    return { success: false, error: permError || 'Not authenticated' }
  }

  // Get the station to find plane_id for revalidation
  const { data: existingStation } = await supabase
    .from('aircraft_stations')
    .select('plane_id')
    .eq('id', id)
    .single()

  if (!existingStation) {
    return { success: false, error: 'Station not found' }
  }

  const { error } = await supabase
    .from('aircraft_stations')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting station:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/aircrafts/${existingStation.plane_id}`)
  return { success: true }
}

// ============================================================================
// UPDATE AIRCRAFT EMPTY CG
// ============================================================================

export async function updateAircraftEmptyCg(planeId: string, emptyCg: number | null) {
  const supabase = await createClient()

  // Check permission
  const { user, error: permError } = await requirePermission(supabase, 'aircraft.edit')
  if (permError || !user) {
    return { success: false, error: permError || 'Not authenticated' }
  }

  const { data: aircraft, error } = await supabase
    .from('planes')
    .update({ empty_cg: emptyCg })
    .eq('id', planeId)
    .select()
    .single()

  if (error) {
    console.error('Error updating empty CG:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/aircrafts/${planeId}`)
  return { success: true, data: aircraft }
}

// ============================================================================
// UPDATE AIRCRAFT EMPTY WEIGHT
// ============================================================================

export async function updateAircraftEmptyWeight(planeId: string, emptyWeight: number | null) {
  const supabase = await createClient()

  // Check permission
  const { user, error: permError } = await requirePermission(supabase, 'aircraft.edit')
  if (permError || !user) {
    return { success: false, error: permError || 'Not authenticated' }
  }

  const { data: aircraft, error } = await supabase
    .from('planes')
    .update({ empty_weight: emptyWeight })
    .eq('id', planeId)
    .select()
    .single()

  if (error) {
    console.error('Error updating empty weight:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/aircrafts/${planeId}`)
  return { success: true, data: aircraft }
}

// ============================================================================
// CONVERT AIRCRAFT MASS UNIT
// ============================================================================

const KG_TO_LBS = 2.20462262
const LBS_TO_KG = 1 / KG_TO_LBS

export async function convertAircraftMassUnit(planeId: string, newUnit: 'kg' | 'lbs') {
  const supabase = await createClient()

  // Check permission
  const { user, error: permError } = await requirePermission(supabase, 'aircraft.edit')
  if (permError || !user) {
    return { success: false, error: permError || 'Not authenticated' }
  }

  // Get current aircraft data
  const { data: aircraft, error: aircraftError } = await supabase
    .from('planes')
    .select('id, mass_unit, max_mass, empty_weight')
    .eq('id', planeId)
    .single()

  if (aircraftError || !aircraft) {
    return { success: false, error: 'Aircraft not found' }
  }

  // Check if already in target unit
  if (aircraft.mass_unit === newUnit) {
    return { success: false, error: 'Aircraft is already in the target unit' }
  }

  const conversionFactor = newUnit === 'lbs' ? KG_TO_LBS : LBS_TO_KG

  // Convert aircraft masses
  const updatedAircraft: any = { mass_unit: newUnit }
  if (aircraft.max_mass !== null) {
    updatedAircraft.max_mass = Math.round(aircraft.max_mass * conversionFactor * 100) / 100
  }
  if (aircraft.empty_weight !== null) {
    updatedAircraft.empty_weight = Math.round(aircraft.empty_weight * conversionFactor * 100) / 100
  }

  // Update aircraft
  const { error: updateAircraftError } = await supabase
    .from('planes')
    .update(updatedAircraft)
    .eq('id', planeId)

  if (updateAircraftError) {
    console.error('Error updating aircraft masses:', updateAircraftError)
    return { success: false, error: updateAircraftError.message }
  }

  // Get all CG limits for this aircraft
  const { data: cgLimits, error: cgLimitsError } = await supabase
    .from('aircraft_cg_limits')
    .select('id, weight')
    .eq('plane_id', planeId)

  if (cgLimitsError) {
    console.error('Error fetching CG limits:', cgLimitsError)
    return { success: false, error: cgLimitsError.message }
  }

  // Convert CG limit weights
  if (cgLimits && cgLimits.length > 0) {
    for (const limit of cgLimits) {
      const convertedWeight = Math.round(limit.weight * conversionFactor * 100) / 100
      const { error: updateLimitError } = await supabase
        .from('aircraft_cg_limits')
        .update({ weight: convertedWeight })
        .eq('id', limit.id)

      if (updateLimitError) {
        console.error('Error updating CG limit weight:', updateLimitError)
        return { success: false, error: updateLimitError.message }
      }
    }
  }

  // Get all stations for this aircraft
  const { data: stations, error: stationsError } = await supabase
    .from('aircraft_stations')
    .select('id, weight_limit, basic_weight')
    .eq('plane_id', planeId)

  if (stationsError) {
    console.error('Error fetching stations:', stationsError)
    return { success: false, error: stationsError.message }
  }

  // Convert station weights
  if (stations && stations.length > 0) {
    for (const station of stations) {
      const convertedWeightLimit = Math.round(station.weight_limit * conversionFactor * 100) / 100
      const convertedBasicWeight = Math.round(station.basic_weight * conversionFactor * 100) / 100
      const { error: updateStationError } = await supabase
        .from('aircraft_stations')
        .update({
          weight_limit: convertedWeightLimit,
          basic_weight: convertedBasicWeight,
        })
        .eq('id', station.id)

      if (updateStationError) {
        console.error('Error updating station weights:', updateStationError)
        return { success: false, error: updateStationError.message }
      }
    }
  }

  revalidatePath(`/aircrafts/${planeId}`)
  return {
    success: true,
    data: {
      convertedAircraft: updatedAircraft,
      convertedCgLimits: cgLimits?.length || 0,
      convertedStations: stations?.length || 0,
    }
  }
}
