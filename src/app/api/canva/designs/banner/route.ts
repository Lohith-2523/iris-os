import { NextRequest, NextResponse } from 'next/server';
import { CanvaIntegrationError, createCanvaBannerDesign } from '@/lib/canva';
import { getRequestUser, isOrganizationAdmin } from '@/lib/org';

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.redirect(new URL('/login?auth_error=session_required', request.url));
    if (!isOrganizationAdmin(user)) return NextResponse.redirect(new URL('/dashboard?canva=forbidden', request.url));

    const editUrl = await createCanvaBannerDesign({
      orgId: user.orgId,
      returnOrigin: request.nextUrl.origin,
      userId: user.id,
    });
    if (!editUrl) {
      return NextResponse.redirect(new URL('/api/canva/auth', request.url));
    }
    return NextResponse.redirect(editUrl);
  } catch (error) {
    console.error('Canva banner creation failed:', error);
    const reason = error instanceof CanvaIntegrationError ? error.code : 'design_creation_failed';
    return NextResponse.redirect(new URL(`/dashboard?canva=${encodeURIComponent(reason)}`, request.url));
  }
}
