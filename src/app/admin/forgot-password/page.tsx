/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4 */
'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Mail } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import styles from '@/components/auth/auth-shell.module.css';
import { createClient } from '@/lib/client';
import { adminPasswordRecoveryRedirectUrl } from '@/lib/auth-routes';
import { isIrisAdminEmail } from '@/admin/policy';

export default function AdminForgotPasswordPage() {
  const [email, setEmail] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [isSent, setIsSent] = React.useState(false);

  React.useEffect(() => {
    if (new URLSearchParams(window.location.search).has('recovery_error')) setErrorMsg('This recovery link is invalid or has expired. Request a new one to continue.');
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!isIrisAdminEmail(normalizedEmail)) { setErrorMsg('Use your irisos.app email address.'); return; }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await createClient().auth.resetPasswordForEmail(normalizedEmail, { redirectTo: adminPasswordRecoveryRedirectUrl(window.location.origin) });
      if (error) throw error;
      setIsSent(true);
    } catch {
      setErrorMsg('The reset email could not be sent. Check the authentication email configuration and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell title="Reset superadmin password" description="Request a secure password reset link for your invited IrisOS account.">
      <div className={styles.content}>
        {errorMsg && <div className={styles.error} role="alert">{errorMsg}</div>}
        {isSent ? <div className={styles.success} role="status">If an invited account exists for <strong>{email.trim()}</strong>, a reset link is on its way.</div> : (
          <form onSubmit={handleSubmit} className={styles.form} aria-busy={isLoading}>
            <div className={styles.field}><label className={styles.label} htmlFor="admin-forgot-email">IrisOS email</label><div className={styles.inputWrap}><Mail className={styles.inputIcon} aria-hidden="true" /><input id="admin-forgot-email" type="email" placeholder="name@irisos.app" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" pattern="[^@]+@irisos\.app" disabled={isLoading} required className={styles.input} /></div></div>
            <button type="submit" disabled={isLoading} className={styles.primaryButton}><span>{isLoading ? 'Sending reset link…' : 'Send reset link'}</span><ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
          </form>
        )}
        <p className={styles.footer}>Remember your password?{' '}<Link href="/admin/login" prefetch={false} className={styles.footerLink}>Return to superadmin sign in</Link></p>
      </div>
    </AuthShell>
  );
}
