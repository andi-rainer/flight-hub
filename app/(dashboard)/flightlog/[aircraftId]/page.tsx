import { Suspense } from 'react'
import { getUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FlightlogContent } from './flightlog-content'
import { Loader2 } from 'lucide-react'

interface FlightlogAircraftPageProps {
  params: {
    aircraftId: string
  }
}

export default async function FlightlogAircraftPage({ params }: FlightlogAircraftPageProps) {
  const userProfile = await getUserProfile()

  if (!userProfile) {
    redirect('/login')
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-[600px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <FlightlogContent
        aircraftId={params.aircraftId}
        userId={userProfile.id}
        isBoardMember={userProfile.role?.includes('board') || false}
      />
    </Suspense>
  )
}
