import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { hasPermission } from '@/lib/permissions'
import { OperationDayList } from './components/operation-day-list'
import { CreateOperationDayDialog } from './components/create-operation-day-dialog'
import { ManifestSettings } from './components/manifest-settings'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const dynamic = 'force-dynamic'

export default async function ManifestPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Get user with functions
  const { data: profile } = await supabase
    .from('users_with_functions')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const canManage = hasPermission(profile, 'manifest.operation_days.create')
  const canEditSettings = hasPermission(profile, 'settings.edit.system')

  // Get manifest settings
  const { data: manifestSettings } = await supabase
    .from('manifest_settings')
    .select('*')
    .single()

  // Get all operation days from today onwards
  const today = new Date().toISOString().split('T')[0]

  const { data: operationDays, error: opDaysError } = await supabase
    .from('skydive_operation_days')
    .select(
      `
      *,
      plane:planes(tail_number, type),
      flights:skydive_flights(
        id,
        flight_number,
        scheduled_time,
        status,
        pilot_id,
        pilot:users(name, surname)
      )
    `
    )
    .gte('operation_date', today)
    .order('operation_date', { ascending: true })

  if (opDaysError) {
    console.error('Error fetching operation days:', opDaysError)
  }

  // Get available aircraft for operation days (only skydive aircrafts)
  const { data: availablePlanes, error: planesError } = await supabase
    .from('planes')
    .select('id, tail_number, type')
    .eq('active', true)
    .eq('is_skydive_aircraft', true)
    .order('tail_number', { ascending: true })

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Skydive Manifest</h1>
          <p className="text-muted-foreground">
            Manage skydive operation days and flight schedules
          </p>
        </div>
      </div>

      <Tabs defaultValue="operations" className="space-y-6">
        <TabsList>
          <TabsTrigger value="operations">Operation Days</TabsTrigger>
          {canEditSettings && <TabsTrigger value="settings">Skydive Settings</TabsTrigger>}
        </TabsList>

        <TabsContent value="operations" className="space-y-6">
          <div className="flex items-center justify-end">
            {canManage && <CreateOperationDayDialog availablePlanes={availablePlanes || []} />}
          </div>

          <div className="grid gap-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Upcoming Operation Days</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {operationDays?.filter((od) => od.status !== 'cancelled' && od.status !== 'completed').length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Upcoming</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Flights Scheduled</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {operationDays?.reduce((acc, od) => acc + (od.flights?.length || 0), 0) || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Across all operation days</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Today</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {operationDays?.filter(
                      (od) =>
                        od.operation_date === new Date().toISOString().split('T')[0] &&
                        od.status === 'active'
                    ).length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Currently active operations</p>
                </CardContent>
              </Card>
            </div>

            {/* Operation Days List */}
            <Card>
              <CardHeader>
                <CardTitle>Operation Days</CardTitle>
                <CardDescription>
                  Planned skydive operations with aircraft and flight schedules
                </CardDescription>
              </CardHeader>
              <CardContent>
                <OperationDayList
                  operationDays={(operationDays as any) || []}
                  availablePlanes={availablePlanes || []}
                  canManage={canManage}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {canEditSettings && (
          <TabsContent value="settings">
            <ManifestSettings settings={manifestSettings} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
