import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
  const redirectUri = `${protocol}://${host}/api/paypal/callback`;

  const clientId = process.env.PAYPAL_CLIENT_ID;

  // Fallback/Simulated OAuth for developer test keys
  if (!clientId || clientId === 'AblU78vqA3K21YC9dXZtRbo9ckg25LR2Fx82ivMNVsUV4B0cySsViR4xm-RZt0SW4Nsim34vaRZsJCkn' || clientId.includes('mock') || clientId.startsWith('paypal_client_id_test')) {
    return NextResponse.redirect(`${redirectUri}?code=mock_paypal_code_999`);
  }

  // Use sandbox for authorize redirect as default, or production if specified
  const isProduction = process.env.PAYPAL_ENVIRONMENT === 'PRODUCTION';
  const baseAuthUrl = isProduction
    ? 'https://www.paypal.com/signin/authorize'
    : 'https://www.sandbox.paypal.com/signin/authorize';

  const paypalUrl = `${baseAuthUrl}?client_id=${clientId}&response_type=code&scope=openid+email+profile&redirect_uri=${encodeURIComponent(redirectUri)}`;
  return NextResponse.redirect(paypalUrl);
}
