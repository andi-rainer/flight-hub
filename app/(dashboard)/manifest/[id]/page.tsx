import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { hasPermission } from '@/lib/permissions'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { OperationDayHeader } from './components/operation-day-header'
import { BookingTimeframesSection } from './components/booking-timeframes-section'
import { FlightManagementSection } from './components/flight-management-section'

export const dynamic = 'force-dynamic'

async function getOperationDay(id: string) {
  const supabase = await createClient()

  const { data: operationDay, error } = await supabase
    .from('skydive_operation_days')
    .select(`
      *,
      plane:planes(
        id,
        tail_number,
        type,
        max_jumpers
      ),
      created_by_user:users!created_by(name, surname),
      flights:skydive_flights(
        *,
        pilot:users!pilot_id(id, name, surname),
        jumpers:skydive_flight_jumpers(
          *,
          sport_jumper:users!sport_jumper_id(id, name, surname),
          tandem_master:users!tandem_master_id(id, name, surname),
          passenger:users!passenger_id(id, name, surname, email, tandem_jump_completed)
        )
      )
    `)
    .eq('id', id)
    .order('scheduled_time', {
      referencedTable: 'skydive_flights',
      ascending: true
    })
    .single()

  if (error || !operationDay) {
    return null
  }

  return operationDay
}

async function getManifestSettings() {
  const supabase = await createClient()

  const { data: settings } = await supabase
    .from('manifest_settings')
    .select('*')
    .single()

  return settings || {
    default_jump_altitude_feet: 13000,
    default_flight_interval_minutes: 30,
    default_operation_start_time: '09:00:00',
  }
}

export default async function OperationDayDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

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

  const canManage = hasPermission(profile, 'manifest.operation_days.edit')

  const [operationDay, manifestSettings] = await Promise.all([
    getOperationDay(id),
    getManifestSettings(),
  ])

  if (!operationDay) {
    notFound()
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/manifest">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Manifest
        </Link>
      </Button>

      {/* Operation Day Header */}
      <OperationDayHeader operationDay={operationDay as any} canManage={canManage} />

      {/* Booking Timeframes Section */}
      <BookingTimeframesSection
        operationDayId={id}
        operationDate={operationDay.operation_date}
        canManage={canManage}
      />

      {/* Flight Management Section */}
      <FlightManagementSection
        operationDay={operationDay as any}
        manifestSettings={manifestSettings}
        canManage={canManage}
        userProfile={profile}
      />
    </div>
  )
}
