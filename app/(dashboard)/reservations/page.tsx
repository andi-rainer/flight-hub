import { Suspense } from 'react'
import { getUserProfile } from '@/lib/supabase/server'
import { redirect } from '@/navigation'
import { ReservationsContent } from './reservations-content'
import { Loader2 } from 'lucide-react'

export const metadata = {
  title: 'Reservations - FlightHub',
  description: 'View and manage aircraft reservations',
}

export default async function ReservationsPage() {
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
      <ReservationsContent userId={userProfile.id} isBoardMember={userProfile.role?.includes('board') || false} />
    </Suspense>
  )
}
