'use client'

import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { MobileSidebar } from './sidebar'
import { UserMenu } from './user-menu'
import { ModeToggle } from './mode-toggle'
import type { User } from '@/lib/database.types'

interface HeaderProps {
  user: User
}

export function Header({ user }: HeaderProps) {
  const pathname = usePathname()
  const t = useTranslations('nav')

  // Map routes to translation keys
  const pageTranslationKeys: Record<string, { title: string; description: string }> = {
    '/dashboard': { title: 'dashboard', description: 'dashboardDescription' },
    '/reservations': { title: 'reservations', description: 'reservationsDescription' },
    '/aircrafts': { title: 'aircrafts', description: 'aircraftsDescription' },
    '/flightlog': { title: 'flightLog', description: 'flightLogDescription' },
    '/members': { title: 'members', description: 'membersDescription' },
    '/documents': { title: 'documents', description: 'documentsDescription' },
    '/settings': { title: 'settings', description: 'settingsDescription' },
  }

  const translationKeys = pageTranslationKeys[pathname]

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center gap-4 px-4 md:px-6">
        <MobileSidebar user={user} />

        {/* Page Title - Hidden on mobile when sidebar is shown */}
        {translationKeys && (
          <div className="hidden md:block flex-1">
            <h1 className="text-xl font-semibold tracking-tight">{t(translationKeys.title)}</h1>
            <p className="text-xs text-muted-foreground">{t(translationKeys.description)}</p>
          </div>
        )}

        {translationKeys ? null : <div className="flex-1" />}

        <div className="flex items-center gap-2">
          <ModeToggle />
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  )
}
