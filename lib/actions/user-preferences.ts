'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function updateUserLanguage(language: 'de' | 'en') {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'User not authenticated' }
  }

  // Update user's preferred language in database
  const { error: updateError } = await supabase
    .from('users')
    .update({ preferred_language: language })
    .eq('id', user.id)

  if (updateError) {
    console.error('Error updating user language:', updateError)
    return { error: 'Failed to update language preference' }
  }

  // Also set the cookie for immediate effect
  const cookieStore = await cookies()
  cookieStore.set('NEXT_LOCALE', language, {
    path: '/',
    maxAge: 31536000, // 1 year
    sameSite: 'lax',
  })

  // Revalidate all routes to apply new language
  revalidatePath('/', 'layout')

  return { success: true }
}
