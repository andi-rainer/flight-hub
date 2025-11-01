import { createClient, getUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, Mail, Phone, Calendar } from 'lucide-react'
import { signOut } from '@/lib/actions/auth'

async function getUserMembershipStatus() {
  const userProfile = await getUserProfile()
  if (!userProfile) return null

  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  // Get user's most recent membership
  const { data: membership } = await supabase
    .from('user_memberships')
    .select('*, membership_types(*)')
    .eq('user_id', userProfile.id)
    .eq('status', 'active')
    .order('end_date', { ascending: false })
    .limit(1)
    .single()

  return {
    user: userProfile,
    membership,
  }
}

export default async function AccountInactivePage() {
  const data = await getUserMembershipStatus()

  if (!data) {
    redirect('/login')
  }

  const { user, membership } = data
  const today = new Date().toISOString().split('T')[0]
  const isActive = membership ? membership.end_date >= today : false

  // If user is board member or has active membership, redirect to dashboard
  if (user.role?.includes('board') || isActive) {
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <div>
              <CardTitle className="text-2xl">Account Inactive</CardTitle>
              <CardDescription>Your membership has expired</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Membership Expired</AlertTitle>
            <AlertDescription>
              Your account is currently inactive because your membership has expired.
              You will not be able to access the system until your membership is renewed.
            </AlertDescription>
          </Alert>

          {membership && (
            <div className="space-y-3 rounded-md border p-4 bg-muted/50">
              <h3 className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Last Membership
              </h3>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Type:</span>{' '}
                  <span className="font-medium">{membership.membership_types?.name}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Started:</span>{' '}
                  <span>{new Date(membership.start_date).toLocaleDateString('de-DE')}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Expired:</span>{' '}
                  <span className="text-destructive font-medium">
                    {new Date(membership.end_date).toLocaleDateString('de-DE')}
                  </span>
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="font-medium">To Renew Your Membership</h3>
            <p className="text-sm text-muted-foreground">
              Please contact the board members to renew your membership and regain access to the system.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild variant="default" className="flex-1">
                <a href="mailto:board@example.com">
                  <Mail className="h-4 w-4 mr-2" />
                  Email Board
                </a>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <a href="tel:+41000000000">
                  <Phone className="h-4 w-4 mr-2" />
                  Call Club
                </a>
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t">
            <form action={signOut}>
              <Button type="submit" variant="ghost" className="w-full">
                Sign Out
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
