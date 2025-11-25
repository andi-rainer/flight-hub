import { Suspense } from 'react'
import { getUserProfile } from '@/lib/supabase/server'
import { redirect } from '@/navigation'
import { hasPermission, type PermissionUser } from '@/lib/permissions'
import { FlightlogContent } from './flightlog-content'
import { Loader2 } from 'lucide-react'

// Configure route to accept larger request bodies for file uploads (M&B PDFs)
export const maxDuration = 60
export const dynamic = 'force-dynamic'

interface FlightlogAircraftPageProps {
  params: Promise<{
    aircraftId: string
  }>
}

export default async function FlightlogAircraftPage({ params }: FlightlogAircraftPageProps) {
  const userProfile = await getUserProfile()

  if (!userProfile) {
    redirect('/login')
  }

  // Check permission to view flight log (userProfile satisfies PermissionUser interface)
  if (!hasPermission(userProfile as PermissionUser, 'flight.log.view')) {
    redirect('/dashboard?error=unauthorized')
  }

  // Await params before accessing its properties (Next.js 15 requirement)
  const { aircraftId } = await params

  return (
    <Suspense
      fallback={
        <div className="flex h-[600px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <FlightlogContent
        aircraftId={aircraftId}
        userProfile={userProfile}
        isBoardMember={userProfile.role?.includes('board') || false}
      />
    </Suspense>
  )
}
