import { redirect } from 'next/navigation'
import { getUserProfile, createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

/**
 * Check if user has an active membership
 */
async function hasActiveMembership(userId: string): Promise<boolean> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: membership } = await supabase
    .from('user_memberships')
    .select('end_date')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gte('end_date', today)
    .limit(1)
    .single()

  return !!membership
}

/**
 * Layout for authenticated dashboard routes
 * Includes sidebar navigation and top header with user menu
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Check authentication and get user profile
  const userProfile = await getUserProfile()

  if (!userProfile) {
    redirect('/login')
  }

  // Check if user has active membership (board members are exempt)
  const isBoardMember = userProfile.role?.includes('board') ?? false

  // Only check membership status for non-board members and non-account-inactive page
  if (!isBoardMember) {
    const isActive = await hasActiveMembership(userProfile.id)

    // If user is not active and not already on the account-inactive page, redirect
    if (!isActive) {
      redirect('/account-inactive')
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <Sidebar user={userProfile} />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header with mobile menu and user menu */}
        <Header user={userProfile} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
