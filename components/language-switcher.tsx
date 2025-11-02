'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Globe } from 'lucide-react'
import { updateUserLanguage } from '@/lib/actions/user-preferences'
import { toast } from 'sonner'
import { useState, useTransition } from 'react'

interface LanguageSwitcherProps {
  variant?: 'default' | 'menu'
}

export function LanguageSwitcher({ variant = 'default' }: LanguageSwitcherProps) {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations('settings')
  const [isPending, startTransition] = useTransition()

  const handleChange = async (newLocale: string) => {
    if (newLocale !== 'de' && newLocale !== 'en') return

    startTransition(async () => {
      // Update user preference in database (also sets cookie)
      const result = await updateUserLanguage(newLocale as 'de' | 'en')

      if (result.error) {
        // If updating database fails, still set cookie for immediate effect
        document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`
        toast.error(result.error)
      } else {
        toast.success(t('languageUpdated'))
      }

      // Refresh to apply new locale
      router.refresh()
    })
  }

  if (variant === 'menu') {
    // Simplified version for user menu
    return (
      <Select value={locale} onValueChange={handleChange} disabled={isPending}>
        <SelectTrigger className="w-full">
          <Globe className="h-4 w-4 mr-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="de">🇦🇹 Deutsch</SelectItem>
          <SelectItem value="en">🇬🇧 English</SelectItem>
        </SelectContent>
      </Select>
    )
  }

  return (
    <Select value={locale} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="w-[140px]">
        <Globe className="h-4 w-4 mr-2" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="de">🇦🇹 Deutsch</SelectItem>
        <SelectItem value="en">🇬🇧 English</SelectItem>
      </SelectContent>
    </Select>
  )
}
