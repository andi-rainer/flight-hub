'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Link } from '@/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createClient } from '@/lib/supabase/client'
import { Plane, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSettingPassword, setIsSettingPassword] = useState(false)
  const [isPasswordReset, setIsPasswordReset] = useState(false)
  const [isCheckingToken, setIsCheckingToken] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check for access token on mount (from invite link or password reset)
  useEffect(() => {
    const checkForToken = async () => {
      const supabase = createClient()

      // First, check for query parameters (from email link before token exchange)
      const queryParams = new URLSearchParams(window.location.search)
      const tokenType = queryParams.get('type')
      const errorParam = queryParams.get('error')
      const errorDescription = queryParams.get('error_description')

      // Handle errors from Supabase auth
      if (errorParam) {
        console.error('Auth error:', errorParam, errorDescription)
        setError(errorDescription || 'Authentication error occurred')
        setIsCheckingToken(false)
        return
      }

      // Check if there's a hash fragment with access_token (after token exchange)
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const type = hashParams.get('type') || tokenType

      console.log('Token check:', { hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken, type })

      if (accessToken && (type === 'invite' || type === 'recovery')) {
        try {
          // Set the session using the tokens from the URL
          if (refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })

            if (sessionError) {
              console.error('Error setting session:', sessionError)
              setError('Failed to set session. Please try requesting a new reset link.')
              setIsCheckingToken(false)
              return
            }
          }

          // Get the user's email from the session
          const { data: { user }, error } = await supabase.auth.getUser()

          if (error) {
            console.error('Error getting user:', error)
            setError('Failed to load user information. Please try requesting a new reset link.')
          } else if (user?.email) {
            setEmail(user.email)
            setIsSettingPassword(true)
            setIsPasswordReset(type === 'recovery')
          }

          // Clean up the URL
          window.history.replaceState(null, '', window.location.pathname)
        } catch (err) {
          console.error('Error setting up session:', err)
          setError('Failed to initialize session. Please try requesting a new reset link.')
        }
      } else if (type === 'recovery' && !accessToken) {
        // If we have a recovery type but no access token yet,
        // the token exchange might still be in progress
        console.log('Waiting for token exchange...')
        // Wait a bit and check again
        setTimeout(() => {
          window.location.reload()
        }, 1000)
        return
      }

      setIsCheckingToken(false)
    }

    checkForToken()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        return
      }

      // Redirect to dashboard
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsLoading(true)

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    // Validate password strength
    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      setIsLoading(false)
      return
    }

    try {
      const supabase = createClient()

      // Update the user's password
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) {
        setError(error.message)
        return
      }

      setSuccess(isPasswordReset ? 'Password reset successfully! Redirecting to dashboard...' : 'Password set successfully! Redirecting to dashboard...')

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 2000)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading state while checking for token
  if (isCheckingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
              <Plane className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">FlightHub</h1>
              <p className="text-sm text-muted-foreground">Aviation Club Management</p>
            </div>
          </div>
        </div>

        {isSettingPassword ? (
          // Password Setup Form
          <Card>
            <CardHeader>
              <CardTitle>{isPasswordReset ? 'Reset Your Password' : 'Set Your Password'}</CardTitle>
              <CardDescription>
                {isPasswordReset
                  ? 'Enter a new password for your account.'
                  : 'Welcome to FlightHub! Please set a password for your account.'
                }
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSetPassword}>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="bg-green-50 text-green-900 border-green-200">
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="new-password"
                    minLength={8}
                  />
                  <p className="text-xs text-muted-foreground">
                    Must be at least 8 characters long
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isPasswordReset ? 'Resetting password...' : 'Setting password...'}
                    </>
                  ) : (
                    isPasswordReset ? 'Reset Password & Continue' : 'Set Password & Continue'
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        ) : (
          // Regular Login Form
          <Card>
            <CardHeader>
              <CardTitle>Sign In</CardTitle>
              <CardDescription>
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col pt-5">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>

                <div className="text-sm text-center text-muted-foreground pt-3">
                  <Link
                    href="/forgot-password"
                    className="hover:text-primary underline underline-offset-4"
                  >
                    Forgot your password?
                  </Link>
                </div>
              </CardFooter>
            </form>
          </Card>
        )}

        <p className="text-center text-sm text-muted-foreground mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}
