import { createClient } from '@/lib/supabase/server'
import { Plane, User } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import Link from 'next/link'
import { AircraftFilters } from './components/aircraft-filters'
import { AddAircraftDialog } from './components/add-aircraft-dialog'
import { Eye } from 'lucide-react'

interface AircraftWithAvailability extends Plane {
  isAvailable: boolean
}

async function getAircrafts(searchParams: { status?: string; search?: string }): Promise<AircraftWithAvailability[]> {
  const supabase = await createClient()

  let query = supabase
    .from('planes')
    .select('*')
    .order('tail_number', { ascending: true })

  // Filter by active/inactive status
  if (searchParams.status === 'active') {
    query = query.eq('active', true)
  } else if (searchParams.status === 'inactive') {
    query = query.eq('active', false)
  }

  const { data: planes, error } = await query

  if (error) {
    console.error('Error fetching aircrafts:', error)
    return []
  }

  if (!planes) return []

  // Check availability for each aircraft
  const now = new Date().toISOString()
  const planesWithAvailability = await Promise.all(
    planes.map(async (plane) => {
      const { data: activeReservations } = await supabase
        .from('reservations')
        .select('id')
        .eq('plane_id', plane.id)
        .eq('status', 'active')
        .lte('start_time', now)
        .gte('end_time', now)
        .limit(1)

      return {
        ...plane,
        isAvailable: !activeReservations || activeReservations.length === 0,
      }
    })
  )

  // Apply search filter (client-side for simplicity)
  if (searchParams.search) {
    const searchLower = searchParams.search.toLowerCase()
    return planesWithAvailability.filter(
      (plane) =>
        plane.tail_number.toLowerCase().includes(searchLower) ||
        plane.type.toLowerCase().includes(searchLower)
    )
  }

  return planesWithAvailability
}

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

export default async function AircraftsPage({
  searchParams,
}: {
  searchParams: { status?: string; search?: string }
}) {
  const [aircrafts, currentUser] = await Promise.all([
    getAircrafts(searchParams),
    getCurrentUser(),
  ])

  const isBoardMember = currentUser?.role?.includes('board') ?? false

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircrafts</h1>
          <p className="text-muted-foreground">Manage your fleet of aircraft</p>
        </div>
        {isBoardMember && <AddAircraftDialog />}
      </div>

      <AircraftFilters />

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tail Number</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Availability</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {aircrafts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No aircrafts found
                </TableCell>
              </TableRow>
            ) : (
              aircrafts.map((aircraft) => (
                <TableRow key={aircraft.id}>
                  <TableCell className="font-medium">{aircraft.tail_number}</TableCell>
                  <TableCell>{aircraft.type}</TableCell>
                  <TableCell>
                    <Badge variant={aircraft.active ? 'default' : 'secondary'}>
                      {aircraft.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={aircraft.isAvailable ? 'outline' : 'destructive'}>
                      {aircraft.isAvailable ? 'Available' : 'Reserved'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/aircrafts/${aircraft.id}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {aircrafts.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              No aircrafts found
            </CardContent>
          </Card>
        ) : (
          aircrafts.map((aircraft) => (
            <Card key={aircraft.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{aircraft.tail_number}</CardTitle>
                    <CardDescription>{aircraft.type}</CardDescription>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Badge variant={aircraft.active ? 'default' : 'secondary'}>
                      {aircraft.active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant={aircraft.isAvailable ? 'outline' : 'destructive'}>
                      {aircraft.isAvailable ? 'Available' : 'Reserved'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" asChild className="w-full">
                  <Link href={`/aircrafts/${aircraft.id}`}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
