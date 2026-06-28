import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  try {
    let supabaseResponse = NextResponse.next({
      request,
    })

    // With Fluid compute, don't put this client in a global environment
    // variable. Always create a new one on each request.
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'placeholder-anon-key',
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

    const mockEmail = request.cookies.get('currentUserEmail')?.value

    const pathname = request.nextUrl.pathname
    const isPublicRoute =
      pathname === '/coming-soon' ||
      pathname === '/' ||
      pathname === '/home' ||
      pathname === '/pricing' ||
      pathname === '/terms' ||
      pathname === '/privacy' ||
      pathname.startsWith('/oauth/consent') ||
      pathname.startsWith('/signup') ||
      pathname.startsWith('/onboarding') ||
      pathname.startsWith('/login') ||
      pathname.startsWith('/auth') ||
      pathname.includes('/webhook') ||
      pathname.includes('/webhooks') ||
      pathname.includes('/callback') ||
      pathname === '/api/canva/auth'

    if (!user && !mockEmail && !isPublicRoute) {
      // no user, potentially respond by redirecting the user to the login page
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  } catch (error) {
    console.error('Next.js 16 proxy middleware error caught:', error)
    // Fallback: let the request proceed so the page can load or render gracefully
    return NextResponse.next({
      request,
    })
  }
}
