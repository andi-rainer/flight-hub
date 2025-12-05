'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Plus, Trash2, FileText, X } from 'lucide-react'
import { toast } from 'sonner'
import { getStoreContent, updateStoreContent, uploadTermsPDF, deleteTermsPDF, type StoreContent } from '@/lib/actions/store-content'

interface Feature {
  text: string
  text_de: string
}

export function ContentManagementSection() {
  const [content, setContent] = useState<StoreContent | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingTerms, setIsUploadingTerms] = useState<'en' | 'de' | null>(null)

  useEffect(() => {
    loadContent()
  }, [])

  const loadContent = async () => {
    setIsLoading(true)
    const result = await getStoreContent()
    if (result.success && result.data) {
      setContent({
        ...result.data,
        home_title: result.data.home_title ?? '',
        home_title_de: result.data.home_title_de ?? '',
        home_subtitle: result.data.home_subtitle ?? '',
        home_subtitle_de: result.data.home_subtitle_de ?? '',
        home_footer: result.data.home_footer ?? '',
        home_footer_de: result.data.home_footer_de ?? '',
        voucher_card_title: result.data.voucher_card_title ?? '',
        voucher_card_title_de: result.data.voucher_card_title_de ?? '',
        voucher_card_subtitle: result.data.voucher_card_subtitle ?? '',
        voucher_card_subtitle_de: result.data.voucher_card_subtitle_de ?? '',
        voucher_card_description: result.data.voucher_card_description ?? '',
        voucher_card_description_de: result.data.voucher_card_description_de ?? '',
        booking_card_title: result.data.booking_card_title ?? '',
        booking_card_title_de: result.data.booking_card_title_de ?? '',
        booking_card_subtitle: result.data.booking_card_subtitle ?? '',
        booking_card_subtitle_de: result.data.booking_card_subtitle_de ?? '',
        booking_card_description: result.data.booking_card_description ?? '',
        booking_card_description_de: result.data.booking_card_description_de ?? '',
        redeem_card_title: result.data.redeem_card_title ?? '',
        redeem_card_title_de: result.data.redeem_card_title_de ?? '',
        redeem_card_subtitle: result.data.redeem_card_subtitle ?? '',
        redeem_card_subtitle_de: result.data.redeem_card_subtitle_de ?? '',
        redeem_card_description: result.data.redeem_card_description ?? '',
        redeem_card_description_de: result.data.redeem_card_description_de ?? '',
        vouchers_page_title: result.data.vouchers_page_title ?? '',
        vouchers_page_title_de: result.data.vouchers_page_title_de ?? '',
        vouchers_page_subtitle: result.data.vouchers_page_subtitle ?? '',
        vouchers_page_subtitle_de: result.data.vouchers_page_subtitle_de ?? '',
        voucher_info_title: result.data.voucher_info_title ?? '',
        voucher_info_title_de: result.data.voucher_info_title_de ?? '',
        voucher_info_section1_title: result.data.voucher_info_section1_title ?? '',
        voucher_info_section1_title_de: result.data.voucher_info_section1_title_de ?? '',
        voucher_info_section2_title: result.data.voucher_info_section2_title ?? '',
        voucher_info_section2_title_de: result.data.voucher_info_section2_title_de ?? '',
        bookings_page_title: result.data.bookings_page_title ?? '',
        bookings_page_title_de: result.data.bookings_page_title_de ?? '',
        bookings_page_subtitle: result.data.bookings_page_subtitle ?? '',
        bookings_page_subtitle_de: result.data.bookings_page_subtitle_de ?? '',
        bookings_card_header: result.data.bookings_card_header ?? '',
        bookings_card_header_de: result.data.bookings_card_header_de ?? '',
        bookings_info_title: result.data.bookings_info_title ?? '',
        bookings_info_title_de: result.data.bookings_info_title_de ?? '',
        bookings_info_section1_title: result.data.bookings_info_section1_title ?? '',
        bookings_info_section1_title_de: result.data.bookings_info_section1_title_de ?? '',
        bookings_info_section2_title: result.data.bookings_info_section2_title ?? '',
        bookings_info_section2_title_de: result.data.bookings_info_section2_title_de ?? '',
        // Success page fields
        success_payment_title: result.data.success_payment_title ?? '',
        success_payment_title_de: result.data.success_payment_title_de ?? '',
        success_payment_description: result.data.success_payment_description ?? '',
        success_payment_description_de: result.data.success_payment_description_de ?? '',
        success_payment_check_email: result.data.success_payment_check_email ?? '',
        success_payment_check_email_de: result.data.success_payment_check_email_de ?? '',
        success_payment_email_message: result.data.success_payment_email_message ?? '',
        success_payment_email_message_de: result.data.success_payment_email_message_de ?? '',
        success_reservation_title: result.data.success_reservation_title ?? '',
        success_reservation_title_de: result.data.success_reservation_title_de ?? '',
        success_reservation_description: result.data.success_reservation_description ?? '',
        success_reservation_description_de: result.data.success_reservation_description_de ?? '',
        success_reservation_booking_confirmed: result.data.success_reservation_booking_confirmed ?? '',
        success_reservation_booking_confirmed_de: result.data.success_reservation_booking_confirmed_de ?? '',
        success_reservation_voucher_used: result.data.success_reservation_voucher_used ?? '',
        success_reservation_voucher_used_de: result.data.success_reservation_voucher_used_de ?? '',
        success_reservation_scheduled_for: result.data.success_reservation_scheduled_for ?? '',
        success_reservation_scheduled_for_de: result.data.success_reservation_scheduled_for_de ?? '',
        success_reservation_check_email: result.data.success_reservation_check_email ?? '',
        success_reservation_check_email_de: result.data.success_reservation_check_email_de ?? '',
        success_reservation_email_message: result.data.success_reservation_email_message ?? '',
        success_reservation_email_message_de: result.data.success_reservation_email_message_de ?? '',
        success_whats_next_title: result.data.success_whats_next_title ?? '',
        success_whats_next_title_de: result.data.success_whats_next_title_de ?? '',
        success_help_title: result.data.success_help_title ?? '',
        success_help_title_de: result.data.success_help_title_de ?? '',
        success_help_message: result.data.success_help_message ?? '',
        success_help_message_de: result.data.success_help_message_de ?? '',
        success_contact_email: result.data.success_contact_email ?? '',
        success_back_to_home_button: result.data.success_back_to_home_button ?? '',
        success_back_to_home_button_de: result.data.success_back_to_home_button_de ?? '',
        success_purchase_another_button: result.data.success_purchase_another_button ?? '',
        success_purchase_another_button_de: result.data.success_purchase_another_button_de ?? '',
        success_voucher_code_label: result.data.success_voucher_code_label ?? '',
        success_voucher_code_label_de: result.data.success_voucher_code_label_de ?? '',
        success_booking_code_label: result.data.success_booking_code_label ?? '',
        success_booking_code_label_de: result.data.success_booking_code_label_de ?? '',
        success_download_pdf_button: result.data.success_download_pdf_button ?? '',
        success_download_pdf_button_de: result.data.success_download_pdf_button_de ?? '',
        terms_url: result.data.terms_url ?? '',
        terms_url_de: result.data.terms_url_de ?? '',
        // PDF Configuration
        pdf_voucher_description: result.data.pdf_voucher_description ?? '',
        pdf_voucher_description_de: result.data.pdf_voucher_description_de ?? '',
      })
    } else {
      toast.error('Failed to load store content')
    }
    setIsLoading(false)
  }

  const handleSave = async () => {
    if (!content) return

    setIsSaving(true)
    const result = await updateStoreContent(content)
    setIsSaving(false)

    if (result.success) {
      toast.success('Store content updated successfully')
      loadContent()
    } else {
      toast.error(result.error || 'Failed to update store content')
    }
  }

  const addFeature = (section: string) => {
    if (!content) return
    const newFeature: Feature = { text: '', text_de: '' }
    const key = `${section}_features` as keyof StoreContent
    const features = (content[key] as Feature[]) || []
    setContent({ ...content, [key]: [...features, newFeature] })
  }

  const removeFeature = (section: string, index: number) => {
    if (!content) return
    const key = `${section}_features` as keyof StoreContent
    const features = (content[key] as Feature[]) || []
    setContent({ ...content, [key]: features.filter((_, i) => i !== index) })
  }

  const updateFeature = (section: string, index: number, field: 'text' | 'text_de', value: string) => {
    if (!content) return
    const key = `${section}_features` as keyof StoreContent
    const features = [...((content[key] as Feature[]) || [])]
    features[index] = { ...features[index], [field]: value }
    setContent({ ...content, [key]: features })
  }

  const handleTermsUpload = async (event: React.ChangeEvent<HTMLInputElement>, language: 'en' | 'de') => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed')
      return
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error('File size must be less than 10MB')
      return
    }

    setIsUploadingTerms(language)

    try {
      const result = await uploadTermsPDF(file, language)

      if (result.success && result.url) {
        toast.success(`Terms & Conditions (${language.toUpperCase()}) uploaded successfully`)
        // Reload content to get updated URL
        await loadContent()
      } else {
        toast.error(result.error || 'Failed to upload PDF')
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload PDF')
    } finally {
      setIsUploadingTerms(null)
      // Reset file input
      event.target.value = ''
    }
  }

  const handleTermsDelete = async (language: 'en' | 'de') => {
    if (!confirm(`Are you sure you want to delete the ${language.toUpperCase()} Terms & Conditions PDF?`)) {
      return
    }

    setIsUploadingTerms(language)

    try {
      const result = await deleteTermsPDF(language)

      if (result.success) {
        toast.success(`Terms & Conditions (${language.toUpperCase()}) deleted successfully`)
        // Reload content to get updated state
        await loadContent()
      } else {
        toast.error(result.error || 'Failed to delete PDF')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete PDF')
    } finally {
      setIsUploadingTerms(null)
    }
  }

  const renderFeatureList = (section: string, title: string) => {
    if (!content) return null
    const key = `${section}_features` as keyof StoreContent
    const features = (content[key] as Feature[]) || []

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>{title}</Label>
          <Button type="button" variant="outline" size="sm" onClick={() => addFeature(section)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Feature
          </Button>
        </div>
        {features.map((feature, index) => (
          <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <Input
              placeholder="English text"
              value={feature.text}
              onChange={(e) => updateFeature(section, index, 'text', e.target.value)}
            />
            <Input
              placeholder="German text"
              value={feature.text_de}
              onChange={(e) => updateFeature(section, index, 'text_de', e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeFeature(section, index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {features.length === 0 && (
          <p className="text-sm text-muted-foreground">No features added yet</p>
        )}
      </div>
    )
  }

  const renderStepsList = (fieldName: string, title: string) => {
    if (!content) return null
    const key = fieldName as keyof StoreContent
    const steps = (content[key] as Feature[]) || []

    const addStep = (field: string) => {
      const key = field as keyof StoreContent
      const currentSteps = (content[key] as Feature[]) || []
      setContent({
        ...content,
        [field]: [...currentSteps, { text: '', text_de: '' }]
      })
    }

    const updateStep = (field: string, index: number, lang: 'text' | 'text_de', value: string) => {
      const key = field as keyof StoreContent
      const currentSteps = [...(content[key] as Feature[])]
      currentSteps[index] = { ...currentSteps[index], [lang]: value }
      setContent({ ...content, [field]: currentSteps })
    }

    const removeStep = (field: string, index: number) => {
      const key = field as keyof StoreContent
      const currentSteps = (content[key] as Feature[]).filter((_, i) => i !== index)
      setContent({ ...content, [field]: currentSteps })
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>{title}</Label>
          <Button type="button" variant="outline" size="sm" onClick={() => addStep(fieldName)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Step
          </Button>
        </div>
        {steps.map((step, index) => (
          <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <Input
              placeholder="English text"
              value={step.text}
              onChange={(e) => updateStep(fieldName, index, 'text', e.target.value)}
            />
            <Input
              placeholder="German text"
              value={step.text_de}
              onChange={(e) => updateStep(fieldName, index, 'text_de', e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeStep(fieldName, index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {steps.length === 0 && (
          <p className="text-sm text-muted-foreground">No steps added yet</p>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  if (!content) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Failed to load content</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="home" className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="home">Home</TabsTrigger>
          <TabsTrigger value="voucher-cards">Voucher Cards</TabsTrigger>
          <TabsTrigger value="booking-cards">Booking Cards</TabsTrigger>
          <TabsTrigger value="redeem-cards">Redeem Cards</TabsTrigger>
          <TabsTrigger value="vouchers-page">Vouchers Page</TabsTrigger>
          <TabsTrigger value="bookings-page">Bookings Page</TabsTrigger>
          <TabsTrigger value="success-page">Success Page</TabsTrigger>
          <TabsTrigger value="pdf-config">PDF Config</TabsTrigger>
        </TabsList>

        {/* HOME PAGE TAB */}
        <TabsContent value="home" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Home Page Content</CardTitle>
              <CardDescription>Main heading, subtitle, and footer for the store homepage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title (English)</Label>
                  <Input
                    value={content.home_title}
                    onChange={(e) => setContent({ ...content, home_title: e.target.value })}
                    placeholder="Tandem Skydive Experience"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Title (German)</Label>
                  <Input
                    value={content.home_title_de}
                    onChange={(e) => setContent({ ...content, home_title_de: e.target.value })}
                    placeholder="Tandem Fallschirmsprung Erlebnis"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Subtitle (English)</Label>
                  <Textarea
                    value={content.home_subtitle}
                    onChange={(e) => setContent({ ...content, home_subtitle: e.target.value })}
                    placeholder="Experience the thrill of freefall..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subtitle (German)</Label>
                  <Textarea
                    value={content.home_subtitle_de}
                    onChange={(e) => setContent({ ...content, home_subtitle_de: e.target.value })}
                    placeholder="Erlebe den Nervenkitzel..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Footer (English)</Label>
                  <Input
                    value={content.home_footer}
                    onChange={(e) => setContent({ ...content, home_footer: e.target.value })}
                    placeholder="All prices include VAT..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Footer (German)</Label>
                  <Input
                    value={content.home_footer_de}
                    onChange={(e) => setContent({ ...content, home_footer_de: e.target.value })}
                    placeholder="Alle Preise inkl. MwSt..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Terms & Conditions Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Terms & Conditions</CardTitle>
              <CardDescription>
                Upload PDF documents that customers must accept before purchasing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* English Terms */}
              <div className="space-y-3">
                <Label>Terms & Conditions (English)</Label>
                {content.terms_url ? (
                  <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">Terms & Conditions (EN)</p>
                      <a
                        href={content.terms_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline truncate block"
                      >
                        {content.terms_url}
                      </a>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleTermsDelete('en')}
                      disabled={isUploadingTerms === 'en'}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => handleTermsUpload(e, 'en')}
                      disabled={isUploadingTerms === 'en'}
                      className="flex-1"
                    />
                    {isUploadingTerms === 'en' && (
                      <div className="text-sm text-muted-foreground">Uploading...</div>
                    )}
                  </div>
                )}
              </div>

              {/* German Terms */}
              <div className="space-y-3">
                <Label>Terms & Conditions (German)</Label>
                {content.terms_url_de ? (
                  <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">Terms & Conditions (DE)</p>
                      <a
                        href={content.terms_url_de}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline truncate block"
                      >
                        {content.terms_url_de}
                      </a>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleTermsDelete('de')}
                      disabled={isUploadingTerms === 'de'}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => handleTermsUpload(e, 'de')}
                      disabled={isUploadingTerms === 'de'}
                      className="flex-1"
                    />
                    {isUploadingTerms === 'de' && (
                      <div className="text-sm text-muted-foreground">Uploading...</div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Show Terms on Checkout Toggle */}
          <Card>
            <CardHeader>
              <CardTitle>Checkout Settings</CardTitle>
              <CardDescription>
                Configure checkout behavior
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Switch
                  checked={content.show_terms_on_checkout}
                  onCheckedChange={(checked) => setContent({ ...content, show_terms_on_checkout: checked })}
                />
                <Label>Show terms on checkout</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* VOUCHER CARDS TAB */}
        <TabsContent value="voucher-cards" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Voucher Card Content (Home Page)</CardTitle>
              <CardDescription>Content for the voucher card on the homepage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Card Title (English)</Label>
                  <Input
                    value={content.voucher_card_title}
                    onChange={(e) => setContent({ ...content, voucher_card_title: e.target.value })}
                    placeholder="Buy a Voucher"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Card Title (German)</Label>
                  <Input
                    value={content.voucher_card_title_de}
                    onChange={(e) => setContent({ ...content, voucher_card_title_de: e.target.value })}
                    placeholder="Gutschein kaufen"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Card Subtitle (English)</Label>
                  <Input
                    value={content.voucher_card_subtitle}
                    onChange={(e) => setContent({ ...content, voucher_card_subtitle: e.target.value })}
                    placeholder="Perfect gift for adventurers"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Card Subtitle (German)</Label>
                  <Input
                    value={content.voucher_card_subtitle_de}
                    onChange={(e) => setContent({ ...content, voucher_card_subtitle_de: e.target.value })}
                    placeholder="Perfektes Geschenk für Abenteurer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Card Description (English)</Label>
                  <Textarea
                    value={content.voucher_card_description}
                    onChange={(e) => setContent({ ...content, voucher_card_description: e.target.value })}
                    placeholder="Gift the ultimate experience..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Card Description (German)</Label>
                  <Textarea
                    value={content.voucher_card_description_de}
                    onChange={(e) => setContent({ ...content, voucher_card_description_de: e.target.value })}
                    placeholder="Verschenke das ultimative Erlebnis..."
                    rows={3}
                  />
                </div>
              </div>

              {renderFeatureList('voucher_card', 'Card Features')}
            </CardContent>
          </Card>
        </TabsContent>

        {/* BOOKING CARDS TAB */}
        <TabsContent value="booking-cards" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Booking Card Content (Home Page)</CardTitle>
              <CardDescription>Content for the booking card on the homepage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Card Title (English)</Label>
                  <Input
                    value={content.booking_card_title}
                    onChange={(e) => setContent({ ...content, booking_card_title: e.target.value })}
                    placeholder="Book a Jump"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Card Title (German)</Label>
                  <Input
                    value={content.booking_card_title_de}
                    onChange={(e) => setContent({ ...content, booking_card_title_de: e.target.value })}
                    placeholder="Sprung buchen"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Card Subtitle (English)</Label>
                  <Input
                    value={content.booking_card_subtitle}
                    onChange={(e) => setContent({ ...content, booking_card_subtitle: e.target.value })}
                    placeholder="Schedule your jump now"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Card Subtitle (German)</Label>
                  <Input
                    value={content.booking_card_subtitle_de}
                    onChange={(e) => setContent({ ...content, booking_card_subtitle_de: e.target.value })}
                    placeholder="Jetzt Sprung planen"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Card Description (English)</Label>
                  <Textarea
                    value={content.booking_card_description}
                    onChange={(e) => setContent({ ...content, booking_card_description: e.target.value })}
                    placeholder="Choose your date and time..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Card Description (German)</Label>
                  <Textarea
                    value={content.booking_card_description_de}
                    onChange={(e) => setContent({ ...content, booking_card_description_de: e.target.value })}
                    placeholder="Wähle dein Datum und Uhrzeit..."
                    rows={3}
                  />
                </div>
              </div>

              {renderFeatureList('booking_card', 'Card Features')}
            </CardContent>
          </Card>
        </TabsContent>

        {/* REDEEM CARDS TAB */}
        <TabsContent value="redeem-cards" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Redeem Card Content (Home Page)</CardTitle>
              <CardDescription>Content for the redeem voucher card on the homepage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Card Title (English)</Label>
                  <Input
                    value={content.redeem_card_title}
                    onChange={(e) => setContent({ ...content, redeem_card_title: e.target.value })}
                    placeholder="Redeem Voucher"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Card Title (German)</Label>
                  <Input
                    value={content.redeem_card_title_de}
                    onChange={(e) => setContent({ ...content, redeem_card_title_de: e.target.value })}
                    placeholder="Gutschein einlösen"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Card Subtitle (English)</Label>
                  <Input
                    value={content.redeem_card_subtitle}
                    onChange={(e) => setContent({ ...content, redeem_card_subtitle: e.target.value })}
                    placeholder="Already have a voucher?"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Card Subtitle (German)</Label>
                  <Input
                    value={content.redeem_card_subtitle_de}
                    onChange={(e) => setContent({ ...content, redeem_card_subtitle_de: e.target.value })}
                    placeholder="Haben Sie bereits einen Gutschein?"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Card Description (English)</Label>
                  <Textarea
                    value={content.redeem_card_description}
                    onChange={(e) => setContent({ ...content, redeem_card_description: e.target.value })}
                    placeholder="Book your jump date here..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Card Description (German)</Label>
                  <Textarea
                    value={content.redeem_card_description_de}
                    onChange={(e) => setContent({ ...content, redeem_card_description_de: e.target.value })}
                    placeholder="Buchen Sie hier Ihr Sprungdatum..."
                    rows={3}
                  />
                </div>
              </div>

              {renderFeatureList('redeem_card', 'Card Features')}
            </CardContent>
          </Card>
        </TabsContent>

        {/* VOUCHERS PAGE TAB */}
        <TabsContent value="vouchers-page" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vouchers Page Header</CardTitle>
              <CardDescription>Page title and subtitle</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Page Title (English)</Label>
                  <Input
                    value={content.vouchers_page_title}
                    onChange={(e) => setContent({ ...content, vouchers_page_title: e.target.value })}
                    placeholder="Gift Vouchers"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Page Title (German)</Label>
                  <Input
                    value={content.vouchers_page_title_de}
                    onChange={(e) => setContent({ ...content, vouchers_page_title_de: e.target.value })}
                    placeholder="Geschenkgutscheine"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Page Subtitle (English)</Label>
                  <Textarea
                    value={content.vouchers_page_subtitle}
                    onChange={(e) => setContent({ ...content, vouchers_page_subtitle: e.target.value })}
                    placeholder="The perfect gift..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Page Subtitle (German)</Label>
                  <Textarea
                    value={content.vouchers_page_subtitle_de}
                    onChange={(e) => setContent({ ...content, vouchers_page_subtitle_de: e.target.value })}
                    placeholder="Das perfekte Geschenk..."
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Voucher Info Section</CardTitle>
              <CardDescription>Information displayed below voucher cards</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Section Title (English)</Label>
                  <Input
                    value={content.voucher_info_title}
                    onChange={(e) => setContent({ ...content, voucher_info_title: e.target.value })}
                    placeholder="What's Included?"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Section Title (German)</Label>
                  <Input
                    value={content.voucher_info_title_de}
                    onChange={(e) => setContent({ ...content, voucher_info_title_de: e.target.value })}
                    placeholder="Was ist enthalten?"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-4">Section 1</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label>Section 1 Title (English)</Label>
                    <Input
                      value={content.voucher_info_section1_title}
                      onChange={(e) => setContent({ ...content, voucher_info_section1_title: e.target.value })}
                      placeholder="Digital Voucher"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Section 1 Title (German)</Label>
                    <Input
                      value={content.voucher_info_section1_title_de}
                      onChange={(e) => setContent({ ...content, voucher_info_section1_title_de: e.target.value })}
                      placeholder="Digitaler Gutschein"
                    />
                  </div>
                </div>
                {renderFeatureList('voucher_info_section1', 'Section 1 Features')}
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-4">Section 2</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label>Section 2 Title (English)</Label>
                    <Input
                      value={content.voucher_info_section2_title}
                      onChange={(e) => setContent({ ...content, voucher_info_section2_title: e.target.value })}
                      placeholder="The Experience"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Section 2 Title (German)</Label>
                    <Input
                      value={content.voucher_info_section2_title_de}
                      onChange={(e) => setContent({ ...content, voucher_info_section2_title_de: e.target.value })}
                      placeholder="Das Erlebnis"
                    />
                  </div>
                </div>
                {renderFeatureList('voucher_info_section2', 'Section 2 Features')}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BOOKINGS PAGE TAB */}
        <TabsContent value="bookings-page" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bookings Page Header</CardTitle>
              <CardDescription>Page title and subtitle</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Page Title (English)</Label>
                  <Input
                    value={content.bookings_page_title}
                    onChange={(e) => setContent({ ...content, bookings_page_title: e.target.value })}
                    placeholder="Book Your Experience"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Page Title (German)</Label>
                  <Input
                    value={content.bookings_page_title_de}
                    onChange={(e) => setContent({ ...content, bookings_page_title_de: e.target.value })}
                    placeholder="Buche dein Erlebnis"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Page Subtitle (English)</Label>
                  <Textarea
                    value={content.bookings_page_subtitle}
                    onChange={(e) => setContent({ ...content, bookings_page_subtitle: e.target.value })}
                    placeholder="Choose your preferred date and time"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Page Subtitle (German)</Label>
                  <Textarea
                    value={content.bookings_page_subtitle_de}
                    onChange={(e) => setContent({ ...content, bookings_page_subtitle_de: e.target.value })}
                    placeholder="Wähle dein bevorzugtes Datum und Uhrzeit"
                    rows={3}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Booking Card Header (English)</Label>
                  <Input
                    value={content.bookings_card_header}
                    onChange={(e) => setContent({ ...content, bookings_card_header: e.target.value })}
                    placeholder="Tandem Skydive Experience"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Booking Card Header (German)</Label>
                  <Input
                    value={content.bookings_card_header_de}
                    onChange={(e) => setContent({ ...content, bookings_card_header_de: e.target.value })}
                    placeholder="Tandem Fallschirmsprung Erlebnis"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Booking Info Section</CardTitle>
              <CardDescription>Information displayed below booking cards</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Section Title (English)</Label>
                  <Input
                    value={content.bookings_info_title}
                    onChange={(e) => setContent({ ...content, bookings_info_title: e.target.value })}
                    placeholder="Booking Information"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Section Title (German)</Label>
                  <Input
                    value={content.bookings_info_title_de}
                    onChange={(e) => setContent({ ...content, bookings_info_title_de: e.target.value })}
                    placeholder="Buchungsinformationen"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-4">Section 1</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label>Section 1 Title (English)</Label>
                    <Input
                      value={content.bookings_info_section1_title}
                      onChange={(e) => setContent({ ...content, bookings_info_section1_title: e.target.value })}
                      placeholder="What to Expect"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Section 1 Title (German)</Label>
                    <Input
                      value={content.bookings_info_section1_title_de}
                      onChange={(e) => setContent({ ...content, bookings_info_section1_title_de: e.target.value })}
                      placeholder="Was dich erwartet"
                    />
                  </div>
                </div>
                {renderFeatureList('bookings_info_section1', 'Section 1 Features')}
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-4">Section 2</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label>Section 2 Title (English)</Label>
                    <Input
                      value={content.bookings_info_section2_title}
                      onChange={(e) => setContent({ ...content, bookings_info_section2_title: e.target.value })}
                      placeholder="Important Notes"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Section 2 Title (German)</Label>
                    <Input
                      value={content.bookings_info_section2_title_de}
                      onChange={(e) => setContent({ ...content, bookings_info_section2_title_de: e.target.value })}
                      placeholder="Wichtige Hinweise"
                    />
                  </div>
                </div>
                {renderFeatureList('bookings_info_section2', 'Section 2 Features')}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SUCCESS PAGE TAB */}
        <TabsContent value="success-page" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Success Page - Payment Success</CardTitle>
              <CardDescription>
                Configure content for successful voucher/booking purchases
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title (English)</Label>
                  <Input
                    value={content.success_payment_title}
                    onChange={(e) => setContent({ ...content, success_payment_title: e.target.value })}
                    placeholder="Payment Successful!"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Title (German)</Label>
                  <Input
                    value={content.success_payment_title_de}
                    onChange={(e) => setContent({ ...content, success_payment_title_de: e.target.value })}
                    placeholder="Zahlung Erfolgreich!"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Description (English)</Label>
                  <Textarea
                    value={content.success_payment_description}
                    onChange={(e) => setContent({ ...content, success_payment_description: e.target.value })}
                    placeholder="Your payment has been processed successfully."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (German)</Label>
                  <Textarea
                    value={content.success_payment_description_de}
                    onChange={(e) => setContent({ ...content, success_payment_description_de: e.target.value })}
                    placeholder="Ihre Zahlung wurde erfolgreich verarbeitet."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Check Email Title (English)</Label>
                  <Input
                    value={content.success_payment_check_email}
                    onChange={(e) => setContent({ ...content, success_payment_check_email: e.target.value })}
                    placeholder="Check Your Email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Check Email Title (German)</Label>
                  <Input
                    value={content.success_payment_check_email_de}
                    onChange={(e) => setContent({ ...content, success_payment_check_email_de: e.target.value })}
                    placeholder="Überprüfen Sie Ihre E-Mail"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email Message (English)</Label>
                  <Textarea
                    value={content.success_payment_email_message}
                    onChange={(e) => setContent({ ...content, success_payment_email_message: e.target.value })}
                    placeholder="We've sent a confirmation email..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Message (German)</Label>
                  <Textarea
                    value={content.success_payment_email_message_de}
                    onChange={(e) => setContent({ ...content, success_payment_email_message_de: e.target.value })}
                    placeholder="Wir haben Ihnen eine Bestätigungs-E-Mail..."
                  />
                </div>
              </div>

              <div>
                {renderStepsList('success_payment_steps', 'Payment Success Steps')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Success Page - Reservation Success</CardTitle>
              <CardDescription>
                Configure content for successful voucher bookings/redemptions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title (English)</Label>
                  <Input
                    value={content.success_reservation_title}
                    onChange={(e) => setContent({ ...content, success_reservation_title: e.target.value })}
                    placeholder="Reservation Confirmed!"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Title (German)</Label>
                  <Input
                    value={content.success_reservation_title_de}
                    onChange={(e) => setContent({ ...content, success_reservation_title_de: e.target.value })}
                    placeholder="Reservierung Bestätigt!"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Description (English)</Label>
                  <Textarea
                    value={content.success_reservation_description}
                    onChange={(e) => setContent({ ...content, success_reservation_description: e.target.value })}
                    placeholder="Your jump has been scheduled successfully."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (German)</Label>
                  <Textarea
                    value={content.success_reservation_description_de}
                    onChange={(e) => setContent({ ...content, success_reservation_description_de: e.target.value })}
                    placeholder="Ihr Sprung wurde erfolgreich geplant."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Booking Confirmed Label (English)</Label>
                  <Input
                    value={content.success_reservation_booking_confirmed}
                    onChange={(e) => setContent({ ...content, success_reservation_booking_confirmed: e.target.value })}
                    placeholder="Booking Code"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Booking Confirmed Label (German)</Label>
                  <Input
                    value={content.success_reservation_booking_confirmed_de}
                    onChange={(e) => setContent({ ...content, success_reservation_booking_confirmed_de: e.target.value })}
                    placeholder="Buchungscode"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Voucher Used Label (English)</Label>
                  <Input
                    value={content.success_reservation_voucher_used}
                    onChange={(e) => setContent({ ...content, success_reservation_voucher_used: e.target.value })}
                    placeholder="Voucher Code"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Voucher Used Label (German)</Label>
                  <Input
                    value={content.success_reservation_voucher_used_de}
                    onChange={(e) => setContent({ ...content, success_reservation_voucher_used_de: e.target.value })}
                    placeholder="Gutscheincode"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Scheduled For Label (English)</Label>
                  <Input
                    value={content.success_reservation_scheduled_for}
                    onChange={(e) => setContent({ ...content, success_reservation_scheduled_for: e.target.value })}
                    placeholder="Scheduled For"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Scheduled For Label (German)</Label>
                  <Input
                    value={content.success_reservation_scheduled_for_de}
                    onChange={(e) => setContent({ ...content, success_reservation_scheduled_for_de: e.target.value })}
                    placeholder="Geplant Für"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Check Email Title (English)</Label>
                  <Input
                    value={content.success_reservation_check_email}
                    onChange={(e) => setContent({ ...content, success_reservation_check_email: e.target.value })}
                    placeholder="Check Your Email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Check Email Title (German)</Label>
                  <Input
                    value={content.success_reservation_check_email_de}
                    onChange={(e) => setContent({ ...content, success_reservation_check_email_de: e.target.value })}
                    placeholder="Überprüfen Sie Ihre E-Mail"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email Message (English)</Label>
                  <Textarea
                    value={content.success_reservation_email_message}
                    onChange={(e) => setContent({ ...content, success_reservation_email_message: e.target.value })}
                    placeholder="We've sent a confirmation email..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Message (German)</Label>
                  <Textarea
                    value={content.success_reservation_email_message_de}
                    onChange={(e) => setContent({ ...content, success_reservation_email_message_de: e.target.value })}
                    placeholder="Wir haben Ihnen eine Bestätigungs-E-Mail..."
                  />
                </div>
              </div>

              <div>
                {renderStepsList('success_reservation_steps', 'Reservation Success Steps')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Success Page - Common</CardTitle>
              <CardDescription>
                Configure common content shared across all success pages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>What&#39;s Next Title (English)</Label>
                  <Input
                    value={content.success_whats_next_title}
                    onChange={(e) => setContent({ ...content, success_whats_next_title: e.target.value })}
                    placeholder="What's Next?"
                  />
                </div>
                <div className="space-y-2">
                  <Label>What&#39;s Next Title (German)</Label>
                  <Input
                    value={content.success_whats_next_title_de}
                    onChange={(e) => setContent({ ...content, success_whats_next_title_de: e.target.value })}
                    placeholder="Was kommt als Nächstes?"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Help Title (English)</Label>
                  <Input
                    value={content.success_help_title}
                    onChange={(e) => setContent({ ...content, success_help_title: e.target.value })}
                    placeholder="Need Help?"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Help Title (German)</Label>
                  <Input
                    value={content.success_help_title_de}
                    onChange={(e) => setContent({ ...content, success_help_title_de: e.target.value })}
                    placeholder="Brauchen Sie Hilfe?"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Help Message (English)</Label>
                  <Textarea
                    value={content.success_help_message}
                    onChange={(e) => setContent({ ...content, success_help_message: e.target.value })}
                    placeholder="If you have any questions..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Help Message (German)</Label>
                  <Textarea
                    value={content.success_help_message_de}
                    onChange={(e) => setContent({ ...content, success_help_message_de: e.target.value })}
                    placeholder="Bei Fragen können Sie uns..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Contact Email</Label>
                <Input
                  value={content.success_contact_email}
                  onChange={(e) => setContent({ ...content, success_contact_email: e.target.value })}
                  placeholder="info@skydive-salzburg.com"
                  type="email"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Voucher Code Label (English)</Label>
                  <Input
                    value={content.success_voucher_code_label}
                    onChange={(e) => setContent({ ...content, success_voucher_code_label: e.target.value })}
                    placeholder="Voucher Code"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Voucher Code Label (German)</Label>
                  <Input
                    value={content.success_voucher_code_label_de}
                    onChange={(e) => setContent({ ...content, success_voucher_code_label_de: e.target.value })}
                    placeholder="Gutscheincode"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Booking Code Label (English)</Label>
                  <Input
                    value={content.success_booking_code_label}
                    onChange={(e) => setContent({ ...content, success_booking_code_label: e.target.value })}
                    placeholder="Booking Code"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Booking Code Label (German)</Label>
                  <Input
                    value={content.success_booking_code_label_de}
                    onChange={(e) => setContent({ ...content, success_booking_code_label_de: e.target.value })}
                    placeholder="Buchungscode"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Download PDF Button (English)</Label>
                  <Input
                    value={content.success_download_pdf_button}
                    onChange={(e) => setContent({ ...content, success_download_pdf_button: e.target.value })}
                    placeholder="Download PDF"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Download PDF Button (German)</Label>
                  <Input
                    value={content.success_download_pdf_button_de}
                    onChange={(e) => setContent({ ...content, success_download_pdf_button_de: e.target.value })}
                    placeholder="PDF Herunterladen"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Back to Home Button (English)</Label>
                  <Input
                    value={content.success_back_to_home_button}
                    onChange={(e) => setContent({ ...content, success_back_to_home_button: e.target.value })}
                    placeholder="Back to Home"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Back to Home Button (German)</Label>
                  <Input
                    value={content.success_back_to_home_button_de}
                    onChange={(e) => setContent({ ...content, success_back_to_home_button_de: e.target.value })}
                    placeholder="Zurück zur Startseite"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Purchase Another Button (English)</Label>
                  <Input
                    value={content.success_purchase_another_button}
                    onChange={(e) => setContent({ ...content, success_purchase_another_button: e.target.value })}
                    placeholder="Purchase Another"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Purchase Another Button (German)</Label>
                  <Input
                    value={content.success_purchase_another_button_de}
                    onChange={(e) => setContent({ ...content, success_purchase_another_button_de: e.target.value })}
                    placeholder="Weitere Kaufen"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PDF CONFIGURATION TAB */}
        <TabsContent value="pdf-config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>PDF Voucher Configuration</CardTitle>
              <CardDescription>
                Configure default text content that appears on PDF vouchers. These can be overridden by individual templates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Voucher Description (English)</Label>
                  <Textarea
                    value={content.pdf_voucher_description ?? ''}
                    onChange={(e) => setContent({ ...content, pdf_voucher_description: e.target.value })}
                    placeholder="Experience the thrill of a tandem skydive from 12,000 feet with our professional instructors. This voucher includes all equipment, training, and an unforgettable freefall experience."
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Default description text shown on PDF vouchers. Can be positioned freely using the template editor.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Voucher Description (German)</Label>
                  <Textarea
                    value={content.pdf_voucher_description_de ?? ''}
                    onChange={(e) => setContent({ ...content, pdf_voucher_description_de: e.target.value })}
                    placeholder="Erleben Sie den Nervenkitzel eines Tandem-Fallschirmsprungs aus 12.000 Fuß mit unseren professionellen Ausbildern. Dieser Gutschein umfasst die gesamte Ausrüstung, das Training und ein unvergessliches Freifallserlebnis."
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Standard-Beschreibungstext für PDF-Gutscheine. Kann im Template-Editor frei positioniert werden.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button (Fixed at bottom) */}
      <Card>
        <CardContent className="py-4">
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save All Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
