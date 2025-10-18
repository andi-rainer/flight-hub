import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProfileSection } from './components/profile-section'
import { PilotDocumentsSection } from './components/pilot-documents-section'
import { DocumentTypesSection } from './components/document-types-section'
import type { User } from '@/lib/database.types'

async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}

export default async function SettingsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const isBoardMember = user.role?.includes('board') ?? false

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile, documents, and system configuration
        </p>
      </div>

      {/* Content */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="documents">My Documents</TabsTrigger>
          {isBoardMember && <TabsTrigger value="document-types">Document Settings</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <ProfileSection user={user} />
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <PilotDocumentsSection userId={user.id} />
        </TabsContent>

        {isBoardMember && (
          <TabsContent value="document-types" className="space-y-4">
            <DocumentTypesSection />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
