import { getUserProfile } from '@/lib/supabase/server'
import { redirect } from '@/navigation'
import { hasPermission } from '@/lib/permissions'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserAccountsTab } from './components/user-accounts-tab'
import { CostCentersAccountingTab } from './components/cost-centers-accounting-tab'

export default async function AccountingPage() {
  const currentUser = await getUserProfile()

  if (!currentUser) {
    redirect('/login')
  }

  // Check permission to view all billing/accounting
  if (!hasPermission(currentUser, 'billing.view.all')) {
    redirect('/dashboard?error=unauthorized')
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
