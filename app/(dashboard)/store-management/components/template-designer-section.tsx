'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Plus,
  Copy,
  Trash2,
  Edit,
  Image as ImageIcon,
  Power,
  PowerOff,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  getPDFTemplates,
  deletePDFTemplate,
  duplicatePDFTemplate,
  updatePDFTemplate
} from '@/lib/actions/pdf-templates'
import { getStoreContent, updateStoreContent, type StoreContent } from '@/lib/actions/store-content'
import { AssetLibraryBrowser } from './asset-library-browser'
import { PDFTemplate } from '@/lib/types'
import { CreateTemplateDialog } from './create-template-dialog'

export function TemplateDesignerSection() {
  const router = useRouter()
  const [templates, setTemplates] = useState<PDFTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [storeContent, setStoreContent] = useState<StoreContent | null>(null)
  const [isSavingGlobalSettings, setIsSavingGlobalSettings] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  useEffect(() => {
    loadTemplates()
    loadStoreContent()
  }, [])

  const loadTemplates = async () => {
    setIsLoading(true)
    const result = await getPDFTemplates()
    if (result.success && result.data) {
      setTemplates(result.data)
    } else {
      toast.error(result.error || 'Failed to load templates')
    }
    setIsLoading(false)
  }

  const loadStoreContent = async () => {
    const result = await getStoreContent()
    if (result.success && result.data) {
      setStoreContent(result.data)
    } else {
      toast.error(result.error || 'Failed to load store content')
    }
  }

  const handleSaveGlobalSettings = async () => {
    if (!storeContent) return

    setIsSavingGlobalSettings(true)
    const result = await updateStoreContent({
      pdf_contact_phone: storeContent.pdf_contact_phone,
      pdf_contact_phone_de: storeContent.pdf_contact_phone_de,
      pdf_contact_email: storeContent.pdf_contact_email,
      pdf_contact_email_de: storeContent.pdf_contact_email_de,
      pdf_contact_website: storeContent.pdf_contact_website,
      pdf_contact_website_de: storeContent.pdf_contact_website_de,
      pdf_contact_address: storeContent.pdf_contact_address,
      pdf_contact_address_de: storeContent.pdf_contact_address_de,
      pdf_label_voucher_code: storeContent.pdf_label_voucher_code,
      pdf_label_voucher_code_de: storeContent.pdf_label_voucher_code_de,
      pdf_label_booking_code: storeContent.pdf_label_booking_code,
      pdf_label_booking_code_de: storeContent.pdf_label_booking_code_de,
      pdf_label_valid_until: storeContent.pdf_label_valid_until,
      pdf_label_valid_until_de: storeContent.pdf_label_valid_until_de,
      pdf_label_redeem_instructions: storeContent.pdf_label_redeem_instructions,
      pdf_label_redeem_instructions_de: storeContent.pdf_label_redeem_instructions_de,
      pdf_label_terms: storeContent.pdf_label_terms,
      pdf_label_terms_de: storeContent.pdf_label_terms_de,
      pdf_label_personal_message: storeContent.pdf_label_personal_message,
      pdf_label_personal_message_de: storeContent.pdf_label_personal_message_de,
      pdf_label_from: storeContent.pdf_label_from,
      pdf_label_from_de: storeContent.pdf_label_from_de,
    })

    if (result.success) {
      toast.success('Global PDF settings saved successfully')
    } else {
      toast.error(result.error || 'Failed to save settings')
    }
    setIsSavingGlobalSettings(false)
  }

  const handleToggleActive = async (template: PDFTemplate) => {
    const result = await updatePDFTemplate(template.id, {
      active: !template.active
    })

    if (result.success) {
      toast.success(`Template ${template.active ? 'deactivated' : 'activated'}`)
      await loadTemplates()
    } else {
      toast.error(result.error || 'Failed to update template')
    }
  }

  const handleDuplicate = async (template: PDFTemplate) => {
    const result = await duplicatePDFTemplate(template.id)

    if (result.success) {
      toast.success('Template duplicated successfully')
      await loadTemplates()
    } else {
      toast.error(result.error || 'Failed to duplicate template')
    }
  }

  const handleDelete = async (template: PDFTemplate) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"?`)) {
      return
    }

    const result = await deletePDFTemplate(template.id)

    if (result.success) {
      toast.success('Template deleted successfully')
      await loadTemplates()
    } else {
      toast.error(result.error || 'Failed to delete template')
    }
  }

  const getTemplateTypeBadge = (templateType: string | null | undefined) => {
    const colors = {
      voucher: 'bg-purple-100 text-purple-700',
      ticket: 'bg-blue-100 text-blue-700',
    }

    const labels = {
      voucher: 'Voucher',
      ticket: 'Ticket',
    }

    const type = templateType || 'voucher'
    return (
      <Badge className={colors[type as keyof typeof colors] || colors.voucher}>
        {labels[type as keyof typeof labels] || type}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Loading templates...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="templates" className="w-full">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="global">Global Settings</TabsTrigger>
          <TabsTrigger value="assets">Asset Library</TabsTrigger>
        </TabsList>

        {/* TEMPLATES TAB */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>PDF Templates</CardTitle>
                  <CardDescription>
                    Design and manage voucher and ticket PDF templates
                  </CardDescription>
                </div>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <Card key={template.id} className="relative overflow-hidden">
                    {/* Status Indicator */}
                    <div className="absolute top-2 right-2 z-10">
                      {template.active ? (
                        <Badge className="bg-green-100 text-green-700">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>

                    {/* Preview Thumbnail */}
                    <div
                      className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 relative cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => router.push(`/store-management/templates/${template.id}/edit`)}
                    >
                      {template.background_image_url ? (
                        <img
                          src={template.background_image_url}
                          alt={template.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{
                            backgroundColor: template.layout_config?.backgroundColor || '#ffffff',
                            color: template.layout_config?.primaryColor || '#1f2937'
                          }}
                        >
                          <div className="text-center">
                            <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-30" />
                            <p className="text-sm font-medium opacity-50">Preview</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <CardContent className="pt-4 space-y-3">
                      <div>
                        <h3 className="font-medium">{template.name}</h3>
                      </div>

                      <div className="flex items-center gap-2">
                        {getTemplateTypeBadge(template.template_type)}
                      </div>

                      {template.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {template.description}
                        </p>
                      )}

                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1"
                          onClick={() => router.push(`/store-management/templates/${template.id}/edit`)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(template)}
                        >
                          {template.active ? (
                            <PowerOff className="h-3 w-3" />
                          ) : (
                            <Power className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDuplicate(template)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(template)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {templates.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground mb-4">No templates found</p>
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Template
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GLOBAL SETTINGS TAB */}
        <TabsContent value="global" className="space-y-4">
          {!storeContent ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">Loading settings...</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                  <CardDescription>Contact details shown on all PDFs (bilingual)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Phone (English)</Label>
                      <Input
                        value={storeContent.pdf_contact_phone || ''}
                        onChange={(e) => setStoreContent({ ...storeContent, pdf_contact_phone: e.target.value })}
                        placeholder="+43 123 456789"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone (German)</Label>
                      <Input
                        value={storeContent.pdf_contact_phone_de || ''}
                        onChange={(e) => setStoreContent({ ...storeContent, pdf_contact_phone_de: e.target.value })}
                        placeholder="+43 123 456789"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email (English)</Label>
                      <Input
                        type="email"
                        value={storeContent.pdf_contact_email || ''}
                        onChange={(e) => setStoreContent({ ...storeContent, pdf_contact_email: e.target.value })}
                        placeholder="info@skydive-salzburg.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email (German)</Label>
                      <Input
                        type="email"
                        value={storeContent.pdf_contact_email_de || ''}
                        onChange={(e) => setStoreContent({ ...storeContent, pdf_contact_email_de: e.target.value })}
                        placeholder="info@skydive-salzburg.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Website (English)</Label>
                      <Input
                        value={storeContent.pdf_contact_website || ''}
                        onChange={(e) => setStoreContent({ ...storeContent, pdf_contact_website: e.target.value })}
                        placeholder="www.skydive-salzburg.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Website (German)</Label>
                      <Input
                        value={storeContent.pdf_contact_website_de || ''}
                        onChange={(e) => setStoreContent({ ...storeContent, pdf_contact_website_de: e.target.value })}
                        placeholder="www.skydive-salzburg.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Address (English)</Label>
                      <Textarea
                        value={storeContent.pdf_contact_address || ''}
                        onChange={(e) => setStoreContent({ ...storeContent, pdf_contact_address: e.target.value })}
                        placeholder="123 Dropzone Road, Salzburg, Austria"
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Address (German)</Label>
                      <Textarea
                        value={storeContent.pdf_contact_address_de || ''}
                        onChange={(e) => setStoreContent({ ...storeContent, pdf_contact_address_de: e.target.value })}
                        placeholder="Dropzone Straße 123, Salzburg, Österreich"
                        rows={3}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>PDF Labels</CardTitle>
                  <CardDescription>Customize text labels appearing on all PDF vouchers and tickets</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Voucher Code Label (English)</Label>
                      <Input
                        value={storeContent.pdf_label_voucher_code || ''}
                        onChange={(e) => setStoreContent({ ...storeContent, pdf_label_voucher_code: e.target.value })}
                        placeholder="Voucher Code"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Voucher Code Label (German)</Label>
                      <Input
                        value={storeContent.pdf_label_voucher_code_de || ''}
                        onChange={(e) => setStoreContent({ ...storeContent, pdf_label_voucher_code_de: e.target.value })}
                        placeholder="Gutschein-Code"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Booking Code Label (English)</Label>
                      <Input
                        value={storeContent.pdf_label_booking_code || ''}
                        onChange={(e) => setStoreContent({ ...storeContent, pdf_label_booking_code: e.target.value })}
                        placeholder="Booking Code"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Booking Code Label (German)</Label>
                      <Input
                        value={storeContent.pdf_label_booking_code_de || ''}
                        onChange={(e) => setStoreContent({ ...storeContent, pdf_label_booking_code_de: e.target.value })}
                        placeholder="Buchungscode"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Valid Until Label (English)</Label>
                      <Input
                        value={storeContent.pdf_label_valid_until || ''}
                        onChange={(e) => setStoreContent({ ...storeContent, pdf_label_valid_until: e.target.value })}
                        placeholder="Valid Until"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Valid Until Label (German)</Label>
                      <Input
                        value={storeContent.pdf_label_valid_until_de || ''}
                        onChange={(e) => setStoreContent({ ...storeContent, pdf_label_valid_until_de: e.target.value })}
                        placeholder="Gültig bis"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Redeem Instructions (English)</Label>
                      <Textarea
                        value={storeContent.pdf_label_redeem_instructions || ''}
                        onChange={(e) => setStoreContent({ ...storeContent, pdf_label_redeem_instructions: e.target.value })}
                        placeholder="Scan QR code or visit our website to redeem"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Redeem Instructions (German)</Label>
                      <Textarea
                        value={storeContent.pdf_label_redeem_instructions_de || ''}
                        onChange={(e) => setStoreContent({ ...storeContent, pdf_label_redeem_instructions_de: e.target.value })}
                        placeholder="QR-Code scannen oder Website besuchen zum Einlösen"
                        rows={2}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Terms Text (English)</Label>
                      <Textarea
                        value={storeContent.pdf_label_terms || ''}
                        onChange={(e) => setStoreContent({ ...storeContent, pdf_label_terms: e.target.value })}
                        placeholder="Terms & Conditions apply. See website for details."
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Terms Text (German)</Label>
                      <Textarea
                        value={storeContent.pdf_label_terms_de || ''}
                        onChange={(e) => setStoreContent({ ...storeContent, pdf_label_terms_de: e.target.value })}
                        placeholder="Es gelten die AGB. Details auf der Website."
                        rows={2}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Personal Message Label (English)</Label>
                      <Input
                        value={storeContent.pdf_label_personal_message || ''}
                        onChange={(e) => setStoreContent({ ...storeContent, pdf_label_personal_message: e.target.value })}
                        placeholder="Personal Message"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Personal Message Label (German)</Label>
                      <Input
                        value={storeContent.pdf_label_personal_message_de || ''}
                        onChange={(e) => setStoreContent({ ...storeContent, pdf_label_personal_message_de: e.target.value })}
                        placeholder="Persönliche Nachricht"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>From Label (English)</Label>
                      <Input
                        value={storeContent.pdf_label_from || ''}
                        onChange={(e) => setStoreContent({ ...storeContent, pdf_label_from: e.target.value })}
                        placeholder="From"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>From Label (German)</Label>
                      <Input
                        value={storeContent.pdf_label_from_de || ''}
                        onChange={(e) => setStoreContent({ ...storeContent, pdf_label_from_de: e.target.value })}
                        placeholder="Von"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-4">
                  <div className="flex justify-end">
                    <Button onClick={handleSaveGlobalSettings} disabled={isSavingGlobalSettings}>
                      {isSavingGlobalSettings ? 'Saving...' : 'Save Global Settings'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ASSET LIBRARY TAB */}
        <TabsContent value="assets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asset Library</CardTitle>
              <CardDescription>
                Manage background images, decorative elements, and logos for your PDF templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AssetLibraryBrowser />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateTemplateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  )
}
