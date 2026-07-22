'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, User, Lock, ArrowRight, ShieldCheck, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/client';

function InvitePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [inviteData, setInviteData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const [name, setName] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!token) {
      setErrorMsg('Missing invite token. Please contact your account administrator.');
      setLoading(false);
      return;
    }

    const fetchInvite = async () => {
      try {
        const res = await fetch(`/api/invite?token=${token}`);
        if (res.ok) {
          const data = await res.json();
          setInviteData(data);
          setName(data.name || '');
        } else {
          const err = await res.json();
          setErrorMsg(err.error || 'Failed to validate invite token.');
        }
      } catch (err) {
        console.error(err);
        setErrorMsg('Network error validating invite.');
      } finally {
        setLoading(false);
      }
    };

    fetchInvite();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const supabase = createClient();
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: inviteData.email,
        password,
        options: { data: { name, role: 'client' } },
      });
      if (signUpError && !signUpError.message.toLowerCase().includes('already registered')) throw signUpError;
      if (!authData.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: inviteData.email, password });
        if (signInError) throw signInError;
      }

      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, name })
      });

      if (res.ok) {
        setTimeout(() => {
          router.push('/client-dashboard');
        }, 300);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Registration failed.');
        setSubmitting(false);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Network error registering account.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#09090b]">
        <div className="text-zinc-500 text-xs flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border border-t-transparent border-zinc-400" />
          <span>Verifying client invitation link...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#09090b] px-4">
      <div className="absolute inset-0 bg-radial-[circle_at_center,rgba(255,255,255,0.015)_0%,transparent_70%]" />

      <Card className="relative z-10 w-full max-w-md bg-[#0d0e12] border-zinc-800 p-2 shadow-2xl font-sans text-xs">
        <CardHeader className="text-center pt-8 pb-6 flex flex-col items-center">
          <img src="/iris-logo-black-bg.png" alt="Iris OS Logo" className="h-10 object-contain mb-4" />
          <CardTitle className="text-xl font-bold tracking-tight text-white silver-text-gradient">
            Set Up Your Account
          </CardTitle>
          <CardDescription className="text-xs text-zinc-500 mt-1">
            {inviteData ? `Access portal for ${inviteData.client?.name}` : 'Enterprise Client Activation Hub'}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-8 space-y-6">
          {errorMsg ? (
            <div className="rounded border border-rose-900/30 bg-rose-950/20 p-4 space-y-3">
              <div className="flex gap-2.5 text-rose-400 items-start">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="font-semibold leading-normal">{errorMsg}</span>
              </div>
              <Button
                variant="outline"
                className="w-full h-9 border-zinc-850 text-zinc-400 hover:text-white"
                onClick={() => router.push('/login')}
              >
                Go to Sign In
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-400 block">Workspace Email</label>
                <input
                  type="email"
                  value={inviteData?.email}
                  disabled
                  className="w-full rounded border border-zinc-850 bg-zinc-950/60 py-2.5 px-3 text-zinc-500 cursor-not-allowed font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-400 block">Full Name</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <User className="h-3.5 w-3.5 text-zinc-500" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full rounded border border-zinc-850 bg-zinc-900/40 py-2.5 pl-9 pr-3 text-white focus:border-zinc-750 focus:bg-zinc-900 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-400 block">Create Password</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-3.5 w-3.5 text-zinc-500" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Choose a strong password"
                    className="w-full rounded border border-zinc-850 bg-zinc-900/40 py-2.5 pl-9 pr-10 text-white focus:border-zinc-750 focus:bg-zinc-900 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 hover:text-white focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-10 font-bold text-xs flex items-center justify-center gap-1.5 bg-white text-zinc-950 hover:bg-zinc-250 cursor-pointer"
              >
                <span>{submitting ? 'Registering Account...' : 'Complete Registration'}</span>
                <ArrowRight className="h-4 w-4 text-zinc-950" />
              </Button>
            </form>
          )}

          <div className="rounded-lg border border-zinc-850 bg-zinc-900/10 p-4 space-y-2 flex items-start gap-3">
            <div className="h-6 w-6 rounded bg-zinc-850 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div>
              <span className="block font-semibold text-zinc-300">Invite-Only Access Gate</span>
              <span className="block text-[10px] text-zinc-500 mt-1 leading-normal">
                This account is created strictly under invite authorization and will be linked directly to your business profile for secure agency operations.
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function InvitePage() {
  return (
    <React.Suspense fallback={
      <div className="flex h-screen w-screen items-center justify-center bg-[#09090b]">
        <div className="text-zinc-500 text-xs flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border border-t-transparent border-zinc-400" />
          <span>Loading client invitation...</span>
        </div>
      </div>
    }>
      <InvitePageContent />
    </React.Suspense>
  );
}
