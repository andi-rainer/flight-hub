import { Suspense } from 'react'
import { getUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FlightlogContent } from './flightlog-content'
import { Loader2 } from 'lucide-react'

export const metadata = {
  title: 'Flight Log - FlightHub',
  description: 'Track and manage flight logs',
}

export default async function FlightlogPage() {
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
        userId={userProfile.id}
        isBoardMember={userProfile.role?.includes('board') || false}
      />
    </Suspense>
  )
}
