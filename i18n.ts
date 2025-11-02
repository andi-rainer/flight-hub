import { getRequestConfig } from 'next-intl/server'
import { cookies, headers } from 'next/headers'

export const locales = ['de', 'en'] as const
export type Locale = (typeof locales)[number]

export default getRequestConfig(async () => {
  // Get locale from cookie or header (set by middleware)
  const cookieStore = await cookies()
  const headersList = await headers()

  let locale =
    cookieStore.get('NEXT_LOCALE')?.value ||
    headersList.get('x-locale') ||
    'en' // Default to English

  // Ensure locale is valid
  if (locale !== 'de' && locale !== 'en') {
    locale = 'en'
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  }
})
