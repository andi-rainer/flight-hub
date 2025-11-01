import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UserProfileSection } from './user-profile-section'
import type { User } from '@/lib/database.types'

type UserWithFunctionNames = User & {
  functionNames?: string[]
}

async function getCurrentUser(): Promise<{ user: UserWithFunctionNames; isBoardMember: boolean } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  // Check if user is board member
  const isBoardMember = profile.role?.includes('board') ?? false

  // Fetch function names if user has functions
  let functionNames: string[] = []
  if (profile.functions && profile.functions.length > 0) {
    const { data: functions } = await supabase
      .from('functions_master')
      .select('id, name')
      .in('id', profile.functions)

    if (functions) {
      functionNames = functions.map(f => f.name)
    }
  }

  return {
    user: {
      ...profile,
      functionNames,
    },
    isBoardMember,
  }
}

export default async function ProfilePage() {
  const result = await getCurrentUser()

  if (!result) {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          Manage your personal information and account details
        </p>
      </div>

      {/* Content */}
      <UserProfileSection user={result.user} isBoardMember={result.isBoardMember} />
    </div>
  )
}
