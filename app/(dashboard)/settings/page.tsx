import { createClient } from '@/lib/supabase/server'
import { redirect } from '@/navigation'
import { getTranslations } from 'next-intl/server'
import { SettingsTabs } from './components/settings-tabs'
import type { User } from '@/lib/database.types'

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

export default async function SettingsPage() {
  const t = await getTranslations('settings')
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const isBoardMember = user.role?.includes('board') ?? false

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">
          {isBoardMember ? t('boardDescription') : t('memberDescription')}
        </p>
      </div>

      {/* Content */}
      <SettingsTabs user={user} isBoardMember={isBoardMember} />
    </div>
  )
}
