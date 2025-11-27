'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { getStoreContent, updateStoreContent, type StoreContent } from '@/lib/actions/store-content'

interface Feature {
  text: string
  text_de: string
}

export function ContentManagementSection() {
  const [content, setContent] = useState<StoreContent | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

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
        terms_url: result.data.terms_url ?? '',
        terms_url_de: result.data.terms_url_de ?? '',
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="home">Home</TabsTrigger>
          <TabsTrigger value="voucher-cards">Voucher Cards</TabsTrigger>
          <TabsTrigger value="booking-cards">Booking Cards</TabsTrigger>
          <TabsTrigger value="vouchers-page">Vouchers Page</TabsTrigger>
          <TabsTrigger value="bookings-page">Bookings Page</TabsTrigger>
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
      </Tabs>

      {/* Save Button (Fixed at bottom) */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={content.show_terms_on_checkout}
                  onCheckedChange={(checked) => setContent({ ...content, show_terms_on_checkout: checked })}
                />
                <Label>Show terms on checkout</Label>
              </div>
            </div>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save All Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
