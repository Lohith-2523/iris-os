/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4 */
'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Eye, EyeOff, Lock, User } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import styles from '@/components/auth/auth-shell.module.css';
import { createClient } from '@/lib/client';
import { isIrisAdminEmail } from '@/admin/policy';

const authErrors: Record<string, string> = {
  access_denied: 'This account does not have an active superadmin invitation.',
  admin_access_denied: 'Google Workspace access is limited to invited irisos.app accounts.',
  oauth_exchange_failed: 'Google Workspace sign-in could not be completed. Try again.',
  missing_email: 'Google did not return an email address for this account.',
};

export default function AdminLoginPage() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    const error = new URLSearchParams(window.location.search).get('auth_error');
    if (error) setErrorMsg(authErrors[error] || 'Superadmin authentication could not be completed.');
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!isIrisAdminEmail(normalizedEmail)) {
      setErrorMsg('Use your irisos.app email address.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await createClient().auth.signInWithPassword({ email: normalizedEmail, password });
      if (error) throw error;
      window.location.assign('/admin');
    } catch {
      setErrorMsg('Unable to sign in. Check your credentials and invitation.');
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const callback = new URL('/auth/callback', window.location.origin);
      callback.searchParams.set('next', '/admin');
      const { error } = await createClient().auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: callback.toString(), queryParams: { hd: 'irisos.app' } },
      });
      if (error) throw error;
    } catch {
      setErrorMsg('Google Workspace sign-in could not be started.');
      setIsLoading(false);
    }
  };

  return (
    <AuthShell title="Superadmin sign in" description="Use an invited Iris OS account to enter the administration workspace." appearance="dark">
      <div className={styles.content}>
        {errorMsg && <div className={styles.error} role="alert">{errorMsg}</div>}
        <form onSubmit={handleLogin} className={styles.form} aria-busy={isLoading}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="admin-login-email">Iris OS email</label>
            <div className={styles.inputWrap}>
              <User className={styles.inputIcon} aria-hidden="true" />
              <input id="admin-login-email" type="email" placeholder="name@irisos.app" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" pattern="[^@]+@irisos\.app" disabled={isLoading} required className={styles.input} />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="admin-login-password">Password</label>
            <div className={styles.inputWrap}>
              <Lock className={styles.inputIcon} aria-hidden="true" />
              <input id="admin-login-password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" disabled={isLoading} required className={`${styles.input} ${styles.passwordInput}`} />
              <button type="button" onClick={() => setShowPassword((value) => !value)} disabled={isLoading} className={styles.iconButton} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Link href="/admin/forgot-password" prefetch={false} className={styles.forgotPasswordLink}>Forgot password?</Link>
          </div>
          <button type="submit" disabled={isLoading} className={styles.primaryButton}>
            <span>{isLoading ? 'Authenticating…' : 'Sign in to administration'}</span>
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
          <span>Google Workspace SSO</span>
        </button>
        <p className={styles.footer}>Access is restricted to invited, verified <strong>irisos.app</strong> accounts.</p>
      </div>
    </AuthShell>
  );
}
