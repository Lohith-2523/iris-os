'use client';

import * as React from 'react';
import Link from 'next/link';
import { User, Lock, ArrowRight, Eye, EyeOff, Mail } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { CountryPhoneInput } from '@/components/ui/country-phone-input';
import styles from '@/components/auth/auth-shell.module.css';
import { passwordConfirmationError } from '@/lib/password-validation';
import { signupEmailSchema } from '@/lib/signup-validation';

export default function SignupPage() {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmation, setShowConfirmation] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [confirmationEmail, setConfirmationEmail] = React.useState('');
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const parsedEmail = signupEmailSchema.safeParse(email);
    if (!parsedEmail.success) { setErrorMsg(parsedEmail.error.issues[0].message); return; }
    if (!name || !email || !phone || !password) {
      setErrorMsg('Please fill in all fields.');
      return;
    }
    const confirmationError = passwordConfirmationError(password, confirmPassword);
    if (confirmationError) {
      setErrorMsg(confirmationError);
      return;
    }
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email: parsedEmail.data, phone, password, confirmPassword }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to create your workspace.');
      if (!result.confirmationRequired) {
        const bootstrap = await fetch('/api/auth/bootstrap?intent=workspace-signup', { method: 'POST' });
        if (!bootstrap.ok) {
          const payload = await bootstrap.json().catch(() => ({}));
          throw new Error(payload.error || 'Unable to load your workspace.');
        }
        window.location.replace('/onboarding');
        return;
      }
      setConfirmationEmail(parsedEmail.data);
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Unable to create your workspace.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    try {
      const { createClient } = await import('@/lib/client');
      const supabase = createClient();
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
      if (signOutError) throw signOutError;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Google sign-up failed.');
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your workspace"
      description="Set up the operating system for your agency, studio, or consulting team."
      appearance="dark"
    >
      <div className={styles.content}>
        {errorMsg && <div className={styles.error} role="alert">{errorMsg}</div>}

        {confirmationEmail && <div className={styles.success} role="status"><strong>Check your inbox</strong><p>We sent a confirmation link to {confirmationEmail}. Confirm your email to activate your workspace. If you already have an account, sign in below.</p><button type="button" className={styles.footerLink} onClick={() => setConfirmationEmail('')}>Use a different email</button></div>}
        {!confirmationEmail && <form onSubmit={handleSignup} className={styles.form} aria-busy={isLoading}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="signup-name">Full name</label>
            <div className={styles.inputWrap}>
              <User className={styles.inputIcon} aria-hidden="true" />
              <input id="signup-name" type="text" required placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={styles.input} />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="signup-email">Workspace email</label>
            <div className={styles.inputWrap}>
              <Mail className={styles.inputIcon} aria-hidden="true" />
              <input id="signup-email" type="email" required maxLength={254} aria-describedby="signup-email-help" placeholder="name@agency.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={styles.input} />
            </div>
          </div>

          <p id="signup-email-help" className={styles.description}>Use an inbox you can access for account recovery and workspace notifications.</p>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="signup-phone">Phone number</label>
            <CountryPhoneInput id="signup-phone" required value={phone} onChange={setPhone} placeholder="Phone number" className={styles.input} />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="signup-password">Password</label>
            <div className={styles.inputWrap}>
              <Lock className={styles.inputIcon} aria-hidden="true" />
              <input id="signup-password" type={showPassword ? 'text' : 'password'} required placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className={`${styles.input} ${styles.passwordInput}`} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className={styles.iconButton} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="signup-confirm-password">Confirm password</label>
            <div className={styles.inputWrap}>
              <Lock className={styles.inputIcon} aria-hidden="true" />
              <input id="signup-confirm-password" type={showConfirmation ? 'text' : 'password'} required placeholder="Enter your password again" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" aria-invalid={Boolean(confirmPassword && password !== confirmPassword)} className={`${styles.input} ${styles.passwordInput}`} />
              <button type="button" onClick={() => setShowConfirmation(!showConfirmation)} className={styles.iconButton} aria-label={showConfirmation ? 'Hide confirmation password' : 'Show confirmation password'}>
                {showConfirmation ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={isLoading} className={styles.primaryButton}>
            <span>{isLoading ? 'Creating workspace…' : 'Create workspace'}</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>}

        <div className={styles.divider}><span>or</span></div>

        <button type="button" onClick={handleGoogleSignup} disabled={isLoading} className={styles.googleButton}>
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path className={styles.googleBlue} d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path className={styles.googleGreen} d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path className={styles.googleYellow} d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path className={styles.googleRed} d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>Continue with Google</span>
        </button>

        <p className={styles.footer}>
          Already have an account?{' '}
          <Link href="/login" prefetch={false} className={styles.footerLink}>Sign in</Link>
        </p>
      </div>
    </AuthShell>
  );
}
