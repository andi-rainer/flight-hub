import { Metadata } from 'next'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Store } from 'lucide-react'
import { VoucherTypesSection } from './components/voucher-types-section'
import { TicketTypesSection } from './components/ticket-types-section'
import { StoreSettingsSection } from './components/store-settings-section'
import { ContentManagementSection } from './components/content-management-section'

export const metadata: Metadata = {
  title: 'Store Management',
  description: 'Manage the online tandem store settings and content',
}

export default function StoreManagementPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Store className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Store Management</h1>
        </div>
        <p className="text-muted-foreground mt-2">
          Configure the online tandem store settings, voucher types, and customer-facing content
        </p>
      </div>

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="settings">Store Settings</TabsTrigger>
          <TabsTrigger value="vouchers">Voucher Types</TabsTrigger>
          <TabsTrigger value="tickets">Ticket Types</TabsTrigger>
          <TabsTrigger value="content">Content Management</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <StoreSettingsSection />
        </TabsContent>

        <TabsContent value="vouchers" className="space-y-4">
          <VoucherTypesSection />
        </TabsContent>

        <TabsContent value="tickets" className="space-y-4">
          <TicketTypesSection />
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <ContentManagementSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}
