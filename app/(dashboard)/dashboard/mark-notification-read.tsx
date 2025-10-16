'use client'

import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import { useState } from 'react'
import { markNotificationAsRead } from './actions'

interface MarkNotificationReadProps {
  notificationId: string
}

export function MarkNotificationRead({ notificationId }: MarkNotificationReadProps) {
  const [isMarking, setIsMarking] = useState(false)
  const [isMarked, setIsMarked] = useState(false)

  const handleMarkRead = async () => {
    try {
      setIsMarking(true)
      await markNotificationAsRead(notificationId)
      setIsMarked(true)
    } catch (error) {
      console.error('Error marking notification as read:', error)
    } finally {
      setIsMarking(false)
    }
  }

  if (isMarked) {
    return null
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={handleMarkRead}
      disabled={isMarking}
      className="h-6 px-2"
    >
      <Check className="h-3 w-3" />
      <span className="sr-only">Mark as read</span>
    </Button>
  )
}
