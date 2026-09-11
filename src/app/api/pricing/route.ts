import { NextRequest, NextResponse } from 'next/server';
import { pricingCatalog } from '@/lib/plan-pricing';
import { pricingLocation } from '@/lib/request-country';

export async function GET(request: NextRequest) {
  const location = pricingLocation(request.headers);
  return NextResponse.json({ ...location, plans: pricingCatalog(location.region) }, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
