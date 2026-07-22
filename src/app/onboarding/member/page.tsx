'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Lock,
  Mail,
  User,
  Phone,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles
} from 'lucide-react';
import { formatUserMessage } from '@/lib/utils';
import { createClient } from '@/lib/client';

function MemberOnboardingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [loading, setLoading] = React.useState(true);
  const [invite, setInvite] = React.useState<any>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Form password details
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  // Load invite information
  React.useEffect(() => {
    async function loadInvite() {
      if (!token) {
        setErrorMsg('Invalid request: Missing secure onboarding token.');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/member?token=${token}`);
        if (!res.ok) {
          const err = await res.json();
          setErrorMsg(err.error || 'Failed to locate member onboarding details.');
        } else {
          const data = await res.json();
          setInvite(data);
        }
      } catch (e) {
        console.error(e);
        setErrorMsg('Network error validating onboarding credentials.');
      } finally {
        setLoading(false);
      }
    }
    loadInvite();
  }, [token]);

  // Complete onboarding
  const handleOnboardSubmit = async (e: React.FormEvent, useGoogle = false) => {
    if (e) e.preventDefault();
    setFormError(null);

    if (!useGoogle && (!password || password.length < 6)) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }

    if (!useGoogle && password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createClient();
      if (useGoogle) {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(`/onboarding/member?token=${token}`)}` },
        });
        if (error) throw error;
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: invite.email,
        password,
        options: { data: { name: invite.name, role: 'member' } },
      });
      if (signUpError && !signUpError.message.toLowerCase().includes('already registered')) throw signUpError;
      if (!data.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: invite.email, password });
        if (signInError) throw signInError;
      }

      const res = await fetch('/api/member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete_onboarding',
          token,
          password: useGoogle ? 'GOOGLE_OAUTH_LINKED' : password,
          useGoogle
        })
      });

      if (res.ok) {
        setSuccess(true);
        
        setTimeout(() => {
          router.push('/teams-dashboard');
        }, 1500);
      } else {
        const err = await res.json();
        setFormError(err.error || 'Failed to complete onboarding configuration.');
      }
    } catch (e) {
      console.error(e);
      setFormError('Network communication timeout.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-zinc-550 font-sans text-xs">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Synchronizing onboarding credentials...</span>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center font-sans text-xs">
        <div className="max-w-sm border border-zinc-900 bg-zinc-950/20 p-6 space-y-4">
          <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Onboarding Link Invalid</h2>
          <p className="text-zinc-500 leading-relaxed">{errorMsg}</p>
          <Button onClick={() => router.push('/login')} className="w-full bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-semibold rounded-none">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center font-sans text-xs">
        <div className="max-w-sm border border-zinc-900 bg-zinc-950/20 p-6 space-y-4">
          <CheckCircle2 className="h-8 w-8 text-emerald-450 mx-auto animate-bounce" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Account Activated</h2>
          <p className="text-zinc-500 leading-relaxed">
            Welcome aboard, {invite?.name}! Your Iris OS team specialist workspace is active. Redirecting to workspace...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center items-center p-4 font-sans text-xs text-left">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header brand */}
        <div className="text-center space-y-2 flex flex-col items-center">
          <img src="/iris-logo-black-bg.png" alt="Iris OS Logo" className="h-8 object-contain" />
          <h1 className="text-xl font-bold text-white tracking-tight mt-1">Specialist Onboarding Hub</h1>
          <p className="text-zinc-555 text-[11px]">Configure credentials to unlock your delivery terminal.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-5 items-stretch">
          
          {/* Profile details summary card */}
          <div className="md:col-span-2">
            <Card className="h-full bg-zinc-950/30 border-zinc-900/60 p-4 space-y-4 flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest font-mono block mb-2">Assigned Specialist Profile</span>
                <h3 className="text-sm font-bold text-white truncate">{invite.name}</h3>
                
                <div className="space-y-2 mt-4 text-[10.5px] text-zinc-405">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-zinc-650 shrink-0" />
                    <span className="truncate">{invite.email}</span>
                  </div>
                  {invite.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-zinc-650 shrink-0" />
                      <span>{invite.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-zinc-905 pt-4 space-y-2">
                <span className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest font-mono block">Agency Disciplines</span>
                <div className="flex flex-wrap gap-1">
                  {invite.agencyTypes.map((type: string, idx: number) => (
                    <Badge key={idx} variant="secondary" className="text-[8.5px] uppercase tracking-wider bg-zinc-900 text-zinc-300 font-mono">
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Form setup credentials */}
          <div className="md:col-span-3">
            <Card className="bg-zinc-950/50 border-zinc-800 p-5 space-y-4">
              <span className="text-[9px] font-bold text-violet-400 uppercase tracking-widest font-mono block">Setup Access Credentials</span>

              {formError && (
                <div className="bg-rose-950/20 border border-rose-900/40 p-2.5 rounded text-rose-450 text-[10.5px] flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Set Password Option */}
              <form onSubmit={(e) => handleOnboardSubmit(e, false)} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Workspace Password</label>
                  <input
                    type="password"
                    required
                    disabled={submitting}
                    placeholder="Enter password (min 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-xs bg-zinc-900 border border-zinc-800 p-2.5 text-white outline-none rounded focus:border-zinc-700 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Confirm Password</label>
                  <input
                    type="password"
                    required
                    disabled={submitting}
                    placeholder="Retype password to confirm"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full text-xs bg-zinc-900 border border-zinc-800 p-2.5 text-white outline-none rounded focus:border-zinc-700 font-mono"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-white hover:bg-zinc-200 text-zinc-950 h-9 font-semibold text-xs rounded transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Activate via Password</span>}
                </Button>
              </form>

              {/* OR divider */}
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-zinc-900"></div>
                <span className="flex-shrink mx-3 text-zinc-650 font-mono text-[9px] uppercase">OR LINK ACCOUNT</span>
                <div className="flex-grow border-t border-zinc-900"></div>
              </div>

              {/* Google OAuth Login option */}
              <Button
                type="button"
                onClick={() => handleOnboardSubmit(null as any, true)}
                disabled={submitting}
                className="w-full bg-zinc-900 hover:bg-zinc-850 text-white border border-zinc-800 h-9 font-semibold text-xs rounded transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                    </svg>
                    <span>Connect Google Single Sign-On</span>
                  </>
                )}
              </Button>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function MemberOnboardingPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500 font-sans text-xs">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Synchronizing onboarding credentials...</span>
        </div>
      </div>
    }>
      <MemberOnboardingContent />
    </React.Suspense>
  );
}
