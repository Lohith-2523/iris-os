'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Eye, EyeOff, Lock } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import styles from '@/components/auth/auth-shell.module.css';
import { passwordConfirmationError } from '@/lib/password-validation';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmation, setShowConfirmation] = React.useState(false);
  const [isCheckingSession, setIsCheckingSession] = React.useState(true);
  const [hasRecoverySession, setHasRecoverySession] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    void import('@/lib/client').then(({ createClient }) => createClient().auth.getUser())
      .then(({ data, error }) => {
        if (!active) return;
        setHasRecoverySession(!error && Boolean(data.user));
      })
      .catch(() => {
        if (active) setHasRecoverySession(false);
      })
      .finally(() => {
        if (active) setIsCheckingSession(false);
      });
    return () => { active = false; };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const confirmationError = passwordConfirmationError(password, confirmPassword);
    if (confirmationError) {
      setErrorMsg(confirmationError);
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { createClient } = await import('@/lib/client');
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      router.replace('/login');
      router.refresh();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Unable to reset your password.');
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      title="Choose a new password"
      description="Create a new password for your Iris OS account. You’ll sign in again after it is updated."
    >
      <div className={styles.content}>
        {errorMsg && <div className={styles.error} role="alert">{errorMsg}</div>}
        {isCheckingSession ? (
          <div className={styles.status} role="status">Validating your secure reset link…</div>
        ) : hasRecoverySession ? (
          <form onSubmit={handleSubmit} className={styles.form} aria-busy={isLoading}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="reset-password">New password</label>
              <div className={styles.inputWrap}>
                <Lock className={styles.inputIcon} aria-hidden="true" />
                <input
                  id="reset-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Enter a new password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  disabled={isLoading}
                  className={`${styles.input} ${styles.passwordInput}`}
                />
                <button type="button" onClick={() => setShowPassword((value) => !value)} disabled={isLoading} className={styles.iconButton} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="reset-confirm-password">Confirm password</label>
              <div className={styles.inputWrap}>
                <Lock className={styles.inputIcon} aria-hidden="true" />
                <input
                  id="reset-confirm-password"
                  type={showConfirmation ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Enter the new password again"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  disabled={isLoading}
                  aria-invalid={Boolean(confirmPassword && password !== confirmPassword)}
                  className={`${styles.input} ${styles.passwordInput}`}
                />
                <button type="button" onClick={() => setShowConfirmation((value) => !value)} disabled={isLoading} className={styles.iconButton} aria-label={showConfirmation ? 'Hide confirmation password' : 'Show confirmation password'}>
                  {showConfirmation ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading} className={styles.primaryButton}>
              <span>{isLoading ? 'Updating password…' : 'Update password'}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        ) : (
          <div className={styles.error} role="alert">
            This reset link is invalid or has expired. Request a new link to continue.
          </div>
        )}

        {!isCheckingSession && !hasRecoverySession && (
          <Link href="/forgot-password" prefetch={false} className={styles.secondaryButton}>Request a new reset link</Link>
        )}
      </div>
    </AuthShell>
  );
}
