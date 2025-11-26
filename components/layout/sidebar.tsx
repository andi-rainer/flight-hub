'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/lib/database.types'
import { hasPermission, type Permission } from '@/lib/permissions'
import {
  LayoutDashboard,
  Plane,
  Calendar,
  BookOpen,
  Users,
  FileText,
  Settings,
  Menu,
  CreditCard,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Shield,
  PlaneTakeoff,
  Ticket,
  Receipt,
} from 'lucide-react'

interface NavItem {
  titleKey: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  requiredPermission?: Permission
  // Legacy support - will be replaced by requiredPermission
  requiresBoard?: boolean
}

interface SidebarProps {
  user: User
  collapsed?: boolean
  onToggle?: () => void
}

const navItems: NavItem[] = [
  {
    titleKey: 'dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    // Dashboard is accessible to everyone
  },
  {
    titleKey: 'aircrafts',
    href: '/aircrafts',
    icon: Plane,
    requiredPermission: 'aircraft.view',
  },
  {
    titleKey: 'reservations',
    href: '/reservations',
    icon: Calendar,
    // Reservations accessible to everyone
  },
  {
    titleKey: 'manifest',
    href: '/manifest',
    icon: PlaneTakeoff,
    requiredPermission: 'manifest.view',
  },
  {
    titleKey: 'vouchers',
    href: '/vouchers',
    icon: Ticket,
    requiredPermission: 'manifest.view',
  },
  {
    titleKey: 'bookings',
    href: '/bookings',
    icon: Receipt,
    requiredPermission: 'manifest.view',
  },
  {
    titleKey: 'flightLog',
    href: '/flightlog',
    icon: BookOpen,
    requiredPermission: 'flight.log.view',
  },
  {
    titleKey: 'members',
    href: '/members',
    icon: Users,
    requiredPermission: 'members.view.all',
  },
  {
    titleKey: 'billing',
    href: '/billing',
    icon: CreditCard,
    requiredPermission: 'billing.view.all',
  },
  {
    titleKey: 'accounting',
    href: '/accounting',
    icon: Calculator,
    requiredPermission: 'billing.view.all',
  },
  {
    titleKey: 'licenses',
    href: '/licenses',
    icon: FileText,
    requiredPermission: 'documents.view.own',
  },
  {
    titleKey: 'documents',
    href: '/documents',
    icon: FileText,
    requiredPermission: 'documents.view.own',
  },
  {
    titleKey: 'settings',
    href: '/settings',
    icon: Settings,
    requiredPermission: 'settings.view',
  },
  {
    titleKey: 'permissions',
    href: '/permissions',
    icon: Shield,
    requiredPermission: 'functions.view', // Board members only
  },
]

function SidebarContent({ user, onNavigate, collapsed, onToggle }: { user: User; onNavigate?: () => void; collapsed?: boolean; onToggle?: () => void }) {
  const t = useTranslations('nav')
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

  // Real-time subscription for documents and endorsements table changes
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
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'document_endorsements',
        },
        (payload) => {
          console.log('Real-time endorsement change detected:', payload)
          // Refetch user alerts when endorsements change
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

  // Filter nav items based on user permissions
  const filteredNavItems = navItems.filter((item) => {
    // If item has a required permission, check it
    if (item.requiredPermission) {
      return hasPermission(user, item.requiredPermission)
    }

    // Legacy board check (deprecated, use requiredPermission instead)
    if (item.requiresBoard) {
      return isBoardMember
    }

    // No permission required - show to everyone
    return true
  })

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-3">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold overflow-hidden" onClick={onNavigate}>
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Plane className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && <span className="text-lg">FlightHub</span>}
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-1 py-4">
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
            } else if (item.href === '/licenses' && userAlertsCount > 0) {
              showBadge = true
              // Show a red dot for user license alerts
              badgeContent = null
            } else if (item.badge) {
              showBadge = true
              badgeContent = item.badge
            }

            const title = t(item.titleKey)

            return (
              <Link key={item.href} href={item.href} onClick={onNavigate}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full gap-3',
                    collapsed ? 'justify-center px-2' : 'justify-start',
                    isActive && 'bg-secondary font-medium'
                  )}
                  title={collapsed ? title : undefined}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {!collapsed && <span className="flex-1 text-left">{title}</span>}
                  {!collapsed && showBadge && (
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
                  {collapsed && showBadge && badgeContent && (
                    <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-semibold flex items-center justify-center text-white">
                      {badgeContent}
                    </span>
                  )}
                  {collapsed && showBadge && !badgeContent && (
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive"></span>
                  )}
                </Button>
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      {/* Footer with Toggle Button */}
      <div className="border-t">
        {!collapsed && (
          <div className="p-4 pb-2">
            <p className="text-xs text-muted-foreground text-center">
              FlightHub v1.0
            </p>
          </div>
        )}
        {onToggle && (
          <div className={cn("p-2", collapsed ? "flex justify-center" : "flex justify-end")}>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              title={collapsed ? t('expandSidebar') : t('collapseSidebar')}
              className="h-8 w-8"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export function Sidebar({ user }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('sidebar-collapsed')
    if (savedState !== null) {
      setCollapsed(savedState === 'true')
    }
  }, [])

  // Save collapsed state to localStorage when it changes
  const handleToggle = () => {
    const newState = !collapsed
    setCollapsed(newState)
    localStorage.setItem('sidebar-collapsed', String(newState))
  }

  return (
    <aside className={cn(
      "hidden md:flex h-screen flex-col border-r bg-background transition-all duration-300",
      collapsed ? "w-16" : "w-40"
    )}>
      <SidebarContent user={user} collapsed={collapsed} onToggle={handleToggle} />
    </aside>
  )
}

export function MobileSidebar({ user }: SidebarProps) {
  const t = useTranslations('nav')
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">{t('toggleMenu')}</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-64">
        <SidebarContent user={user} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}
