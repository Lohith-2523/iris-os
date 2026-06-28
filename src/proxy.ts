import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/middleware';

export async function proxy(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
  const isProduction = process.env.NODE_ENV === 'production';
  const isComingSoon = process.env.NEXT_PUBLIC_COMING_SOON === 'true';

  if (isProduction && !isLocalhost && isComingSoon) {
    const { pathname } = request.nextUrl;

    // Skip Next.js internals, images, sitemaps, robots, favicon
    const isStaticAsset =
      pathname.startsWith('/_next') ||
      pathname.startsWith('/images') ||
      pathname === '/favicon.ico' ||
      pathname === '/robots.txt' ||
      pathname === '/sitemap.xml' ||
      pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff2?|ttf)$/i);

    if (pathname !== '/coming-soon' && !isStaticAsset) {
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
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
