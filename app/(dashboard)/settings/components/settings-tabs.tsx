'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PilotDocumentsSection } from './pilot-documents-section'
import { DocumentTypesSection } from './document-types-section'
import { AirportFeesSection } from './airport-fees-section'
import { MembershipTypesSection } from './membership-types-section'
import { TandemRegistrationSection } from './tandem-registration-section'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/lib/database.types'

interface SettingsTabsProps {
  user: User
  isBoardMember: boolean
}

export function SettingsTabs({ user, isBoardMember }: SettingsTabsProps) {
  const t = useTranslations('settings')
  const [userAlertsCount, setUserAlertsCount] = useState(0)

  // Fetch user document alerts
  const fetchUserAlerts = () => {
    fetch(`/api/documents/user-alerts?userId=${user.id}`)
      .then(res => res.json())
      .then(data => {
        setUserAlertsCount(data.count || 0)
        // Also trigger sidebar badge update
        window.dispatchEvent(new Event('user-alerts-updated'))
      })
      .catch(err => console.error('Error fetching user alerts:', err))
  }

  // Initial fetch
  useEffect(() => {
    fetchUserAlerts()
  }, [user.id])

  // Real-time subscription for documents table changes
  useEffect(() => {
    const supabase = createClient()

    // Subscribe to document changes that affect this user
    const documentsSubscription = supabase
      .channel('user-documents-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'documents',
          filter: `user_id=eq.${user.id}`, // Only changes for this user
        },
        (payload) => {
          console.log('Real-time user document change detected:', payload)
          // Refetch alerts when user's documents change
          fetchUserAlerts()
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      documentsSubscription.unsubscribe()
    }
  }, [user.id])

  // Also listen for manual refresh events (for immediate feedback)
  useEffect(() => {
    window.addEventListener('document-updated', fetchUserAlerts)
    return () => window.removeEventListener('document-updated', fetchUserAlerts)
  }, [user.id])

  return (
    <Tabs defaultValue="documents" className="space-y-6">
      <TabsList>
        <TabsTrigger value="documents" className="relative">
          {t('myDocuments')}
          {userAlertsCount > 0 && (
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive"></span>
          )}
        </TabsTrigger>
        {isBoardMember && <TabsTrigger value="document-types">{t('documentTypes')}</TabsTrigger>}
        {isBoardMember && <TabsTrigger value="membership-types">{t('membershipTypes')}</TabsTrigger>}
        {isBoardMember && <TabsTrigger value="tandem-registration">{t('tandemRegistration')}</TabsTrigger>}
        {isBoardMember && <TabsTrigger value="airport-fees">{t('airportFees')}</TabsTrigger>}
      </TabsList>

      <TabsContent value="documents" className="space-y-4">
        <PilotDocumentsSection userId={user.id} isBoardMember={isBoardMember} />
      </TabsContent>

      {isBoardMember && (
        <TabsContent value="document-types" className="space-y-4">
          <DocumentTypesSection />
        </TabsContent>
      )}

      {isBoardMember && (
        <TabsContent value="membership-types" className="space-y-4">
          <MembershipTypesSection />
        </TabsContent>
      )}

      {isBoardMember && (
        <TabsContent value="tandem-registration" className="space-y-4">
          <TandemRegistrationSection />
        </TabsContent>
      )}

      {isBoardMember && (
        <TabsContent value="airport-fees" className="space-y-4">
          <AirportFeesSection />
        </TabsContent>
      )}
    </Tabs>
  )
}
