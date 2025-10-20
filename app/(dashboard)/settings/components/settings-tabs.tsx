'use client'

import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProfileSection } from './profile-section'
import { PilotDocumentsSection } from './pilot-documents-section'
import { DocumentTypesSection } from './document-types-section'
import type { User } from '@/lib/database.types'

interface SettingsTabsProps {
  user: User
  isBoardMember: boolean
}

export function SettingsTabs({ user, isBoardMember }: SettingsTabsProps) {
  const [userAlertsCount, setUserAlertsCount] = useState(0)

  // Fetch user document alerts
  const fetchUserAlerts = () => {
    fetch(`/api/documents/user-alerts?userId=${user.id}`)
      .then(res => res.json())
      .then(data => setUserAlertsCount(data.count || 0))
      .catch(err => console.error('Error fetching user alerts:', err))
  }

  useEffect(() => {
    fetchUserAlerts()
  }, [user.id])

  // Listen for document updates to refresh badge
  useEffect(() => {
    window.addEventListener('document-updated', fetchUserAlerts)
    return () => window.removeEventListener('document-updated', fetchUserAlerts)
  }, [user.id])

  return (
    <Tabs defaultValue="profile" className="space-y-6">
      <TabsList>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="documents" className="relative">
          My Documents
          {userAlertsCount > 0 && (
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive"></span>
          )}
        </TabsTrigger>
        {isBoardMember && <TabsTrigger value="document-types">Document Settings</TabsTrigger>}
      </TabsList>

      <TabsContent value="profile" className="space-y-4">
        <ProfileSection user={user} />
      </TabsContent>

      <TabsContent value="documents" className="space-y-4">
        <PilotDocumentsSection userId={user.id} isBoardMember={isBoardMember} />
      </TabsContent>

      {isBoardMember && (
        <TabsContent value="document-types" className="space-y-4">
          <DocumentTypesSection />
        </TabsContent>
      )}
    </Tabs>
  )
}
