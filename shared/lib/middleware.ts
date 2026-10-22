import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  canAccessPasswordReset,
  PASSWORD_RECOVERY_COOKIE,
  passwordRecoveryFailurePath,
} from '@/lib/auth-routes'

export async function updateSession(request: NextRequest) {
  try {
    let supabaseResponse = NextResponse.next({
      request,
    })

    // With Fluid compute, don't put this client in a global environment
    // variable. Always create a new one on each request.
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    if (!url || !publishableKey) throw new Error('Supabase configuration is missing.')

    const supabase = createServerClient(
      url,
      publishableKey,
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

    // Do not run code between createServerClient and
    // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    // IMPORTANT: If you remove getClaims() and you use server-side rendering
    // with the Supabase client, your users may be randomly logged out.
    const { data } = await supabase.auth.getClaims()
    const user = data?.claims

    const pathname = request.nextUrl.pathname
    if (pathname === '/waitlist') {
      return NextResponse.redirect(new URL('/signup', request.url))
    }
    if (pathname === '/api/waitlist') {
      return NextResponse.json({ error: 'The waitlist has been retired. Create your workspace directly.' }, { status: 410 })
    }
    if (!canAccessPasswordReset(
      pathname,
      Boolean(user),
      request.cookies.get(PASSWORD_RECOVERY_COOKIE)?.value,
    )) {
      const url = request.nextUrl.clone()
      url.pathname = passwordRecoveryFailurePath(pathname)
      url.searchParams.set('recovery_error', 'secure_link_required')
      return NextResponse.redirect(url)
    }

    const isPublicRoute =
      pathname === '/coming-soon' ||
      pathname === '/' ||
      pathname === '/home' ||
      pathname === '/pricing' ||
      pathname === '/terms' ||
      pathname === '/privacy' ||
      pathname === '/cancellation-refund-policy' ||
      pathname === '/data-processing-agreement' ||
      pathname === '/ai-usage-policy' ||
      pathname === '/subprocessors' ||
      pathname === '/waitlist' ||
      pathname === '/admin/login' ||
      pathname === '/admin/forgot-password' ||
      pathname.startsWith('/signup') ||
      pathname.startsWith('/onboarding/member') ||
      pathname === '/invite' ||
      pathname.startsWith('/sign-document/') ||
      pathname.startsWith('/login') ||
      pathname.startsWith('/forgot-password') ||
      pathname === '/auth/callback' ||
      pathname === '/api/member' ||
      pathname === '/api/invite' ||
      pathname === '/api/auth/signup' ||
      pathname === '/api/auth/device-access' ||
      pathname === '/api/waitlist' ||
      pathname.startsWith('/api/cron/') ||
      pathname.startsWith('/api/document-signing/') ||
      pathname === '/api/webhooks/meta' ||
      pathname === '/api/meta-ads/deauthorize' ||
      pathname === '/api/meta-ads/delete-data' ||
      pathname === '/api/canva/auth' ||
      pathname === '/api/canva/callback' ||
      pathname === '/api/canva/return'

    if (!user && !isPublicRoute) {
      // API consumers expect JSON and fetch follows redirects by default. A
      // redirect here would turn the login page HTML into a misleading JSON
      // parse failure in the caller.
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Oops! Please sign in to continue.' }, { status: 401 })
      }

      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  } catch (error) {
    console.error('Next.js 16 proxy middleware error caught:', error)
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 503 })
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
}
