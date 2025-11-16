'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Link } from '@/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createClient } from '@/lib/supabase/client'
import { Plane, Loader2, CheckCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(true)
  const [isValidSession, setIsValidSession] = useState(false)
  const [userEmail, setUserEmail] = useState<string>('')
  const router = useRouter()

  // Verify the token and establish session
  useEffect(() => {
    const verifyToken = async () => {
      console.log('Starting session verification...')
      const supabase = createClient()

      // Check for hash parameters (from password reset email)
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const type = hashParams.get('type')
      const errorParam = hashParams.get('error')
      const errorDescription = hashParams.get('error_description')

      console.log('Hash params:', { hasAccessToken: !!accessToken, type, error: errorParam })

      // Handle errors from Supabase
      if (errorParam) {
        console.error('Auth error:', errorParam, errorDescription)
        setError(errorDescription || 'Invalid or expired reset link')
        setIsVerifying(false)
        return
      }

      // If we have tokens in the hash, set the session
      if (accessToken && refreshToken && type === 'recovery') {
        console.log('Setting session with tokens from hash...')
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (sessionError) {
          console.error('Session error:', sessionError)
          setError('Failed to verify reset link. Please request a new one.')
          setIsVerifying(false)
          return
        }

        // Verify we have a valid session
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
          console.error('User error:', userError)
          setError('Failed to verify user. Please request a new reset link.')
          setIsVerifying(false)
          return
        }

        console.log('Session established for user:', user.email)
        setUserEmail(user.email || '')
        setIsValidSession(true)
        setIsVerifying(false)

        // Clean up the URL hash
        window.history.replaceState(null, '', window.location.pathname)
        return
      }

      // Check if we already have a session
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        console.log('Existing session found')
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.email) {
          setUserEmail(user.email)
        }
        setIsValidSession(true)
        setIsVerifying(false)
        return
      }

      // No session found
      console.log('No valid session found')
      setError('No active session. Please click the reset link in your email or sign in.')
      setIsVerifying(false)
    }

    verifyToken()
     
  }, [])


  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
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
        console.error('Password update error:', error)
        setError(error.message)
        return
      }

      console.log('Password updated successfully')
      setSuccess(true)

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 2000)
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading state while verifying token
  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verifying reset link...</p>
        </div>
      </div>
    )
  }

  // Show error if session is invalid
  if (!isValidSession) {
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

          <Card>
            <CardHeader>
              <CardTitle>No Active Session</CardTitle>
              <CardDescription>Please sign in or use the reset link from your email</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertDescription>{error || 'No active session found'}</AlertDescription>
              </Alert>
              <p className="text-sm text-muted-foreground">
                To reset your password, click the link in your password reset email or request a new one.
              </p>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button asChild className="w-full">
                <Link href="/forgot-password">Request Password Reset Link</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">Sign In</Link>
              </Button>
            </CardFooter>
          </Card>
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

        <Card>
          <CardHeader>
            <CardTitle>Reset Your Password</CardTitle>
            <CardDescription>Enter a new password for your account</CardDescription>
          </CardHeader>

          {success ? (
            <CardContent className="space-y-4">
              <Alert className="bg-green-50 text-green-900 border-green-200">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Password reset successfully!</p>
                    <p className="text-sm">Redirecting you to the dashboard...</p>
                  </div>
                </AlertDescription>
              </Alert>
            </CardContent>
          ) : (
            <form onSubmit={handleResetPassword}>
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
                    value={userEmail}
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
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Resetting password...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Remember your password?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
