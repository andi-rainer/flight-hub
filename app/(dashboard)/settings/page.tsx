import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Shield, AlertCircle } from 'lucide-react'
import { FunctionsSection } from './components/functions-section'
import { BillingSection } from './components/billing-section'
import { ProfileSection } from './components/profile-section'
import type { User, FunctionMaster, Plane } from '@/lib/database.types'

async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}

async function getFunctions(): Promise<FunctionMaster[]> {
  const supabase = await createClient()

  const { data: functions, error } = await supabase
    .from('functions_master')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching functions:', error)
    return []
  }

  return functions || []
}

async function getAircrafts(): Promise<Plane[]> {
  const supabase = await createClient()

  const { data: aircrafts, error } = await supabase
    .from('planes')
    .select('*')
    .order('tail_number', { ascending: true })

  if (error) {
    console.error('Error fetching aircrafts:', error)
    return []
  }

  return aircrafts || []
}

export default async function SettingsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const isBoardMember = user.role?.includes('board') ?? false

  // Fetch data based on role
  const [functions, aircrafts] = await Promise.all([
    isBoardMember ? getFunctions() : Promise.resolve([]),
    isBoardMember ? getAircrafts() : Promise.resolve([]),
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and system configuration
        </p>
      </div>

      {/* Content */}
      {isBoardMember ? (
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="functions">Functions</TabsTrigger>
            <TabsTrigger value="billing">Billing Rates</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <ProfileSection user={user} />
          </TabsContent>

          <TabsContent value="functions" className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>Board Member Access</AlertTitle>
              <AlertDescription>
                You have access to manage member functions and their yearly rates. These functions
                are used for member classification and billing.
              </AlertDescription>
            </Alert>
            <FunctionsSection functions={functions} />
          </TabsContent>

          <TabsContent value="billing" className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>Board Member Access</AlertTitle>
              <AlertDescription>
                Configure hourly flight rates for each aircraft. These rates are used when charging
                flights to members.
              </AlertDescription>
            </Alert>
            <BillingSection aircrafts={aircrafts} />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-6">
          <ProfileSection user={user} />

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Limited Access</AlertTitle>
            <AlertDescription>
              Additional settings are available to board members only. Contact a board member if you
              need to update functions, billing rates, or system configuration.
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  )
}
