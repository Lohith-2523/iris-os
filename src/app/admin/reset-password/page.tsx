/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4 */
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, Lock } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import styles from '@/components/auth/auth-shell.module.css';
import { passwordConfirmationError } from '@/lib/password-validation';

export default function AdminResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = React.useState('');
  const [confirmation, setConfirmation] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmation, setShowConfirmation] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = passwordConfirmationError(password, confirmation);
    if (validationError) { setErrorMsg(validationError); return; }
    setIsLoading(true); setErrorMsg(null);
    try {
      const response = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password, confirmPassword: confirmation }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Unable to reset your password.');
      router.replace('/admin/login');
      router.refresh();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Unable to reset your password.');
      setIsLoading(false);
    }
  };

  return (
    <AuthShell title="Choose a new password" description="Create a new password for your IrisOS superadmin account.">
      <div className={styles.content}>
        {errorMsg && <div className={styles.error} role="alert">{errorMsg}</div>}
        <form onSubmit={handleSubmit} className={styles.form} aria-busy={isLoading}>
          <PasswordField id="admin-reset-password" label="New password" value={password} setValue={setPassword} visible={showPassword} setVisible={setShowPassword} disabled={isLoading} />
          <PasswordField id="admin-reset-confirmation" label="Confirm password" value={confirmation} setValue={setConfirmation} visible={showConfirmation} setVisible={setShowConfirmation} disabled={isLoading} />
          <button type="submit" disabled={isLoading} className={styles.primaryButton}><span>{isLoading ? 'Updating password…' : 'Update password'}</span><ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
        </form>
      </div>
    </AuthShell>
  );
}

function PasswordField({ id, label, value, setValue, visible, setVisible, disabled }: { id: string; label: string; value: string; setValue: (value: string) => void; visible: boolean; setVisible: (value: boolean) => void; disabled: boolean }) {
  return <div className={styles.field}><label className={styles.label} htmlFor={id}>{label}</label><div className={styles.inputWrap}><Lock className={styles.inputIcon} aria-hidden="true" /><input id={id} type={visible ? 'text' : 'password'} placeholder={label} value={value} onChange={(event) => setValue(event.target.value)} autoComplete="new-password" minLength={6} disabled={disabled} required className={`${styles.input} ${styles.passwordInput}`} /><button type="button" onClick={() => setVisible(!visible)} disabled={disabled} className={styles.iconButton} aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}>{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>;
}
