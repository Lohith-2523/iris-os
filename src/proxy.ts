import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/middleware';

const SUPERADMIN_HOSTNAME = 'superadmin.irisos.app';

function requestHostname(request: NextRequest) {
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  return (forwardedHost || request.headers.get('host') || request.nextUrl.hostname)
    .split(':')[0]
    .toLowerCase();
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (requestHostname(request) === SUPERADMIN_HOSTNAME && (pathname === '/' || pathname === '/login')) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    return NextResponse.redirect(url);
  }

  // Discovery files must remain public, including during coming-soon mode and
  // authentication-provider outages. They never contain workspace information.
  if (['/robots.txt', '/llms.txt'].includes(request.nextUrl.pathname)) return NextResponse.next();

  // Regional pricing is public and does not use session data. Avoid touching
  // stale Supabase cookies so anonymous visitors can always resolve currency.
  if (pathname === '/api/pricing') return NextResponse.next();

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

    if (pathname !== '/coming-soon' && !pathname.startsWith('/admin') && !isStaticAsset) {
      const url = request.nextUrl.clone();
      url.pathname = '/coming-soon';
      return NextResponse.redirect(url);
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|mp4|webm|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
