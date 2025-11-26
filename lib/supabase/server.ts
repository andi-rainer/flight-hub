import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database, UserProfile, UsersWithFunctions } from '@/lib/database.types'

/**
 * Creates a Supabase client for use in Server Components, Server Actions, and Route Handlers
 * This client properly handles cookie-based sessions
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * Creates a Supabase admin client with service role access
 * Use this for admin operations like inviting users
 * NEVER expose this client to the frontend
 */
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set in environment variables')
  }

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

/**
 * Gets the current session from the server
 * Returns null if no session exists
 */
export async function getSession() {
  const supabase = await createClient()
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error) {
    console.error('Error getting session:', error)
    return null
  }

  return session
}

/**
 * Gets the current user from the server
 * Returns null if no user is authenticated
 */
export async function getUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error) {
    console.error('Error getting user:', error)
    return null
  }

  return user
}

/**
 * Gets the current user profile from the database
 * Returns null if no user is authenticated or profile doesn't exist
 *
 * NOTE: This function loads the user with their function_codes for permission checks
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  const supabase = await createClient()
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

  if (authError || !authUser) {
    console.error('Error getting auth user:', authError)
    return null
  }

  // Load from users_with_functions view to get function_codes
  const { data: profile, error: profileError } = await supabase
    .from('users_with_functions')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle()

  if (profileError) {
    console.error('Error getting user profile:', profileError)
    return null
  }

  return profile as any as UserProfile
}
