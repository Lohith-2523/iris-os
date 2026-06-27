'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, ArrowRight, Check } from 'lucide-react';

function ConsentContent() {
  const searchParams = useSearchParams();

  const clientId = searchParams.get('client_id') || 'Shards Media Analytics Console';
  const redirectUri = searchParams.get('redirect_uri') || '/dashboard';
  const scope = searchParams.get('scope') || 'profile email';
  const state = searchParams.get('state') || 'mock_state_xyz';

  const scopesList = React.useMemo(() => {
    return scope.split(' ');
  }, [scope]);

  const handleApprove = () => {
    const code = 'spl_mock_auth_code_987654321';
    
    // Construct the redirect URL
    let targetUrl;
    try {
      if (redirectUri.startsWith('http://') || redirectUri.startsWith('https://')) {
        targetUrl = new URL(redirectUri);
      } else {
        targetUrl = new URL(redirectUri, window.location.origin);
      }
      targetUrl.searchParams.set('code', code);
      targetUrl.searchParams.set('state', state);
      window.location.href = targetUrl.toString();
    } catch (e) {
      console.error('Invalid redirect_uri:', e);
      window.location.href = `/dashboard?code=${code}&state=${state}`;
    }
  };

  const handleDeny = () => {
    let targetUrl;
    try {
      if (redirectUri.startsWith('http://') || redirectUri.startsWith('https://')) {
        targetUrl = new URL(redirectUri);
      } else {
        targetUrl = new URL(redirectUri, window.location.origin);
      }
      targetUrl.searchParams.set('error', 'access_denied');
      targetUrl.searchParams.set('state', state);
      window.location.href = targetUrl.toString();
    } catch (e) {
      console.error('Invalid redirect_uri:', e);
      window.location.href = `/dashboard?error=access_denied&state=${state}`;
    }
  };

  return (
    <Card className="relative z-10 w-full max-w-md bg-[#0d0e12] border-zinc-800 p-2 shadow-2xl font-sans text-xs">
      <CardHeader className="text-center pt-8 pb-6 border-b border-zinc-800">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 font-bold text-zinc-950 shadow-md border border-zinc-200 mb-4 text-base">
          I
        </div>
        <CardTitle className="text-xl font-bold tracking-tight text-white silver-text-gradient">OAuth Connection Consent</CardTitle>
        <CardDescription className="text-xs text-zinc-500 mt-1">
          Supabase Secured Gateway
        </CardDescription>
      </CardHeader>
      
      <CardContent className="px-6 py-6 space-y-6">
        <div className="bg-zinc-900/40 border border-zinc-850 p-4 space-y-2">
          <span className="block text-zinc-400 font-medium">Application Requesting Access:</span>
          <span className="block text-sm font-bold text-white uppercase tracking-wider">{clientId}</span>
        </div>

        <div className="space-y-3">
          <span className="block font-semibold text-zinc-400">This application will be able to:</span>
          <div className="space-y-2">
            {scopesList.includes('profile') && (
              <div className="flex gap-2.5 items-start text-zinc-300">
                <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="block font-semibold text-white">Read User Profile</span>
                  <span className="block text-[10px] text-zinc-500">Access email address, organization name, and profile initials.</span>
                </div>
              </div>
            )}
            {scopesList.includes('email') && (
              <div className="flex gap-2.5 items-start text-zinc-300">
                <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="block font-semibold text-white">Read Corporate Email</span>
                  <span className="block text-[10px] text-zinc-500">Retrieve primary billing notifications address.</span>
                </div>
              </div>
            )}
            <div className="flex gap-2.5 items-start text-zinc-300">
              <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="block font-semibold text-white">Read Agency Ledgers</span>
                <span className="block text-[10px] text-zinc-500">Retrieve gross profit margins, invoices, and expense logs.</span>
              </div>
            </div>
            <div className="flex gap-2.5 items-start text-zinc-300">
              <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="block font-semibold text-white">Access Canva & Meta Sync</span>
                <span className="block text-[10px] text-zinc-500">Coordinate asset designs, catalog files, and Meta Ads metrics.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-4 border-t border-zinc-800">
          <Button
            type="button"
            onClick={handleDeny}
            className="flex-1 h-10 font-bold text-xs bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700 cursor-pointer"
          >
            Cancel Access
          </Button>
          <Button
            type="button"
            onClick={handleApprove}
            className="flex-1 h-10 font-bold text-xs bg-white text-zinc-950 hover:bg-zinc-200 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Approve Consent</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="rounded-lg border border-zinc-850 bg-zinc-900/10 p-4 space-y-2 flex items-start gap-3">
          <div className="h-6 w-6 rounded bg-zinc-850 flex items-center justify-center shrink-0">
            <Shield className="h-3.5 w-3.5 text-zinc-350" />
          </div>
          <div>
            <span className="block font-semibold text-zinc-300">Supabase Authenticator</span>
            <span className="block text-[10px] text-zinc-500 mt-1 leading-normal">
              Connection authorization is fully logged in the Shards Media enterprise audit gateway.
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ConsentPage() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#09090b] px-4 relative overflow-hidden">
      {/* Glow highlight */}
      <div className="absolute inset-0 bg-radial-[circle_at_center,rgba(255,255,255,0.015)_0%,transparent_70%]" />
      
      <React.Suspense fallback={
        <div className="text-zinc-500 text-xs flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border border-t-transparent border-zinc-400" />
          <span>Loading OAuth parameters...</span>
        </div>
      }>
        <ConsentContent />
      </React.Suspense>
    </div>
  );
}
