'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import styles from '@/components/auth/auth-shell.module.css';
import { teamMemberWorkspaceHome } from '@/lib/team-member-access';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const { createClient } = await import('@/lib/client');
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) throw error;
      const bootstrap = await fetch('/api/auth/bootstrap', { method: 'POST' });
      if (!bootstrap.ok) throw new Error('Unable to load your workspace.');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Authentication failed.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/user');
      if (res.ok) {
        const userData = await res.json();
        const role = userData.role?.toLowerCase() || 'admin';
        if (role === 'client') {
          setTimeout(() => {
            setIsLoading(false);
            router.push(teamMemberWorkspaceHome({ role, plan: userData.organization?.plan || 'BASIC' }));
          }, 100);
          return;
        } else if (role === 'member') {
          setTimeout(() => {
            setIsLoading(false);
            router.push('/teams-dashboard');
          }, 100);
          return;
        }
        if (userData.organization?.needsOnboarding) {
          setTimeout(() => {
            setIsLoading(false);
            router.push('/onboarding');
          }, 100);
          return;
        }
      }
    } catch (e) {
      console.error('Error fetching user role on login:', e);
    }

    setTimeout(() => {
      setIsLoading(false);
      router.push('/dashboard');
    }, 200);
  };
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const { createClient } = await import('@/lib/client');
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Google login failed.');
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      title="Sign in"
      description="Enter your Iris OS workspace and continue where your team left off."
      appearance="dark"
    >
      <div className={styles.content}>
        {errorMsg && <div className={styles.error} role="alert">{errorMsg}</div>}

        <form onSubmit={handleLogin} className={styles.form} aria-busy={isLoading}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="login-identity">Email address</label>
            <div className={styles.inputWrap}>
              <User className={styles.inputIcon} aria-hidden="true" />
              <input
                id="login-identity"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="login-password">Password</label>
            <div className={styles.inputWrap}>
              <Lock className={styles.inputIcon} aria-hidden="true" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className={`${styles.input} ${styles.passwordInput}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={styles.iconButton}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Link href="/forgot-password" prefetch={false} className={styles.forgotPasswordLink}>Forgot password?</Link>
          </div>

          <button type="submit" disabled={isLoading} className={styles.primaryButton}>
            <span>{isLoading ? 'Authenticating…' : 'Sign in to Iris OS'}</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>

        <div className={styles.divider}><span>or</span></div>

        <button type="button" onClick={handleGoogleLogin} disabled={isLoading} className={styles.googleButton}>
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path className={styles.googleBlue} d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path className={styles.googleGreen} d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path className={styles.googleYellow} d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path className={styles.googleRed} d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>Continue with Google</span>
        </button>

        <p className={styles.footer}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" prefetch={false} className={styles.footerLink}>Create a workspace</Link>
        </p>
      </div>
    </AuthShell>
  );
}
