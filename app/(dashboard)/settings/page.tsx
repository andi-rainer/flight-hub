import { getUserProfile } from '@/lib/supabase/server'
import { redirect } from '@/navigation'
import { getTranslations } from 'next-intl/server'
import { SettingsTabs } from './components/settings-tabs'

// Configure route to accept larger request bodies for file uploads (e.g., pilot documents)
export const maxDuration = 60
export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const t = await getTranslations('settings')
  const user = await getUserProfile()

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
      <SettingsTabs user={user} />
    </div>
  )
}
