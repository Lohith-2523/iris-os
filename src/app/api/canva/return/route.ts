import { NextRequest, NextResponse } from 'next/server';
import { CanvaIntegrationError, exportCanvaBannerToWorkspace } from '@/lib/canva';

export async function GET(request: NextRequest) {
  const correlationJwt = request.nextUrl.searchParams.get('correlation_jwt');
  if (!correlationJwt) {
    return NextResponse.redirect(new URL('/dashboard?canva=missing_return_token', request.url));
  }

  try {
    const returnOrigin = await exportCanvaBannerToWorkspace(correlationJwt);
    return NextResponse.redirect(new URL('/dashboard?canva=banner_exported', returnOrigin));
  } catch (error) {
    console.error('Canva banner return failed:', error);
    const reason = error instanceof CanvaIntegrationError ? error.code : 'banner_export_failed';
    return NextResponse.redirect(new URL(`/dashboard?canva=${encodeURIComponent(reason)}`, request.url));
  }
}
