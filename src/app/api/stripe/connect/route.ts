import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
  const redirectUri = `${protocol}://${host}/api/stripe/callback`;

  const clientId = process.env.STRIPE_CLIENT_ID;

  // Fallback/Simulated OAuth for developer test keys
  if (!clientId || clientId === 'ca_UjwhFL1nRv2IW0nlrNZiXixclDm5RgbS' || clientId.includes('mock')) {
    return NextResponse.redirect(`${redirectUri}?code=mock_stripe_code_789`);
  }

  const stripeUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${clientId}&scope=read_only&redirect_uri=${encodeURIComponent(redirectUri)}`;
  return NextResponse.redirect(stripeUrl);
}
