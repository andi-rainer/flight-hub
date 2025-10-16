'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/lib/database.types'
import type { User as AuthUser } from '@supabase/supabase-js'

interface UseUserReturn {
  user: User | null
  authUser: AuthUser | null
  isLoading: boolean
  error: Error | null
  isBoardMember: boolean
}

/**
 * Hook to get the current authenticated user and their profile data
 * Returns both the auth user and the profile data from the public.users table
 * Also provides a helper to check if the user is a board member
 */
export function useUser(): UseUserReturn {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let mounted = true
    const supabase = createClient()

    // Get initial user with proper timeout handling
    const getInitialUser = async () => {
      try {
        // Wrap the auth call in a timeout
        const authPromise = supabase.auth.getUser()
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Auth timeout')), 3000)
        )

        const { data: { user: authUser }, error: authError } = await Promise.race([
          authPromise,
          timeoutPromise
        ])


        if (!mounted) {
          console.log('### Component unmounted, stopping')
          return
        }

        if (authError) {
          console.error('Auth error:', authError)
          setIsLoading(false)
          return
        }

        setAuthUser(authUser)

        if (authUser) {
          // Get profile data with timeout
          const profilePromise = supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle()

          const profileTimeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Profile timeout')), 2000)
          )

          const { data: profile, error: profileError } = await Promise.race([
            profilePromise,
            profileTimeout
          ])

          if (!mounted) return

          if (profileError) {
            console.error('Error fetching user profile:', profileError)
            setError(new Error(String(profileError)))
          }

          setUser(profile || null)
        } else {
          setUser(null)
        }
      } catch (err) {
        console.error('useUser hook error:', err)
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to load user'))
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    getInitialUser()

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setAuthUser(session?.user ?? null)

      if (session?.user) {
        // Fetch updated profile
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profileError) {
          console.error('Error fetching profile in auth state change:', profileError)
        }

        setUser(profile || null)
      } else {
        setUser(null)
      }
    })

    return () => {
      console.log('### useUser cleanup')
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const isBoardMember = user?.role?.includes('board') ?? false

  return {
    user,
    authUser,
    isLoading,
    error,
    isBoardMember,
  }
}
