'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Bell, AlertCircle, CheckCircle2, Info, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDistance } from 'date-fns'
import { Link } from '@/navigation'
import { MarkNotificationRead } from '../mark-notification-read'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  document_id: string | null
  created_at: string
}

interface NotificationsCardProps {
  userId: string
  initialNotifications: Notification[]
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'reservation_active':
      return <CheckCircle2 className="h-4 w-4" />
    case 'document_expiring':
      return <AlertCircle className="h-4 w-4" />
    case 'document_uploaded':
      return <FileText className="h-4 w-4" />
    case 'document_approved':
      return <CheckCircle2 className="h-4 w-4" />
    case 'general':
      return <Info className="h-4 w-4" />
    default:
      return <Bell className="h-4 w-4" />
  }
}

export function NotificationsCard({ userId, initialNotifications }: NotificationsCardProps) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)

  // Fetch notifications
  const fetchNotifications = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('notifications')
      .select('id, type, title, message, link, document_id, created_at')
      .eq('user_id', userId)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(5)

    if (data) {
      setNotifications(data)
    }
  }

  // Real-time subscription for notifications
  useEffect(() => {
    const supabase = createClient()

    // Subscribe to notification changes for this user
    const notificationsSubscription = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Real-time notification change detected:', payload)
          // Refetch notifications when any change happens
          fetchNotifications()
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      notificationsSubscription.unsubscribe()
    }
  }, [userId])

  if (notifications.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>
          Unread notifications and alerts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Alert key={notification.id}>
              {getNotificationIcon(notification.type)}
              <div className="flex items-start justify-between gap-2 w-full">
                <div className="flex-1">
                  <AlertTitle className="text-sm">
                    {notification.title}
                  </AlertTitle>
                  <AlertDescription className="text-xs">
                    {notification.message}
                    <span className="text-muted-foreground ml-2">
                      • {formatDistance(new Date(notification.created_at), new Date(), { addSuffix: true })}
                    </span>
                    {notification.link && (
                      <div className="mt-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={notification.link}>
                            View Details
                          </Link>
                        </Button>
                      </div>
                    )}
                  </AlertDescription>
                </div>
                <MarkNotificationRead notificationId={notification.id} />
              </div>
            </Alert>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
