'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/lib/database.types'

type ComponentInsert = Database['public']['Tables']['aircraft_components']['Insert']
type ComponentUpdate = Database['public']['Tables']['aircraft_components']['Update']
type ComponentType = Database['public']['Enums']['component_type']

/**
 * Server actions for Aircraft Components TBO tracking
 * Manages life-limited components (engines, propellers, etc.) with Time Between Overhaul (TBO)
 */

// ============================================================================
// AUTHORIZATION HELPER
// ============================================================================

async function verifyBoardMember(): Promise<
  | { authorized: false; error: string; supabase?: undefined; userId?: undefined }
  | { authorized: true; error?: undefined; supabase: Awaited<ReturnType<typeof createClient>>; userId: string }
> {
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
// GET COMPONENTS
// ============================================================================

export async function getAircraftComponents(planeId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('aircraft_components_with_status')
    .select('*')
    .eq('plane_id', planeId)
    .order('component_type')
    .order('position')

  if (error) {
    console.error('Error fetching aircraft components:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

export async function getActiveAircraftComponents(planeId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('aircraft_components_with_status')
    .select('*')
    .eq('plane_id', planeId)
    .eq('status', 'active')
    .order('component_type')
    .order('position')

  if (error) {
    console.error('Error fetching active aircraft components:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

export async function getComponent(componentId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('aircraft_components_with_status')
    .select('*')
    .eq('id', componentId)
    .single()

  if (error) {
    console.error('Error fetching component:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

// ============================================================================
// TBO PRESETS
// ============================================================================

export async function getTBOPresets(componentType?: ComponentType) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  let query = supabase
    .from('component_tbo_presets')
    .select('*')
    .order('is_common', { ascending: false })
    .order('manufacturer')
    .order('model')

  if (componentType) {
    query = query.eq('component_type', componentType)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching TBO presets:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

export async function getCommonTBOPresets(componentType?: ComponentType) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  let query = supabase
    .from('component_tbo_presets')
    .select('*')
    .eq('is_common', true)
    .order('manufacturer')
    .order('model')

  if (componentType) {
    query = query.eq('component_type', componentType)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching common TBO presets:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

// ============================================================================
// CREATE/UPDATE COMPONENTS
// ============================================================================

export async function addComponent(data: {
  planeId: string
  componentType: ComponentType
  position?: string | null
  serialNumber?: string | null
  manufacturer?: string | null
  model?: string | null
  partNumber?: string | null
  tboHours: number
  hoursAtInstallation: number
  componentHoursOffset?: number
  installedAt?: string
  notes?: string | null
}) {
  const auth = await verifyBoardMember()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  // Verify aircraft exists
  const { data: plane } = await auth.supabase
    .from('planes')
    .select('id, tail_number')
    .eq('id', data.planeId)
    .single()

  if (!plane) {
    return { success: false, error: 'Aircraft not found' }
  }

  const componentData: ComponentInsert = {
    plane_id: data.planeId,
    component_type: data.componentType,
    position: data.position || null,
    serial_number: data.serialNumber || null,
    manufacturer: data.manufacturer || null,
    model: data.model || null,
    part_number: data.partNumber || null,
    tbo_hours: data.tboHours,
    hours_at_installation: data.hoursAtInstallation,
    component_hours_offset: data.componentHoursOffset || 0,
    installed_at: data.installedAt || new Date().toISOString(),
    installed_by: auth.userId,
    status: 'active',
    notes: data.notes || null,
    created_by: auth.userId,
  }

  const { data: component, error } = await auth.supabase
    .from('aircraft_components')
    .insert(componentData)
    .select()
    .single()

  if (error) {
    console.error('Error adding component:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/aircrafts/${data.planeId}`)
  revalidatePath('/aircrafts')
  return { success: true, data: component, message: 'Component added successfully' }
}

export async function updateComponent(componentId: string, data: {
  position?: string | null
  serialNumber?: string | null
  manufacturer?: string | null
  model?: string | null
  partNumber?: string | null
  tboHours?: number
  hoursAtInstallation?: number
  componentHoursOffset?: number
  notes?: string | null
}) {
  const auth = await verifyBoardMember()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  // Fetch the component to get plane_id for revalidation
  const { data: existingComponent } = await auth.supabase
    .from('aircraft_components')
    .select('plane_id, status')
    .eq('id', componentId)
    .single()

  if (!existingComponent) {
    return { success: false, error: 'Component not found' }
  }

  if (existingComponent.status !== 'active') {
    return { success: false, error: 'Cannot edit a removed or scrapped component' }
  }

  const updateData: ComponentUpdate = {}
  if (data.position !== undefined) updateData.position = data.position
  if (data.serialNumber !== undefined) updateData.serial_number = data.serialNumber
  if (data.manufacturer !== undefined) updateData.manufacturer = data.manufacturer
  if (data.model !== undefined) updateData.model = data.model
  if (data.partNumber !== undefined) updateData.part_number = data.partNumber
  if (data.tboHours !== undefined) updateData.tbo_hours = data.tboHours
  if (data.hoursAtInstallation !== undefined) updateData.hours_at_installation = data.hoursAtInstallation
  if (data.componentHoursOffset !== undefined) updateData.component_hours_offset = data.componentHoursOffset
  if (data.notes !== undefined) updateData.notes = data.notes

  const { data: component, error } = await auth.supabase
    .from('aircraft_components')
    .update(updateData)
    .eq('id', componentId)
    .select()
    .single()

  if (error) {
    console.error('Error updating component:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/aircrafts/${existingComponent.plane_id}`)
  revalidatePath('/aircrafts')
  return { success: true, data: component, message: 'Component updated successfully' }
}

// ============================================================================
// REMOVE/DECOMMISSION COMPONENTS
// ============================================================================

export async function removeComponent(componentId: string, reason?: string) {
  const auth = await verifyBoardMember()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  // Fetch the component to get plane_id
  const { data: component } = await auth.supabase
    .from('aircraft_components')
    .select('plane_id, status')
    .eq('id', componentId)
    .single()

  if (!component) {
    return { success: false, error: 'Component not found' }
  }

  if (component.status !== 'active') {
    return { success: false, error: 'Component is already removed' }
  }

  const { error } = await auth.supabase
    .from('aircraft_components')
    .update({
      status: 'removed',
      removed_at: new Date().toISOString(),
      removed_by: auth.userId,
      removal_reason: reason || null,
    })
    .eq('id', componentId)

  if (error) {
    console.error('Error removing component:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/aircrafts/${component.plane_id}`)
  revalidatePath('/aircrafts')
  return { success: true, message: 'Component removed successfully' }
}

export async function scrapComponent(componentId: string, reason?: string) {
  const auth = await verifyBoardMember()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  // Fetch the component to get plane_id
  const { data: component } = await auth.supabase
    .from('aircraft_components')
    .select('plane_id')
    .eq('id', componentId)
    .single()

  if (!component) {
    return { success: false, error: 'Component not found' }
  }

  const { error } = await auth.supabase
    .from('aircraft_components')
    .update({
      status: 'scrapped',
      removed_at: new Date().toISOString(),
      removed_by: auth.userId,
      removal_reason: reason || null,
    })
    .eq('id', componentId)

  if (error) {
    console.error('Error scrapping component:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/aircrafts/${component.plane_id}`)
  revalidatePath('/aircrafts')
  return { success: true, message: 'Component marked as scrapped' }
}

// ============================================================================
// OVERHAUL COMPONENT (creates new component record with reset hours)
// ============================================================================

export async function overhaulComponent(componentId: string, data: {
  overhaulDate: string
  aircraftHoursAtOverhaul: number
  notes?: string
}) {
  const auth = await verifyBoardMember()
  if (!auth.authorized) {
    return { success: false, error: auth.error }
  }

  // Fetch the original component
  const { data: originalComponent } = await auth.supabase
    .from('aircraft_components')
    .select('*')
    .eq('id', componentId)
    .single()

  if (!originalComponent) {
    return { success: false, error: 'Component not found' }
  }

  if (originalComponent.status !== 'active') {
    return { success: false, error: 'Cannot overhaul a removed or scrapped component' }
  }

  // Mark original as removed (overhauled)
  const { error: updateError } = await auth.supabase
    .from('aircraft_components')
    .update({
      status: 'removed',
      removed_at: data.overhaulDate,
      removed_by: auth.userId,
      removal_reason: `Overhauled and replaced with new component record`,
    })
    .eq('id', componentId)

  if (updateError) {
    console.error('Error marking component as overhauled:', updateError)
    return { success: false, error: updateError.message }
  }

  // Create new component with reset hours
  const newComponentData: ComponentInsert = {
    plane_id: originalComponent.plane_id,
    component_type: originalComponent.component_type,
    position: originalComponent.position,
    serial_number: originalComponent.serial_number,
    manufacturer: originalComponent.manufacturer,
    model: originalComponent.model,
    part_number: originalComponent.part_number,
    tbo_hours: originalComponent.tbo_hours,
    hours_at_installation: data.aircraftHoursAtOverhaul,
    component_hours_offset: 0, // Reset to zero after overhaul
    installed_at: data.overhaulDate,
    installed_by: auth.userId,
    status: 'active',
    notes: data.notes || `Overhauled from previous component ${componentId}`,
    created_by: auth.userId,
  }

  const { data: newComponent, error: insertError } = await auth.supabase
    .from('aircraft_components')
    .insert(newComponentData)
    .select()
    .single()

  if (insertError) {
    console.error('Error creating overhauled component:', insertError)
    // Try to revert the status change
    await auth.supabase
      .from('aircraft_components')
      .update({ status: 'active', removed_at: null, removed_by: null, removal_reason: null })
      .eq('id', componentId)
    return { success: false, error: insertError.message }
  }

  revalidatePath(`/aircrafts/${originalComponent.plane_id}`)
  revalidatePath('/aircrafts')
  return {
    success: true,
    data: newComponent,
    message: 'Component overhauled successfully. New component record created with reset hours.'
  }
}
