'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface StoreContentFeature {
  text: string
  text_de: string
}

export interface StoreContent {
  id: string
  home_title: string
  home_title_de: string
  home_subtitle: string
  home_subtitle_de: string
  home_footer: string
  home_footer_de: string
  voucher_card_title: string
  voucher_card_title_de: string
  voucher_card_subtitle: string
  voucher_card_subtitle_de: string
  voucher_card_description: string
  voucher_card_description_de: string
  voucher_card_features: StoreContentFeature[]
  booking_card_title: string
  booking_card_title_de: string
  booking_card_subtitle: string
  booking_card_subtitle_de: string
  booking_card_description: string
  booking_card_description_de: string
  booking_card_features: StoreContentFeature[]
  redeem_card_title: string
  redeem_card_title_de: string
  redeem_card_subtitle: string
  redeem_card_subtitle_de: string
  redeem_card_description: string
  redeem_card_description_de: string
  redeem_card_features: StoreContentFeature[]
  vouchers_page_title: string
  vouchers_page_title_de: string
  vouchers_page_subtitle: string
  vouchers_page_subtitle_de: string
  voucher_info_title: string
  voucher_info_title_de: string
  voucher_info_section1_title: string
  voucher_info_section1_title_de: string
  voucher_info_section1_features: StoreContentFeature[]
  voucher_info_section2_title: string
  voucher_info_section2_title_de: string
  voucher_info_section2_features: StoreContentFeature[]
  bookings_page_title: string
  bookings_page_title_de: string
  bookings_page_subtitle: string
  bookings_page_subtitle_de: string
  bookings_card_header: string
  bookings_card_header_de: string
  bookings_info_title: string
  bookings_info_title_de: string
  bookings_info_section1_title: string
  bookings_info_section1_title_de: string
  bookings_info_section1_features: StoreContentFeature[]
  bookings_info_section2_title: string
  bookings_info_section2_title_de: string
  bookings_info_section2_features: StoreContentFeature[]
  // Success page - Payment success
  success_payment_title?: string
  success_payment_title_de?: string
  success_payment_description?: string
  success_payment_description_de?: string
  success_payment_check_email?: string
  success_payment_check_email_de?: string
  success_payment_email_message?: string
  success_payment_email_message_de?: string
  success_payment_steps?: StoreContentFeature[]
  // Success page - Reservation success
  success_reservation_title?: string
  success_reservation_title_de?: string
  success_reservation_description?: string
  success_reservation_description_de?: string
  success_reservation_booking_confirmed?: string
  success_reservation_booking_confirmed_de?: string
  success_reservation_voucher_used?: string
  success_reservation_voucher_used_de?: string
  success_reservation_scheduled_for?: string
  success_reservation_scheduled_for_de?: string
  success_reservation_check_email?: string
  success_reservation_check_email_de?: string
  success_reservation_email_message?: string
  success_reservation_email_message_de?: string
  success_reservation_steps?: StoreContentFeature[]
  // Success page - Common
  success_whats_next_title?: string
  success_whats_next_title_de?: string
  success_help_title?: string
  success_help_title_de?: string
  success_help_message?: string
  success_help_message_de?: string
  success_contact_email?: string
  success_back_to_home_button?: string
  success_back_to_home_button_de?: string
  success_purchase_another_button?: string
  success_purchase_another_button_de?: string
  success_voucher_code_label?: string
  success_voucher_code_label_de?: string
  success_booking_code_label?: string
  success_booking_code_label_de?: string
  success_download_pdf_button?: string
  success_download_pdf_button_de?: string
  // Other
  terms_url: string | null
  terms_url_de: string | null
  show_terms_on_checkout: boolean
  updated_at: string
  updated_by: string | null
}

export async function getStoreContent(): Promise<{
  success: boolean
  data?: StoreContent
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('store_content')
      .select('*')
      .single()

    if (error) {
      console.error('Error fetching store content:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as unknown as StoreContent }
  } catch (error) {
    console.error('Error in getStoreContent:', error)
    return { success: false, error: 'Failed to fetch store content' }
  }
}

export async function updateStoreContent(
  updates: Partial<Omit<StoreContent, 'id' | 'created_at' | 'updated_at' | 'updated_by'>>
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

    // Get the store content ID (there should only be one row)
    const { data: existing } = await supabase
      .from('store_content')
      .select('id')
      .single()

    if (!existing) {
      return { success: false, error: 'Store content not found' }
    }

    // Update store content
    const { error } = await supabase
      .from('store_content')
      .update({
        ...updates,
        updated_by: user.id,
      } as any)
      .eq('id', existing.id)

    if (error) {
      console.error('Error updating store content:', error)
      return { success: false, error: error.message }
    }

    // Revalidate cache
    revalidatePath('/store-management')

    return { success: true }
  } catch (error) {
    console.error('Error in updateStoreContent:', error)
    return { success: false, error: 'Failed to update store content' }
  }
}

export async function uploadTermsPDF(
  file: File,
  language: 'en' | 'de'
): Promise<{
  success: boolean
  url?: string
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
    if (file.type !== 'application/pdf') {
      return { success: false, error: 'Only PDF files are allowed' }
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return { success: false, error: 'File size must be less than 10MB' }
    }

    // Create file path
    const timestamp = Date.now()
    const fileName = `terms-${language}-${timestamp}.pdf`
    const filePath = `terms/${fileName}`

    // Upload to tandem-documents bucket (public)
    const { error: uploadError } = await supabase.storage
      .from('tandem-documents')
      .upload(filePath, file, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (uploadError) {
      console.error('Error uploading file:', uploadError)
      return { success: false, error: uploadError.message }
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('tandem-documents')
      .getPublicUrl(filePath)

    // Update store content with the URL
    const { data: existing } = await supabase
      .from('store_content')
      .select('id')
      .single()

    if (!existing) {
      return { success: false, error: 'Store content not found' }
    }

    const updateField = language === 'en' ? 'terms_url' : 'terms_url_de'
    const { error: updateError } = await supabase
      .from('store_content')
      .update({
        [updateField]: publicUrl,
        updated_by: user.id,
      })
      .eq('id', existing.id)

    if (updateError) {
      console.error('Error updating store content:', updateError)
      return { success: false, error: updateError.message }
    }

    // Revalidate cache
    revalidatePath('/store-management')

    return { success: true, url: publicUrl }
  } catch (error) {
    console.error('Error in uploadTermsPDF:', error)
    return { success: false, error: 'Failed to upload terms PDF' }
  }
}

export async function deleteTermsPDF(
  language: 'en' | 'de'
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

    // Get current URL to extract file path
    const { data: storeContent } = await supabase
      .from('store_content')
      .select('terms_url, terms_url_de')
      .single()

    if (!storeContent) {
      return { success: false, error: 'Store content not found' }
    }

    const currentUrl = language === 'en' ? storeContent.terms_url : storeContent.terms_url_de

    if (currentUrl) {
      // Extract file path from URL
      const urlParts = currentUrl.split('/tandem-documents/')
      if (urlParts.length > 1) {
        const filePath = urlParts[1]

        // Delete file from storage
        const { error: deleteError } = await supabase.storage
          .from('tandem-documents')
          .remove([filePath])

        if (deleteError) {
          console.error('Error deleting file:', deleteError)
          // Continue anyway to clear the URL
        }
      }
    }

    // Clear the URL in store_content
    const { data: existing } = await supabase
      .from('store_content')
      .select('id')
      .single()

    if (!existing) {
      return { success: false, error: 'Store content not found' }
    }

    const updateField = language === 'en' ? 'terms_url' : 'terms_url_de'
    const { error: updateError } = await supabase
      .from('store_content')
      .update({
        [updateField]: null,
        updated_by: user.id,
      })
      .eq('id', existing.id)

    if (updateError) {
      console.error('Error updating store content:', updateError)
      return { success: false, error: updateError.message }
    }

    // Revalidate cache
    revalidatePath('/store-management')

    return { success: true }
  } catch (error) {
    console.error('Error in deleteTermsPDF:', error)
    return { success: false, error: 'Failed to delete terms PDF' }
  }
}
