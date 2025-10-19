import { Suspense } from 'react'
import { createClient, getUser } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  Plane,
  Calendar,
  FileText,
  DollarSign,
  Clock,
  Bell,
  Plus,
  AlertCircle,
  CheckCircle2,
  Info,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { format, formatDistance, addDays, differenceInMinutes } from 'date-fns'
import { MarkNotificationRead } from './mark-notification-read'

interface DashboardData {
  upcomingReservations: Array<{
    id: string
    start_time: string
    end_time: string
    status: 'active' | 'standby' | 'cancelled'
    plane: {
      tail_number: string
      type: string
    }
    user: {
      name: string
      surname: string
    }
  }>
  accountBalance: number
  recentTransactions: Array<{
    id: string
    amount: number
    description: string
    created_at: string
  }>
  recentFlights: Array<{
    id: string
    block_on: string
    block_off: string
    plane: {
      tail_number: string
      type: string
    }
    charged: boolean
    block_time_hours: number
  }>
  monthlyFlightCost: number
  unreadNotifications: Array<{
    id: string
    type: string
    title: string
    message: string
    link: string | null
    document_id: string | null
    created_at: string
  }>
}

async function fetchDashboardData(userId: string): Promise<DashboardData> {
  const supabase = await createClient()

  // Calculate date ranges
  const now = new Date()
  const sevenDaysFromNow = addDays(now, 7)
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  // Fetch upcoming reservations (next 7 days)
  const { data: reservations } = await supabase
    .from('reservations')
    .select(`
      id,
      start_time,
      end_time,
      status,
      plane:planes(tail_number, type),
      user:users(name, surname)
    `)
    .gte('start_time', now.toISOString())
    .lte('start_time', sevenDaysFromNow.toISOString())
    .in('status', ['active', 'standby'])
    .order('start_time', { ascending: true })
    .limit(10)

  // Fetch account balance - sum all transactions for the user
  const { data: balanceData } = await supabase
    .from('accounts')
    .select('amount')
    .eq('user_id', userId)

  const accountBalance = balanceData?.reduce((sum, record) => sum + record.amount, 0) || 0

  // Fetch recent transactions
  const { data: transactions } = await supabase
    .from('accounts')
    .select('id, amount, description, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10)

  // Fetch recent flight logs where user is pilot or copilot
  const { data: flightlogs } = await supabase
    .from('flightlog')
    .select(`
      id,
      block_on,
      block_off,
      charged,
      plane:planes(tail_number, type)
    `)
    .or(`pilot_id.eq.${userId},copilot_id.eq.${userId}`)
    .order('block_on', { ascending: false })
    .limit(10)

  // Calculate block time and costs for flights
  const recentFlights = flightlogs?.map(flight => {
    const blockOn = new Date(flight.block_on)
    const blockOff = new Date(flight.block_off)
    const blockTimeMinutes = differenceInMinutes(blockOff, blockOn)
    const block_time_hours = blockTimeMinutes / 60

    return {
      id: flight.id,
      block_on: flight.block_on,
      block_off: flight.block_off,
      plane: flight.plane,
      charged: flight.charged,
      block_time_hours,
    }
  }) || []

  // Calculate monthly flight cost (for current month)
  const { data: monthlyFlights } = await supabase
    .from('flightlog')
    .select('block_on, block_off, charged')
    .or(`pilot_id.eq.${userId},copilot_id.eq.${userId}`)
    .gte('block_on', firstOfMonth.toISOString())
    .eq('charged', true)

  const monthlyFlightCost = monthlyFlights?.reduce((total, flight) => {
    const blockOn = new Date(flight.block_on)
    const blockOff = new Date(flight.block_off)
    const blockTimeMinutes = differenceInMinutes(blockOff, blockOn)
    const hours = blockTimeMinutes / 60
    // Assuming a standard rate - you may want to fetch this from a config
    const estimatedCost = hours * 150 // $150 per hour (example rate)
    return total + estimatedCost
  }, 0) || 0

  // Fetch unread notifications
  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, type, title, message, link, document_id, created_at')
    .eq('user_id', userId)
    .eq('read', false)
    .order('created_at', { ascending: false })
    .limit(5)

  return {
    upcomingReservations: reservations || [],
    accountBalance,
    recentTransactions: transactions || [],
    recentFlights,
    monthlyFlightCost,
    unreadNotifications: notifications || [],
  }
}

function getStatusColor(status: 'active' | 'standby' | 'cancelled') {
  switch (status) {
    case 'active':
      return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20'
    case 'standby':
      return 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20'
    case 'cancelled':
      return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20'
    default:
      return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20'
  }
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'reservation_active':
      return <CheckCircle2 className="h-4 w-4" />
    case 'document_expiring':
      return <AlertCircle className="h-4 w-4" />
    case 'document_uploaded':
      return <FileText className="h-4 w-4" />
    case 'document_approved':
      return <CheckCircle2 className="h-4 w-4" />
    case 'general':
      return <Info className="h-4 w-4" />
    default:
      return <Bell className="h-4 w-4" />
  }
}

async function DashboardContent() {
  const user = await getUser()

  if (!user) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            Please log in to view your dashboard.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const supabase = await createClient()

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch all dashboard data
  const dashboardData = await fetchDashboardData(user.id)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {profile?.name || 'User'}!
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your flight club activity
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Reservations
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.upcomingReservations.filter(r => r.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Next 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Account Balance
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${dashboardData.accountBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
              ${dashboardData.accountBalance.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Current balance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Flight Cost
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${dashboardData.monthlyFlightCost.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(), 'MMMM yyyy')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Notifications
            </CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.unreadNotifications.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Unread messages
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks and shortcuts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/reservations">
                <Calendar className="mr-2 h-4 w-4" />
                New Reservation
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/flightlog">
                <Plane className="mr-2 h-4 w-4" />
                Log Flight
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/documents">
                <FileText className="mr-2 h-4 w-4" />
                General Documents
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Upcoming Reservations */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Upcoming Reservations</CardTitle>
            <CardDescription>
              Your reservations for the next 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dashboardData.upcomingReservations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No upcoming reservations
              </p>
            ) : (
              <div className="space-y-4">
                {dashboardData.upcomingReservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 border rounded-lg"
                  >
                    <div className="flex items-start gap-3">
                      <Plane className="h-5 w-5 mt-0.5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">
                          {reservation.plane.tail_number} - {reservation.plane.type}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Pilot: {reservation.user.name} {reservation.user.surname}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(reservation.start_time), 'MMM d, yyyy')} • {' '}
                          {format(new Date(reservation.start_time), 'HH:mm')} - {' '}
                          {format(new Date(reservation.end_time), 'HH:mm')}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={getStatusColor(reservation.status)}
                    >
                      {reservation.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Balance & Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Account Transactions</CardTitle>
            <CardDescription>
              Recent account activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dashboardData.recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No recent transactions
              </p>
            ) : (
              <div className="space-y-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboardData.recentTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {format(new Date(transaction.created_at), 'MMM d')}
                        </TableCell>
                        <TableCell className="text-sm">
                          {transaction.description}
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium ${
                            transaction.amount >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {transaction.amount >= 0 ? '+' : ''}
                          ${transaction.amount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Separator />
                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm font-medium">Current Balance</span>
                  <span
                    className={`text-lg font-bold ${
                      dashboardData.accountBalance >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    ${dashboardData.accountBalance.toFixed(2)}
                  </span>
                </div>
                <Button className="w-full mt-4" variant="outline" asChild>
                  <Link href="/settings">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Funds
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Flights */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Flights</CardTitle>
            <CardDescription>
              Your recent flight activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dashboardData.recentFlights.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No recent flights
              </p>
            ) : (
              <div className="space-y-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Aircraft</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead className="text-right">Charged</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboardData.recentFlights.map((flight) => (
                      <TableRow key={flight.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {format(new Date(flight.block_on), 'MMM d')}
                        </TableCell>
                        <TableCell className="text-sm">
                          {flight.plane.tail_number}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {flight.block_time_hours.toFixed(1)}h
                        </TableCell>
                        <TableCell className="text-right">
                          {flight.charged ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 ml-auto" />
                          ) : (
                            <XCircle className="h-4 w-4 text-gray-400 ml-auto" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Separator />
                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm font-medium">
                    {format(new Date(), 'MMMM')} Total Cost
                  </span>
                  <span className="text-lg font-bold">
                    ${dashboardData.monthlyFlightCost.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notifications */}
      {dashboardData.unreadNotifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Unread notifications and alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.unreadNotifications.map((notification) => (
                <Alert key={notification.id}>
                  {getNotificationIcon(notification.type)}
                  <div className="flex items-start justify-between gap-2 w-full">
                    <div className="flex-1">
                      <AlertTitle className="text-sm">
                        {notification.title}
                      </AlertTitle>
                      <AlertDescription className="text-xs">
                        {notification.message}
                        <span className="text-muted-foreground ml-2">
                          • {formatDistance(new Date(notification.created_at), new Date(), { addSuffix: true })}
                        </span>
                        {notification.link && (
                          <div className="mt-2">
                            <Button asChild size="sm" variant="outline">
                              <Link href={notification.link}>
                                View Details
                              </Link>
                            </Button>
                          </div>
                        )}
                      </AlertDescription>
                    </div>
                    <MarkNotificationRead notificationId={notification.id} />
                  </div>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="h-4 w-96 bg-muted animate-pulse rounded" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-20 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  )
}
