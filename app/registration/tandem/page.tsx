'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle2, Plane, Lock, FileText } from 'lucide-react'
import { toast } from 'sonner'

interface CustomField {
  id: string
  label: string
  text: string
  requireCheckbox: boolean
  pdfUrl?: string
}

export default function TandemRegistrationPage() {
  const [passwordEntered, setPasswordEntered] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [checkingPassword, setCheckingPassword] = useState(false)
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [customFieldAcceptances, setCustomFieldAcceptances] = useState<Record<string, boolean>>({})

  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    telephone: '',
    birthday: '',
    street: '',
    house_number: '',
    zip: '',
    city: '',
    country: 'Switzerland',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    terms_accepted: false,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Check if password was already entered in this session
  useEffect(() => {
    const sessionPassword = sessionStorage.getItem('tandem_auth')
    if (sessionPassword === 'authenticated') {
      setPasswordEntered(true)
      loadCustomFields()
    }
  }, [])

  const loadCustomFields = async () => {
    try {
      const response = await fetch('/api/registration/tandem/fields')
      if (response.ok) {
        const data = await response.json()
        setCustomFields(data.customFields || [])
        // Initialize acceptance states
        const initialAcceptances: Record<string, boolean> = {}
        data.customFields?.forEach((field: CustomField) => {
          initialAcceptances[field.id] = false
        })
        setCustomFieldAcceptances(initialAcceptances)
      }
    } catch (error) {
      console.error('Error loading custom fields:', error)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCheckingPassword(true)

    try {
      const response = await fetch('/api/registration/tandem/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      })

      if (response.ok) {
        sessionStorage.setItem('tandem_auth', 'authenticated')
        setPasswordEntered(true)
        await loadCustomFields()
      } else {
        toast.error('Incorrect password')
        setPasswordInput('')
      }
    } catch (error) {
      toast.error('Failed to verify password')
    }

    setCheckingPassword(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required custom field checkboxes
    const requiredFields = customFields.filter(f => f.requireCheckbox)
    for (const field of requiredFields) {
      if (!customFieldAcceptances[field.id]) {
        toast.error(`Please accept: ${field.label}`)
        return
      }
    }

    if (!formData.terms_accepted) {
      toast.error('Please accept the terms and conditions')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/registration/tandem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          customFieldAcceptances,
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setShowSuccess(true)
        // Reset form after 5 seconds
        setTimeout(() => {
          setShowSuccess(false)
          setFormData({
            name: '',
            surname: '',
            email: '',
            telephone: '',
            birthday: '',
            street: '',
            house_number: '',
            zip: '',
            city: '',
            country: 'Switzerland',
            emergency_contact_name: '',
            emergency_contact_phone: '',
            terms_accepted: false,
          })
          // Reset custom field acceptances
          const resetAcceptances: Record<string, boolean> = {}
          customFields.forEach(field => {
            resetAcceptances[field.id] = false
          })
          setCustomFieldAcceptances(resetAcceptances)
        }, 5000)
      } else {
        toast.error(result.error || 'Registration failed. Please try again.')
      }
    } catch (error) {
      console.error('Registration error:', error)
      toast.error('An error occurred. Please try again.')
    }

    setIsSubmitting(false)
  }

  // Show password screen if not authenticated
  if (!passwordEntered) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <Lock className="h-16 w-16 text-primary" />
            </div>
            <CardTitle className="text-2xl">Access Code Required</CardTitle>
            <CardDescription>
              Please enter the access code to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Access Code</Label>
                <Input
                  id="password"
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter access code"
                  required
                  className="text-lg h-12"
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                disabled={checkingPassword || !passwordInput}
                className="w-full h-12 text-lg"
              >
                {checkingPassword && <Loader2 className="h-5 w-5 mr-2 animate-spin" />}
                Continue
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-12 text-center space-y-6">
            <div className="flex justify-center">
              <CheckCircle2 className="h-24 w-24 text-green-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Welcome!</h2>
              <p className="text-xl text-muted-foreground">
                Your registration is complete
              </p>
            </div>
            <p className="text-lg">
              You're all set for your tandem try-out flight!
            </p>
            <p className="text-sm text-muted-foreground">
              This form will reset in a few seconds...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <Plane className="h-16 w-16 text-primary" />
          </div>
          <CardTitle className="text-3xl">Tandem Try-Out Registration</CardTitle>
          <CardDescription className="text-lg">
            Welcome! Please fill in your details for your tandem flight experience
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">First Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="text-lg h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="surname">Last Name *</Label>
                  <Input
                    id="surname"
                    value={formData.surname}
                    onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                    required
                    className="text-lg h-12"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="text-lg h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telephone">Phone Number *</Label>
                  <Input
                    id="telephone"
                    type="tel"
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    required
                    className="text-lg h-12"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthday">Date of Birth *</Label>
                <Input
                  id="birthday"
                  type="date"
                  value={formData.birthday}
                  onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                  required
                  className="text-lg h-12"
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Address</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="street">Street *</Label>
                  <Input
                    id="street"
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    required
                    className="text-lg h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="house_number">Number *</Label>
                  <Input
                    id="house_number"
                    value={formData.house_number}
                    onChange={(e) => setFormData({ ...formData, house_number: e.target.value })}
                    required
                    className="text-lg h-12"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP Code *</Label>
                  <Input
                    id="zip"
                    value={formData.zip}
                    onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                    required
                    className="text-lg h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                    className="text-lg h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    required
                    className="text-lg h-12"
                  />
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Emergency Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_name">Contact Name *</Label>
                  <Input
                    id="emergency_contact_name"
                    value={formData.emergency_contact_name}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                    required
                    className="text-lg h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_phone">Contact Phone *</Label>
                  <Input
                    id="emergency_contact_phone"
                    type="tel"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                    required
                    className="text-lg h-12"
                  />
                </div>
              </div>
            </div>

            {/* Custom Fields & Additional Terms */}
            {customFields.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Additional Information</h3>
                {customFields.map((field) => (
                  <div key={field.id} className="space-y-3 rounded-md border p-4 bg-muted/30">
                    <h4 className="font-medium text-base">{field.label}</h4>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{field.text}</p>
                    {field.pdfUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(field.pdfUrl, '_blank')}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Read Full Document
                      </Button>
                    )}
                    {field.requireCheckbox && (
                      <Alert>
                        <AlertDescription>
                          <div className="flex items-start space-x-3">
                            <Checkbox
                              id={`custom-${field.id}`}
                              checked={customFieldAcceptances[field.id] || false}
                              onCheckedChange={(checked) =>
                                setCustomFieldAcceptances({
                                  ...customFieldAcceptances,
                                  [field.id]: checked as boolean
                                })
                              }
                              className="mt-1"
                            />
                            <label
                              htmlFor={`custom-${field.id}`}
                              className="text-sm cursor-pointer leading-relaxed"
                            >
                              I have read and accept the terms stated above
                            </label>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Terms and Conditions */}
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="terms"
                      checked={formData.terms_accepted}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, terms_accepted: checked as boolean })
                      }
                      className="mt-1"
                    />
                    <label
                      htmlFor="terms"
                      className="text-sm cursor-pointer leading-relaxed"
                    >
                      I accept the terms and conditions and understand that I participate in this tandem
                      flight at my own risk. I confirm that all information provided is accurate.
                    </label>
                  </div>
                </AlertDescription>
              </Alert>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting || !formData.terms_accepted}
              className="w-full h-14 text-lg"
              size="lg"
            >
              {isSubmitting && <Loader2 className="h-5 w-5 mr-2 animate-spin" />}
              Complete Registration
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
