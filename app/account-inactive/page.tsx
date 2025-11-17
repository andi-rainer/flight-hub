import { createClient, getUserProfile } from '@/lib/supabase/server'
import { redirect } from '@/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, Mail, Phone, Calendar, User } from 'lucide-react'
import { signOut } from '@/lib/actions/auth'
import { getBoardContactSettings } from '@/lib/actions/settings'

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

  // Get board contact settings
  const contactSettings = await getBoardContactSettings()

  return {
    user: userProfile,
    membership,
    contactSettings,
  }
}

export default async function AccountInactivePage() {
  const data = await getUserMembershipStatus()

  if (!data) {
    redirect('/login')
  }

  const { user, membership, contactSettings } = data
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

            {/* Show contact info if configured */}
            {(contactSettings?.contact_email || contactSettings?.contact_phone || contactSettings?.contact_name) && (
              <>
                {contactSettings.contact_name && (
                  <p className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{contactSettings.contact_name}</span>
                  </p>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  {contactSettings.contact_email && (
                    <Button asChild variant="default" className="flex-1">
                      <a href={`mailto:${contactSettings.contact_email}`}>
                        <Mail className="h-4 w-4 mr-2" />
                        Email Board
                      </a>
                    </Button>
                  )}
                  {contactSettings.contact_phone && (
                    <Button asChild variant="outline" className="flex-1">
                      <a href={`tel:${contactSettings.contact_phone}`}>
                        <Phone className="h-4 w-4 mr-2" />
                        Call Club
                      </a>
                    </Button>
                  )}
                </div>

                {contactSettings.office_hours && (
                  <div className="mt-4 p-3 rounded-md bg-muted/50 text-sm">
                    <p className="font-medium mb-1">Office Hours:</p>
                    <p className="text-muted-foreground whitespace-pre-line">{contactSettings.office_hours}</p>
                  </div>
                )}
              </>
            )}

            {/* Fallback message if no contact info configured */}
            {!contactSettings?.contact_email && !contactSettings?.contact_phone && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Contact information has not been configured yet. Please reach out to a board member directly.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="pt-4 border-t">
            <Button type="submit" onClick={signOut} variant="ghost" className="w-full">
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
