'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Mail } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import styles from '@/components/auth/auth-shell.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [isSent, setIsSent] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const { createClient } = await import('@/lib/client');
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (error) throw error;
      setIsSent(true);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Unable to send the password reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      description="Enter your account email and we’ll send you a secure link to choose a new password."
    >
      <div className={styles.content}>
        {errorMsg && <div className={styles.error} role="alert">{errorMsg}</div>}
        {isSent ? (
          <div className={styles.success} role="status">
            If an account exists for <strong>{email.trim()}</strong>, a password reset link is on its way. Check your inbox and spam folder.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form} aria-busy={isLoading}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="forgot-password-email">Email address</label>
              <div className={styles.inputWrap}>
                <Mail className={styles.inputIcon} aria-hidden="true" />
                <input
                  id="forgot-password-email"
                  type="email"
                  required
                  placeholder="name@agency.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  disabled={isLoading}
                  className={styles.input}
                />
              </div>
            </div>

            <button type="submit" disabled={isLoading} className={styles.primaryButton}>
              <span>{isLoading ? 'Sending reset link…' : 'Send reset link'}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        )}

        <p className={styles.footer}>
          Remember your password?{' '}
          <Link href="/login" prefetch={false} className={styles.footerLink}>Return to sign in</Link>
        </p>
      </div>
    </AuthShell>
  );
}
