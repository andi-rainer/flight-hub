'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { PDFTemplate } from '@/lib/types'

/**
 * Get all active PDF templates
 */
export async function getPDFTemplates(): Promise<{
  success: boolean
  data?: PDFTemplate[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('pdf_design_templates')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching PDF templates:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as PDFTemplate[] }
  } catch (error) {
    console.error('Error in getPDFTemplates:', error)
    return { success: false, error: 'Failed to fetch PDF templates' }
  }
}

/**
 * Get a single PDF template by ID
 */
export async function getPDFTemplate(id: string): Promise<{
  success: boolean
  data?: PDFTemplate
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('pdf_design_templates')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching PDF template:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as PDFTemplate }
  } catch (error) {
    console.error('Error in getPDFTemplate:', error)
    return { success: false, error: 'Failed to fetch PDF template' }
  }
}

/**
 * Create a new PDF template
 * Board members only
 */
export async function createPDFTemplate(data: {
  name: string
  code: string
  description?: string
  template_type: 'voucher' | 'ticket'
}): Promise<{
  success: boolean
  data?: PDFTemplate
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Check permissions
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.role?.includes('board')) {
      return { success: false, error: 'Unauthorized' }
    }

    // Get default config based on template type
    const defaultConfigs = {
      voucher: {
        layout_config: { primaryColor: '#7c3aed', secondaryColor: '#a78bfa' },
        border_config: { enabled: true, style: 'solid', width: 2, color: '#a78bfa', cornerRadius: 8, decorative: true },
        canvas_width: 595,
        canvas_height: 842,
        elements: []
      },
      ticket: {
        layout_config: { primaryColor: '#2563eb', secondaryColor: '#3b82f6' },
        border_config: { enabled: true, style: 'solid', width: 2, color: '#3b82f6', cornerRadius: 8, decorative: true },
        canvas_width: 595,
        canvas_height: 842,
        elements: []
      }
    }

    const config = defaultConfigs[data.template_type]

    // Create template
    const { data: template, error } = await supabase
      .from('pdf_design_templates')
      .insert({
        name: data.name,
        code: data.code,
        description: data.description || null,
        template_type: data.template_type,
        active: true,
        sort_order: 999,
        ...config
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating template:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/store-management')
    return { success: true, data: template as PDFTemplate }
  } catch (error) {
    console.error('Error in createPDFTemplate:', error)
    return { success: false, error: 'Failed to create template' }
  }
}

/**
 * Update PDF template
 * Board members only
 */
export async function updatePDFTemplate(
  id: string,
  updates: Partial<PDFTemplate>
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Check permissions
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.role?.includes('board')) {
      return { success: false, error: 'Unauthorized' }
    }

    const { error } = await supabase
      .from('pdf_design_templates')
      .update(updates as any)
      .eq('id', id)

    if (error) {
      console.error('Error updating template:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/store-management')
    return { success: true }
  } catch (error) {
    console.error('Error in updatePDFTemplate:', error)
    return { success: false, error: 'Failed to update template' }
  }
}

/**
 * Delete PDF template
 * Board members only
 */
export async function deletePDFTemplate(id: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Check permissions
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.role?.includes('board')) {
      return { success: false, error: 'Unauthorized' }
    }

    // Check if template is in use
    const { data: vouchers } = await supabase
      .from('vouchers')
      .select('id')
      .eq('design_template_id', id)
      .limit(1)

    if (vouchers && vouchers.length > 0) {
      return { success: false, error: 'Cannot delete template that is in use by vouchers' }
    }

    const { error } = await supabase
      .from('pdf_design_templates')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting template:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/store-management')
    return { success: true }
  } catch (error) {
    console.error('Error in deletePDFTemplate:', error)
    return { success: false, error: 'Failed to delete template' }
  }
}

/**
 * Duplicate PDF template
 * Board members only
 */
export async function duplicatePDFTemplate(id: string): Promise<{
  success: boolean
  data?: PDFTemplate
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Check permissions
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.role?.includes('board')) {
      return { success: false, error: 'Unauthorized' }
    }

    // Get original template
    const { data: original, error: fetchError } = await supabase
      .from('pdf_design_templates')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !original) {
      return { success: false, error: 'Template not found' }
    }

    // Create duplicate
    const { data: duplicate, error: createError } = await supabase
      .from('pdf_design_templates')
      .insert({
        ...original,
        id: undefined,
        name: `${original.name} (Copy)`,
        name_de: `${original.name_de} (Kopie)`,
        code: `${original.code}-copy-${Date.now()}`,
        active: false,
        created_at: undefined,
        updated_at: undefined
      })
      .select()
      .single()

    if (createError) {
      console.error('Error duplicating template:', createError)
      return { success: false, error: createError.message }
    }

    revalidatePath('/store-management')
    return { success: true, data: duplicate as PDFTemplate }
  } catch (error) {
    console.error('Error in duplicatePDFTemplate:', error)
    return { success: false, error: 'Failed to duplicate template' }
  }
}

/**
 * Upload template asset (background, decorative, etc.)
 * Board members only
 */
export async function uploadTemplateAsset(
  file: File,
  assetType: 'background' | 'decorative' | 'logo' | 'border',
  metadata?: {
    name?: string
    description?: string
    tags?: string[]
  }
): Promise<{
  success: boolean
  data?: { id: string; url: string }
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Check permissions
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.role?.includes('board')) {
      return { success: false, error: 'Unauthorized' }
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Only PNG, JPG, and SVG files are allowed' }
    }

    // Validate file size (max 10MB for backgrounds, 5MB for others)
    const maxSize = assetType === 'background' ? 10 * 1024 * 1024 : 5 * 1024 * 1024
    if (file.size > maxSize) {
      const maxMB = maxSize / (1024 * 1024)
      return { success: false, error: `File size must be less than ${maxMB}MB` }
    }

    // Create file path
    const timestamp = Date.now()
    const fileExt = file.name.split('.').pop()
    const fileName = `${assetType}-${timestamp}.${fileExt}`
    const filePath = `pdf-assets/${assetType}/${fileName}`

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('tandem-documents')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Error uploading asset:', uploadError)
      return { success: false, error: uploadError.message }
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('tandem-documents')
      .getPublicUrl(filePath)

    // Create asset record
    const { data: asset, error: createError } = await supabase
      .from('template_assets')
      .insert({
        name: metadata?.name || file.name,
        description: metadata?.description || null,
        asset_type: assetType,
        file_url: publicUrl,
        file_size: file.size,
        file_type: file.type,
        tags: metadata?.tags || [],
        uploaded_by: user.id
      })
      .select('id, file_url')
      .single()

    if (createError) {
      console.error('Error creating asset record:', createError)
      return { success: false, error: createError.message }
    }

    revalidatePath('/store-management')
    return { success: true, data: { id: asset.id, url: asset.file_url } }
  } catch (error) {
    console.error('Error in uploadTemplateAsset:', error)
    return { success: false, error: 'Failed to upload asset' }
  }
}

/**
 * Get template assets
 */
export async function getTemplateAssets(filters?: {
  assetType?: 'background' | 'decorative' | 'logo' | 'border'
  tags?: string[]
}): Promise<{
  success: boolean
  data?: any[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('template_assets')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters?.assetType) {
      query = query.eq('asset_type', filters.assetType)
    }

    if (filters?.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching assets:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error in getTemplateAssets:', error)
    return { success: false, error: 'Failed to fetch assets' }
  }
}

/**
 * Delete template asset
 * Board members only
 */
export async function deleteTemplateAsset(id: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Check permissions
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.role?.includes('board')) {
      return { success: false, error: 'Unauthorized' }
    }

    // Get asset to get file URL
    const { data: asset } = await supabase
      .from('template_assets')
      .select('file_url')
      .eq('id', id)
      .single()

    if (asset?.file_url) {
      // Extract file path from URL
      const urlParts = asset.file_url.split('/tandem-documents/')
      if (urlParts.length > 1) {
        const filePath = urlParts[1]

        // Delete file from storage
        const { error: deleteError } = await supabase.storage
          .from('tandem-documents')
          .remove([filePath])

        if (deleteError) {
          console.error('Error deleting asset file:', deleteError)
          // Continue anyway
        }
      }
    }

    // Delete asset record
    const { error } = await supabase
      .from('template_assets')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting asset:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/store-management')
    return { success: true }
  } catch (error) {
    console.error('Error in deleteTemplateAsset:', error)
    return { success: false, error: 'Failed to delete asset' }
  }
}
