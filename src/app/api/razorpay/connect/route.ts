import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
  const redirectUri = `${protocol}://${host}/api/razorpay/callback`;

  const clientId = process.env.RAZORPAY_CLIENT_ID;

  // Fallback/Simulated OAuth for developer test keys
  if (!clientId || clientId.includes('mock') || clientId === 'rzp_test_T6wXv1phNxSL5Q') {
    return NextResponse.redirect(`${redirectUri}?code=mock_razorpay_code_555`);
  }

  const razorpayUrl = `https://dashboard.razorpay.com/oauth/authorize?response_type=code&client_id=${clientId}&scope=read_only&redirect_uri=${encodeURIComponent(redirectUri)}`;
  return NextResponse.redirect(razorpayUrl);
}
