'use client'

import { useTranslations } from 'next-intl'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DocumentDefinitionsSection } from './document-definitions-section'
import { EndorsementsSection } from './endorsements-section'
import { AirportFeesSection } from './airport-fees-section'
import { MembershipTypesSection } from './membership-types-section'
import { TandemRegistrationSection } from './tandem-registration-section'
import { BoardContactSection } from './board-contact-section'
import { hasPermission } from '@/lib/permissions'
import type { User } from '@/lib/types'

interface SettingsTabsProps {
  user: User
}

export function SettingsTabs({ user }: SettingsTabsProps) {
  const t = useTranslations('settings')

  // Check permissions
  const canManageDocuments = hasPermission(user, 'settings.edit.system')
  const canManageEndorsements = hasPermission(user, 'settings.edit.system')
  const canManageMembershipTypes = hasPermission(user, 'settings.membership.manage')
  const canManageTandemRegistration = hasPermission(user, 'settings.tandem.manage')
  const canManageAirportFees = hasPermission(user, 'settings.airport_fees.manage')
  const canManageBoardContact = hasPermission(user, 'settings.edit.system') // Board members only

  // Determine default tab based on permissions
  const getDefaultTab = () => {
    if (canManageDocuments) return 'documents'
    if (canManageEndorsements) return 'endorsements'
    if (canManageMembershipTypes) return 'membership-types'
    if (canManageTandemRegistration) return 'tandem-registration'
    if (canManageAirportFees) return 'airport-fees'
    if (canManageBoardContact) return 'board-contact'
    return 'documents' // fallback
  }

  return (
    <Tabs defaultValue={getDefaultTab()} className="space-y-6">
      <TabsList>
        {canManageDocuments && <TabsTrigger value="documents">Documents</TabsTrigger>}
        {canManageEndorsements && <TabsTrigger value="endorsements">Endorsements</TabsTrigger>}
        {canManageMembershipTypes && <TabsTrigger value="membership-types">{t('membershipTypes')}</TabsTrigger>}
        {canManageTandemRegistration && <TabsTrigger value="tandem-registration">{t('tandemRegistration')}</TabsTrigger>}
        {canManageAirportFees && <TabsTrigger value="airport-fees">{t('airportFees')}</TabsTrigger>}
        {canManageBoardContact && <TabsTrigger value="board-contact">Board Contact</TabsTrigger>}
      </TabsList>

      {canManageDocuments && (
        <TabsContent value="documents" className="space-y-4">
          <DocumentDefinitionsSection />
        </TabsContent>
      )}

      {canManageEndorsements && (
        <TabsContent value="endorsements" className="space-y-4">
          <EndorsementsSection />
        </TabsContent>
      )}

      {canManageMembershipTypes && (
        <TabsContent value="membership-types" className="space-y-4">
          <MembershipTypesSection />
        </TabsContent>
      )}

      {canManageTandemRegistration && (
        <TabsContent value="tandem-registration" className="space-y-4">
          <TandemRegistrationSection />
        </TabsContent>
      )}

      {canManageAirportFees && (
        <TabsContent value="airport-fees" className="space-y-4">
          <AirportFeesSection />
        </TabsContent>
      )}

      {canManageBoardContact && (
        <TabsContent value="board-contact" className="space-y-4">
          <BoardContactSection />
        </TabsContent>
      )}
    </Tabs>
  )
}
