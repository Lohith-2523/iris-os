import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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
    const isPublicRoute =
      pathname === '/coming-soon' ||
      pathname === '/' ||
      pathname === '/home' ||
      pathname === '/pricing' ||
      pathname === '/terms' ||
      pathname === '/privacy' ||
      pathname === '/waitlist' ||
      pathname.startsWith('/signup') ||
      pathname.startsWith('/onboarding/member') ||
      pathname === '/invite' ||
      pathname.startsWith('/login') ||
      pathname === '/auth/callback' ||
      pathname === '/api/member' ||
      pathname === '/api/invite' ||
      pathname === '/api/webhooks/meta' ||
      pathname === '/api/meta-ads/deauthorize' ||
      pathname === '/api/meta-ads/delete-data' ||
      pathname === '/api/canva/auth'

    if (!user && !isPublicRoute) {
      // no user, potentially respond by redirecting the user to the login page
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
