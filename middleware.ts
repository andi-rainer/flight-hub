import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware to handle authentication and locale
 *
 * This middleware:
 * 1. Sets locale from user preference, browser language, or defaults to English
 * 2. Refreshes the auth session on every request
 * 3. Protects dashboard routes (requires authentication)
 * 4. Redirects authenticated users away from auth pages
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Determine locale with priority: user preference > cookie > browser language > default
  let locale = 'en' // Default fallback to English

  if (user) {
    // Try to get user's preferred language from database
    const { data: userData } = await supabase
      .from('users')
      .select('preferred_language')
      .eq('id', user.id)
      .single()

    if (userData?.preferred_language) {
      locale = userData.preferred_language
    } else {
      // Check cookie
      const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value
      if (cookieLocale === 'de' || cookieLocale === 'en') {
        locale = cookieLocale
      } else {
        // Check browser language
        const browserLang = request.headers.get('accept-language')
        if (browserLang?.toLowerCase().includes('de')) {
          locale = 'de'
        }
      }
    }
  } else {
    // User not logged in: check cookie > browser language > default
    const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value
    if (cookieLocale === 'de' || cookieLocale === 'en') {
      locale = cookieLocale
    } else {
      // Check browser language
      const browserLang = request.headers.get('accept-language')
      if (browserLang?.toLowerCase().includes('de')) {
        locale = 'de'
      }
      // Otherwise stays 'en' (default)
    }
  }

  // Set locale header for next-intl and cookie for consistency
  supabaseResponse.headers.set('x-locale', locale)
  if (request.cookies.get('NEXT_LOCALE')?.value !== locale) {
    supabaseResponse.cookies.set('NEXT_LOCALE', locale, {
      path: '/',
      maxAge: 31536000,
      sameSite: 'lax',
    })
  }

  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/forgot-password', '/reset-password', '/auth/callback', '/auth/auth-code-error', '/registration/tandem']
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

  // Routes that require authentication but bypass dashboard layout checks
  const specialAuthRoutes = ['/account-inactive']
  const isSpecialAuthRoute = specialAuthRoutes.some((route) => pathname.startsWith(route))

  // Dashboard routes that require authentication
  const isDashboardRoute = pathname.startsWith('/dashboard') ||
    pathname.startsWith('/aircrafts') ||
    pathname.startsWith('/reservations') ||
    pathname.startsWith('/flightlog') ||
    pathname.startsWith('/members') ||
    pathname.startsWith('/documents') ||
    pathname.startsWith('/settings')

  // Redirect unauthenticated users trying to access protected routes
  if (!user && (isDashboardRoute || isSpecialAuthRoute)) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect authenticated users away from login page
  if (user && pathname === '/login') {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/dashboard'
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect root to dashboard if authenticated, otherwise to login
  if (pathname === '/') {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = user ? '/dashboard' : '/login'
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
