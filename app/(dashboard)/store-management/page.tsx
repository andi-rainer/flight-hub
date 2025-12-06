'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Store } from 'lucide-react'
import { VoucherTypesSection } from './components/voucher-types-section'
import { TicketTypesSection } from './components/ticket-types-section'
import { StoreSettingsSection } from './components/store-settings-section'
import { ContentManagementSection } from './components/content-management-section'
import { TemplateDesignerSection } from './components/template-designer-section'

export default function StoreManagementPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || 'settings'

  const handleTabChange = (value: string) => {
    router.push(`/store-management?tab=${value}`)
  }

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

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="settings">Store Settings</TabsTrigger>
          <TabsTrigger value="vouchers">Voucher Types</TabsTrigger>
          <TabsTrigger value="tickets">Ticket Types</TabsTrigger>
          <TabsTrigger value="content">Content Management</TabsTrigger>
          <TabsTrigger value="templates">PDF Templates</TabsTrigger>
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

        <TabsContent value="templates" className="space-y-4">
          <TemplateDesignerSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}
