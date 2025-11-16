import { getUserProfile } from '@/lib/supabase/server'
import { redirect } from '@/navigation'
import { getTranslations } from 'next-intl/server'
import { PilotDocumentsSection } from '@/app/(dashboard)/settings/components/pilot-documents-section'

export default async function LicensesPage() {
  const t = await getTranslations('licenses')
  const user = await getUserProfile()

  if (!user) {
    redirect('/login')
  }

  const isBoardMember = user.role?.includes('board') ?? false

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('description')}
        </p>
      </div>

      {/* Content */}
      <PilotDocumentsSection userId={user.id} isBoardMember={isBoardMember} />
    </div>
  )
}
