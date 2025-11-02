import { createClient } from '@/lib/supabase/server'
import { redirect } from '@/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Shield, CreditCard, Users, Building2 } from 'lucide-react'
import { UnchargedFlightsTable } from './components/uncharged-flights-table'
import { UserAccountsTable } from './components/user-accounts-table'
import { CostCentersTable } from './components/cost-centers-table'
import type { User, UnchargedFlight, UserBalance, CostCenter } from '@/lib/database.types'

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

async function getUnchargedFlights(): Promise<UnchargedFlight[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('uncharged_flights')
    .select('*')
    .order('block_off', { ascending: false })

  if (error) {
    console.error('Error fetching uncharged flights:', error)
    return []
  }

  return data || []
}

async function getUserBalances(): Promise<UserBalance[]> {
  const supabase = await createClient()

  // Get today's date for filtering active memberships
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('user_balances')
    .select('*')
    .order('surname')
    .order('name')

  if (error) {
    console.error('Error fetching user balances:', error.message || error)
    return []
  }

  // Get active memberships for all users
  const { data: memberships } = await supabase
    .from('user_memberships')
    .select('user_id, end_date')
    .eq('status', 'active')
    .gte('end_date', today)

  // Create a set of user IDs with active memberships
  const activeUserIds = new Set(memberships?.map(m => m.user_id) || [])

  // Get user roles to check for board members
  const { data: userRoles } = await supabase
    .from('users')
    .select('id, role')

  const boardMemberIds = new Set(
    userRoles?.filter(u => u.role?.includes('board')).map(u => u.id) || []
  )

  // Filter to only include users with active memberships or board members
  const activeUsers = data?.filter(user =>
    user.user_id && (activeUserIds.has(user.user_id) || boardMemberIds.has(user.user_id))
  ) || []

  return activeUsers
}

async function getCostCenters(): Promise<CostCenter[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('cost_centers')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching cost centers:', error)
    return []
  }

  return data || []
}

export default async function BillingPage() {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    redirect('/login')
  }

  const isBoardMember = currentUser.role?.includes('board') ?? false

  if (!isBoardMember) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
          <p className="text-muted-foreground">Manage billing and user accounts</p>
        </div>
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertTitle>Board Members Only</AlertTitle>
          <AlertDescription>
            You do not have permission to access this page. Only board members can manage billing.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const [unchargedFlights, userBalances, costCenters] = await Promise.all([
    getUnchargedFlights(),
    getUserBalances(),
    getCostCenters(),
  ])

  const unchargedCount = unchargedFlights.length
  const totalUnchargedAmount = unchargedFlights.reduce((sum, flight) => sum + (flight.calculated_amount || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">Charge flights and manage user accounts</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uncharged Flights</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unchargedCount}</div>
            <p className="text-xs text-muted-foreground">
              € {totalUnchargedAmount.toFixed(2)} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userBalances.length}</div>
            <p className="text-xs text-muted-foreground">
              With account balances
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Centers</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {costCenters.filter(cc => cc.active).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Active cost centers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="uncharged" className="space-y-6">
        <TabsList>
          <TabsTrigger value="uncharged">
            Uncharged Flights
            {unchargedCount > 0 && (
              <span className="ml-2 rounded-full bg-destructive px-2 py-0.5 text-xs text-destructive-foreground">
                {unchargedCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="accounts">User Accounts</TabsTrigger>
          <TabsTrigger value="cost-centers">Cost Centers</TabsTrigger>
        </TabsList>

        <TabsContent value="uncharged" className="space-y-4">
          <Alert>
            <CreditCard className="h-4 w-4" />
            <AlertTitle>Charge Flights</AlertTitle>
            <AlertDescription>
              Review and charge uncharged flights to users or cost centers. Flights will be locked
              automatically when charged.
            </AlertDescription>
          </Alert>
          <UnchargedFlightsTable
            flights={unchargedFlights}
            costCenters={costCenters.filter(cc => cc.active)}
            userBalances={userBalances}
          />
        </TabsContent>

        <TabsContent value="accounts" className="space-y-4">
          <Alert>
            <Users className="h-4 w-4" />
            <AlertTitle>User Accounts</AlertTitle>
            <AlertDescription>
              View user account balances and manage transactions. Add payments, charges, or manual adjustments.
            </AlertDescription>
          </Alert>
          <UserAccountsTable balances={userBalances} />
        </TabsContent>

        <TabsContent value="cost-centers" className="space-y-4">
          <Alert>
            <Building2 className="h-4 w-4" />
            <AlertTitle>Cost Centers</AlertTitle>
            <AlertDescription>
              Manage internal cost centers for tracking non-user expenses like club operations,
              maintenance flights, or skydive operations.
            </AlertDescription>
          </Alert>
          <CostCentersTable costCenters={costCenters} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
