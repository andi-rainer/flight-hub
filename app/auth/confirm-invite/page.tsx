'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

function ConfirmInviteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [otp, setOtp] = useState('')
  const [email, setEmail] = useState('')
  const [showOtpInput, setShowOtpInput] = useState(false)

  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  useEffect(() => {
    // Auto-verify if token_hash is present and user hasn't manually triggered OTP mode
    if (tokenHash && type && !showOtpInput) {
      // Don't auto-verify, wait for user to click button
      // This prevents email scanners from consuming the token
    }
  }, [tokenHash, type, showOtpInput])

  const handleAcceptInvite = async () => {
    if (!tokenHash || type !== 'invite') {
      setError('Invalid invitation link. Please check your email and try again.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Verify the token hash using PKCE flow
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'invite',
      })

      if (verifyError) {
        console.error('Error verifying invite:', verifyError)
        setError(verifyError.message || 'Failed to verify invitation. The link may have expired.')
        setIsLoading(false)
        return
      }

      if (data.session) {
        // Successfully created session, redirect to dashboard
        router.push('/dashboard')
      } else {
        setError('Failed to create session. Please try again.')
        setIsLoading(false)
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('An unexpected error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !otp) {
      setError('Please enter both your email and the 6-digit code.')
      return
    }

    if (otp.length !== 6) {
      setError('The code must be 6 digits.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Verify OTP
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'invite',
      })

      if (verifyError) {
        console.error('Error verifying OTP:', verifyError)
        setError(verifyError.message || 'Invalid code. Please check and try again.')
        setIsLoading(false)
        return
      }

      if (data.session) {
        // Successfully created session, redirect to dashboard
        router.push('/dashboard')
      } else {
        setError('Failed to create session. Please try again.')
        setIsLoading(false)
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('An unexpected error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Accept Invitation</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join FlightHub. Click the button below to accept the invitation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!showOtpInput ? (
            <>
              {/* Primary method: Accept via button */}
              <Button
                onClick={handleAcceptInvite}
                disabled={isLoading || !tokenHash}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Accepting Invitation...
                  </>
                ) : (
                  'Accept Invitation'
                )}
              </Button>

              {/* Alternative: Use OTP */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or use code
                  </span>
                </div>
              </div>

              <Button
                onClick={() => setShowOtpInput(true)}
                variant="outline"
                className="w-full"
                type="button"
              >
                I have a 6-digit code
              </Button>
            </>
          ) : (
            <>
              {/* OTP Input Form */}
              <form onSubmit={handleOtpVerify} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email Address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="otp" className="text-sm font-medium">
                    6-Digit Code
                  </label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    disabled={isLoading}
                    maxLength={6}
                    pattern="[0-9]{6}"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the 6-digit code from your invitation email
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !email || otp.length !== 6}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify Code'
                  )}
                </Button>

                <Button
                  onClick={() => setShowOtpInput(false)}
                  variant="ghost"
                  className="w-full"
                  type="button"
                  disabled={isLoading}
                >
                  ← Back to invitation link
                </Button>
              </form>
            </>
          )}

          <div className="text-center text-sm text-muted-foreground">
            <p>Having trouble? Contact your administrator for help.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ConfirmInvitePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <ConfirmInviteContent />
    </Suspense>
  )
}
