'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { RECAPTCHA_CONTACT_ACTION } from '@/config/recaptcha';
import styles from './contact-form.module.css';

type RecaptchaEnterpriseApi = {
  reset?: () => void;
};

declare global {
  interface Window {
    grecaptcha?: { enterprise?: RecaptchaEnterpriseApi };
    irisContactRecaptchaVerified?: (token: string) => void;
    irisContactRecaptchaExpired?: () => void;
    irisContactRecaptchaError?: () => void;
  }
}

type SubmissionState = 'IDLE' | 'VERIFYING' | 'SENDING' | 'SENT' | 'ERROR';

export function ContactForm({ siteKey }: { siteKey: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const requestIdRef = useRef<string>(crypto.randomUUID());
  const [state, setState] = useState<SubmissionState>('IDLE');
  const [message, setMessage] = useState('');
  const [captchaRequested, setCaptchaRequested] = useState(false);

  const resetCaptcha = useCallback(() => {
    if (typeof window.grecaptcha?.enterprise?.reset === 'function') {
      window.grecaptcha.enterprise.reset();
    }
  }, []);

  const submitVerified = useCallback(async (recaptchaToken: string) => {
    const form = formRef.current;
    if (!form) return;
    setState('SENDING');
    setMessage('Securely delivering your message…');
    const fields = new FormData(form);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: requestIdRef.current,
          name: fields.get('name'),
          email: fields.get('email'),
          company: fields.get('company'),
          topic: fields.get('topic'),
          subject: fields.get('subject'),
          message: fields.get('message'),
          website: fields.get('website'),
          recaptchaToken,
        }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || 'Your message could not be delivered.');
      form.reset();
      requestIdRef.current = crypto.randomUUID();
      setState('SENT');
      setMessage('Response sent. Thank you—your message is on its way to the IrisOS team.');
    } catch (error) {
      setState('ERROR');
      setMessage(error instanceof Error ? error.message : 'Your message could not be delivered.');
    } finally {
      resetCaptcha();
    }
  }, [resetCaptcha]);

  useEffect(() => {
    window.irisContactRecaptchaVerified = token => void submitVerified(token);
    window.irisContactRecaptchaExpired = () => {
      setState('ERROR');
      setMessage('Verification expired. Please submit the form again.');
      resetCaptcha();
    };
    window.irisContactRecaptchaError = () => {
      setState('ERROR');
      setMessage('Verification could not start. Check your connection and try again.');
    };
    return () => {
      delete window.irisContactRecaptchaVerified;
      delete window.irisContactRecaptchaExpired;
      delete window.irisContactRecaptchaError;
    };
  }, [resetCaptcha, submitVerified]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!siteKey) {
      setState('ERROR');
      setMessage('Contact verification is temporarily unavailable. Please email contact@irisos.app directly.');
      return;
    }
    if (captchaRequested) resetCaptcha();
    setCaptchaRequested(true);
    setState('VERIFYING');
    setMessage('Loading secure verification…');
  };

  const busy = state === 'VERIFYING' || state === 'SENDING';
  return <>
    {siteKey && captchaRequested && <Script
      id="iris-contact-recaptcha-enterprise"
      src="https://www.google.com/recaptcha/enterprise.js"
      strategy="afterInteractive"
      onError={() => {
        setState('ERROR');
        setMessage('Verification could not load. Please email contact@irisos.app directly.');
      }}
    />}
    <form ref={formRef} className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.formHeader}>
        <span>CONTACT US</span>
        <ShieldCheck aria-hidden="true" />
      </div>
      <div className={styles.twoColumns}>
        <label>
          <span>Name</span>
          <input name="name" autoComplete="name" minLength={2} maxLength={120} required />
        </label>
        <label>
          <span>Work email</span>
          <input name="email" type="email" autoComplete="email" maxLength={320} required />
        </label>
      </div>
      <div className={styles.twoColumns}>
        <label>
          <span>Company <small>Optional</small></span>
          <input name="company" autoComplete="organization" maxLength={160} />
        </label>
        <label>
          <span>Topic</span>
          <select name="topic" defaultValue="GENERAL" required>
            <option value="GENERAL">General inquiry</option>
            <option value="SALES">Sales</option>
            <option value="PARTNERSHIP">Partnership</option>
            <option value="SUPPORT">Product support</option>
            <option value="PRESS">Press</option>
          </select>
        </label>
      </div>
      <label>
        <span>Subject</span>
        <input name="subject" minLength={3} maxLength={160} required />
      </label>
      <label>
        <span>How can we help?</span>
        <textarea name="message" minLength={10} maxLength={8_000} rows={7} required />
      </label>
      <label className={styles.honeypot} aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <div className={styles.formFooter}>
        <button type="submit" disabled={busy}>
          {busy ? message : 'Send message'}
          {!busy && <ArrowRight aria-hidden="true" />}
        </button>
      </div>
      {message && <p className={`${styles.status} ${state === 'ERROR' ? styles.error : ''}`} role={state === 'ERROR' ? 'alert' : 'status'}>
        {state === 'SENT' && <Check aria-hidden="true" />}{message}
      </p>}
    </form>
    <div className={`${styles.verificationBackdrop} ${state === 'VERIFYING' ? styles.verificationOpen : ''}`} role="dialog" aria-modal="true" aria-hidden={state !== 'VERIFYING'} aria-labelledby="contact-verification-title">
      <div className={styles.verificationModal}>
        <span><ShieldCheck aria-hidden="true" /> SECURE VERIFICATION</span>
        <h2 id="contact-verification-title">Confirming you’re human</h2>
        <p>Complete Google’s verification below. A visual challenge may appear depending on its security assessment.</p>
        <div
          className={`${styles.recaptchaWidget}${captchaRequested ? ' g-recaptcha' : ''}`}
          data-sitekey={captchaRequested ? siteKey : undefined}
          data-action={captchaRequested ? RECAPTCHA_CONTACT_ACTION : undefined}
          data-theme="dark"
          data-callback="irisContactRecaptchaVerified"
          data-expired-callback="irisContactRecaptchaExpired"
          data-error-callback="irisContactRecaptchaError"
        />
        <button className={styles.cancelVerification} type="button" onClick={() => { resetCaptcha(); setState('IDLE'); setMessage(''); }}>Cancel</button>
      </div>
    </div>
  </>;
}
