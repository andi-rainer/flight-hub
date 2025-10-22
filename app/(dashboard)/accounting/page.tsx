import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Shield } from 'lucide-react'
import { UserAccountsTab } from './components/user-accounts-tab'
import { CostCentersAccountingTab } from './components/cost-centers-accounting-tab'
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

export default async function AccountingPage() {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    redirect('/login')
  }

  const isBoardMember = currentUser.role?.includes('board') ?? false

  if (!isBoardMember) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Accounting</h1>
          <p className="text-muted-foreground">Manage user accounts and cost center transactions</p>
        </div>
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertTitle>Board Members Only</AlertTitle>
          <AlertDescription>
            You do not have permission to access this page. Only board members can manage accounting.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Accounting</h1>
        <p className="text-muted-foreground">Manage user accounts and cost center transactions</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="user-accounts" className="space-y-6">
        <TabsList>
          <TabsTrigger value="user-accounts">User Accounts</TabsTrigger>
          <TabsTrigger value="cost-centers">Cost Centers</TabsTrigger>
        </TabsList>

        <TabsContent value="user-accounts" className="space-y-4">
          <UserAccountsTab />
        </TabsContent>

        <TabsContent value="cost-centers" className="space-y-4">
          <CostCentersAccountingTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
