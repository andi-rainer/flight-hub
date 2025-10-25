'use client'

import { usePathname } from 'next/navigation'
import { MobileSidebar } from './sidebar'
import { UserMenu } from './user-menu'
import { ModeToggle } from './mode-toggle'
import type { User } from '@/lib/database.types'

interface HeaderProps {
  user: User
}

// Page titles and descriptions based on route
const pageTitles: Record<string, { title: string; description: string }> = {
  '/dashboard': {
    title: 'Dashboard',
    description: 'Overview of your flight activities',
  },
  '/reservations': {
    title: 'Reservations',
    description: 'View and manage aircraft reservations',
  },
  '/aircrafts': {
    title: 'Aircraft',
    description: 'View aircraft fleet information',
  },
  '/flightlog': {
    title: 'Flight Log',
    description: 'Track and manage flight logs',
  },
  '/members': {
    title: 'Members',
    description: 'View and manage club members',
  },
  '/documents': {
    title: 'Documents',
    description: 'Upload and manage your flight documents',
  },
  '/settings': {
    title: 'Settings',
    description: 'Manage your account and preferences',
  },
}

export function Header({ user }: HeaderProps) {
  const pathname = usePathname()
  const pageInfo = pageTitles[pathname]

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center gap-4 px-4 md:px-6">
        <MobileSidebar user={user} />

        {/* Page Title - Hidden on mobile when sidebar is shown */}
        {pageInfo && (
          <div className="hidden md:block flex-1">
            <h1 className="text-xl font-semibold tracking-tight">{pageInfo.title}</h1>
            <p className="text-xs text-muted-foreground">{pageInfo.description}</p>
          </div>
        )}

        {pageInfo ? null : <div className="flex-1" />}

        <div className="flex items-center gap-2">
          <ModeToggle />
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  )
}
