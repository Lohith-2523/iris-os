import { NextRequest, NextResponse } from 'next/server';
import { CanvaIntegrationError, createCanvaBannerDesign } from '@/lib/canva';
import { getRequestUser, isOrganizationAdmin } from '@/lib/org';

export async function GET(request: NextRequest) {
  let returnPath: '/dashboard' | '/client-dashboard' = '/dashboard';
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.redirect(new URL('/login?auth_error=session_required', request.url), 303);
    const clientTarget = request.nextUrl.searchParams.get('target') === 'client';
    const isLinkedClient = user.role.toLowerCase() === 'client' && Boolean(user.clientId);
    if (clientTarget) {
      returnPath = '/client-dashboard';
      if (!isLinkedClient || !user.clientId) return NextResponse.redirect(new URL('/client-dashboard?canva=forbidden', request.url), 303);
    } else if (!isOrganizationAdmin(user)) {
      return NextResponse.redirect(new URL('/dashboard?canva=forbidden', request.url), 303);
    }

    const editUrl = await createCanvaBannerDesign({
      bannerTarget: clientTarget ? { kind: 'client', clientId: user.clientId! } : { kind: 'organization' },
      orgId: user.orgId,
      returnOrigin: request.nextUrl.origin,
      returnPath,
      userId: user.id,
    });
    if (!editUrl) {
      if (clientTarget) {
        return NextResponse.redirect(new URL('/client-dashboard?canva=connection_required', request.url), 303);
      }
      return NextResponse.redirect(new URL('/api/canva/auth', request.url), 303);
    }
    return NextResponse.redirect(editUrl, 303);
  } catch (error) {
    console.error('Canva banner creation failed:', error);
    const reason = error instanceof CanvaIntegrationError ? error.code : 'design_creation_failed';
    return NextResponse.redirect(new URL(`${returnPath}?canva=${encodeURIComponent(reason)}`, request.url), 303);
  }
}
