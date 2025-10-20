'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/lib/database.types'
import {
  LayoutDashboard,
  Plane,
  Calendar,
  BookOpen,
  Users,
  FileText,
  Settings,
  Menu,
} from 'lucide-react'

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  requiresBoard?: boolean
}

interface SidebarProps {
  user: User
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Aircrafts',
    href: '/aircrafts',
    icon: Plane,
  },
  {
    title: 'Reservations',
    href: '/reservations',
    icon: Calendar,
  },
  {
    title: 'Flight Log',
    href: '/flightlog',
    icon: BookOpen,
  },
  {
    title: 'Members',
    href: '/members',
    icon: Users,
    requiresBoard: true,
  },
  {
    title: 'Documents',
    href: '/documents',
    icon: FileText,
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
]

function SidebarContent({ user, onNavigate }: { user: User; onNavigate?: () => void }) {
  const pathname = usePathname()
  const isBoardMember = user.role?.includes('board') ?? false
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0)
  const [userAlertsCount, setUserAlertsCount] = useState(0)

  // Fetch pending approvals count for board members
  const fetchPendingApprovals = () => {
    if (isBoardMember) {
      fetch('/api/documents/pending-approvals')
        .then(res => res.json())
        .then(data => setPendingApprovalsCount(data.count || 0))
        .catch(err => console.error('Error fetching pending approvals:', err))
    }
  }

  // Fetch user document alerts
  const fetchUserAlerts = () => {
    fetch(`/api/documents/user-alerts?userId=${user.id}`)
      .then(res => res.json())
      .then(data => setUserAlertsCount(data.count || 0))
      .catch(err => console.error('Error fetching user alerts:', err))
  }

  // Initial fetch
  useEffect(() => {
    fetchPendingApprovals()
    fetchUserAlerts()
  }, [isBoardMember, user.id])

  // Real-time subscription for documents table changes
  useEffect(() => {
    const supabase = createClient()

    // Subscribe to all changes on documents table
    const documentsSubscription = supabase
      .channel('documents-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'documents',
        },
        (payload) => {
          console.log('Real-time document change detected:', payload)
          // Refetch badge counts when any document changes
          fetchPendingApprovals()
          fetchUserAlerts()
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      documentsSubscription.unsubscribe()
    }
  }, [isBoardMember, user.id])

  // Also listen for manual refresh events (for immediate feedback)
  useEffect(() => {
    const handleDocumentUpdate = () => {
      fetchPendingApprovals()
      fetchUserAlerts()
    }

    const handleUserAlertsUpdate = () => {
      fetchUserAlerts()
    }

    window.addEventListener('document-updated', handleDocumentUpdate)
    window.addEventListener('user-alerts-updated', handleUserAlertsUpdate)

    return () => {
      window.removeEventListener('document-updated', handleDocumentUpdate)
      window.removeEventListener('user-alerts-updated', handleUserAlertsUpdate)
    }
  }, [isBoardMember, user.id])

  // Filter nav items based on user role
  const filteredNavItems = navItems.filter((item) => {
    if (item.requiresBoard) {
      return isBoardMember
    }
    return true
  })

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold" onClick={onNavigate}>
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Plane className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg">FlightHub</span>
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {filteredNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

            // Determine badge display for this item
            let showBadge = false
            let badgeContent: React.ReactNode = null

            if (item.href === '/members' && isBoardMember && pendingApprovalsCount > 0) {
              showBadge = true
              badgeContent = pendingApprovalsCount > 99 ? '99+' : pendingApprovalsCount
            } else if (item.href === '/settings' && userAlertsCount > 0) {
              showBadge = true
              // Just show a red dot for settings
              badgeContent = null
            } else if (item.badge) {
              showBadge = true
              badgeContent = item.badge
            }

            return (
              <Link key={item.href} href={item.href} onClick={onNavigate}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start gap-3',
                    isActive && 'bg-secondary font-medium'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-left">{item.title}</span>
                  {showBadge && (
                    badgeContent ? (
                      <Badge
                        variant="destructive"
                        className="ml-auto h-5 min-w-[20px] flex items-center justify-center rounded-full px-1.5 text-[10px] font-semibold"
                      >
                        {badgeContent}
                      </Badge>
                    ) : (
                      <span className="ml-auto h-2 w-2 rounded-full bg-destructive"></span>
                    )
                  )}
                </Button>
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-4">
        <p className="text-xs text-muted-foreground text-center">
          FlightHub v1.0
        </p>
      </div>
    </div>
  )
}

export function Sidebar({ user }: SidebarProps) {
  return (
    <aside className="hidden md:flex h-screen w-64 flex-col border-r bg-background">
      <SidebarContent user={user} />
    </aside>
  )
}

export function MobileSidebar({ user }: SidebarProps) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-64">
        <SidebarContent user={user} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}
