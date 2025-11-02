import { getUserProfile } from '@/lib/supabase/server'
import { redirect } from '@/navigation'
import { FlightlogList } from './flightlog-list'

export const metadata = {
  title: 'Flight Log - FlightHub',
  description: 'Select an aircraft to view its flight log',
}

export default async function FlightlogPage() {
  const userProfile = await getUserProfile()

  if (!userProfile) {
    redirect('/login')
  }

  return <FlightlogList />
}
