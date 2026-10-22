import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/middleware';
import { checkRequestRateLimit, requestRateLimitHeaders, type RequestRateLimitDecision } from '@/lib/request-rate-limit';

const SUPERADMIN_HOSTNAME = 'superadmin.irisos.app';
const LEGAL_PAGE_PATHS = new Set([
  '/privacy', '/terms', '/cancellation-refund-policy',
  '/data-processing-agreement', '/ai-usage-policy', '/subprocessors',
]);
const AUTH_FREE_PAGE_PATHS = new Set([
  '/',
  '/home',
  '/coming-soon',
  '/contact',
  '/pricing',
  '/terms',
  '/privacy',
  '/cancellation-refund-policy',
  '/login',
  '/signup',
  '/forgot-password',
  '/invite',
  '/admin/login',
  '/admin/forgot-password',
]);

function doesNotNeedProxyAuthentication(pathname: string) {
  return pathname.startsWith('/api/')
    || LEGAL_PAGE_PATHS.has(pathname)
    || AUTH_FREE_PAGE_PATHS.has(pathname)
    || pathname.startsWith('/signup/')
    || pathname.startsWith('/onboarding/member')
    || pathname.startsWith('/sign-document/')
    || pathname === '/auth/callback';
}

function requestHostname(request: NextRequest) {
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  return (forwardedHost || request.headers.get('host') || request.nextUrl.hostname)
    .split(':')[0]
    .toLowerCase();
}

function withRateLimitHeaders(response: NextResponse, decision: RequestRateLimitDecision | null) {
  if (!decision) return response;
  for (const [name, value] of Object.entries(requestRateLimitHeaders(decision))) response.headers.set(name, value);
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const rateLimit = pathname.startsWith('/api/')
    ? checkRequestRateLimit({ pathname, method: request.method, headers: request.headers })
    : null;
  if (rateLimit && !rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Request rate is temporarily too high. Please retry shortly.', category: rateLimit.category },
      {
        status: 429,
        headers: {
          ...requestRateLimitHeaders(rateLimit),
          'Retry-After': String(rateLimit.retryAfterSeconds),
          'Cache-Control': 'private, no-store',
        },
      },
    );
  }
  if (requestHostname(request) === SUPERADMIN_HOSTNAME && (pathname === '/' || pathname === '/login')) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    return NextResponse.redirect(url);
  }

  // Discovery files must remain public, including during coming-soon mode and
  // authentication-provider outages. They never contain workspace information.
  if (['/robots.txt', '/llms.txt'].includes(request.nextUrl.pathname)) return NextResponse.next();

  const host = request.headers.get('host') || '';
  const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
  const isProduction = process.env.NODE_ENV === 'production';
  const isComingSoon = process.env.NEXT_PUBLIC_COMING_SOON === 'true';

  if (isProduction && !isLocalhost && isComingSoon) {
    // Skip Next.js internals, images, sitemaps, robots, favicon
    const isStaticAsset =
      pathname.startsWith('/_next') ||
      pathname.startsWith('/images') ||
      pathname === '/favicon.ico' ||
      pathname === '/robots.txt' ||
      pathname === '/sitemap.xml' ||
      pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|mp4|webm)$/i);

    if (pathname !== '/coming-soon' && !LEGAL_PAGE_PATHS.has(pathname) && !pathname.startsWith('/admin') && !isStaticAsset) {
      const url = request.nextUrl.clone();
      url.pathname = '/coming-soon';
      return NextResponse.redirect(url);
    }
  }

  // Route handlers own API authorization and validate the same Supabase
  // identity again. Avoid a duplicate external auth call in Proxy. Public
  // pages also need no session refresh before cached content can be served.
  if (doesNotNeedProxyAuthentication(pathname)) {
    return withRateLimitHeaders(NextResponse.next(), rateLimit);
  }

  return withRateLimitHeaders(await updateSession(request), rateLimit);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|mp4|webm|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
