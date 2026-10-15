'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { RECAPTCHA_CONTACT_ACTION } from '@/config/recaptcha';
import styles from './contact-form.module.css';

type RecaptchaEnterpriseApi = {
  ready?: (callback: () => void) => void;
  render?: (container: HTMLElement, options: {
    sitekey: string;
    action: string;
    theme: 'dark';
    callback: (token: string) => void;
    'expired-callback': () => void;
    'error-callback': () => void;
  }) => number;
  reset?: (widgetId: number) => void;
};

declare global {
  interface Window {
    grecaptcha?: { enterprise?: RecaptchaEnterpriseApi };
  }
}

type SubmissionState = 'IDLE' | 'VERIFYING' | 'SENDING' | 'SENT' | 'ERROR';

export function ContactForm({ siteKey }: { siteKey: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const requestIdRef = useRef<string>(crypto.randomUUID());
  const [state, setState] = useState<SubmissionState>('IDLE');
  const [message, setMessage] = useState('');
  const [captchaRequested, setCaptchaRequested] = useState(false);
  const [recaptchaReady, setRecaptchaReady] = useState(false);

  const resetCaptcha = useCallback(() => {
    if (typeof window.grecaptcha?.enterprise?.reset === 'function' && widgetIdRef.current !== null) {
      window.grecaptcha.enterprise.reset(widgetIdRef.current);
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
    const render = window.grecaptcha?.enterprise?.render;
    if (state !== 'VERIFYING' || !siteKey || !recaptchaReady || !recaptchaRef.current || typeof render !== 'function' || widgetIdRef.current !== null) return;
    try {
      widgetIdRef.current = render(recaptchaRef.current, {
        sitekey: siteKey,
        action: RECAPTCHA_CONTACT_ACTION,
        theme: 'dark',
        callback: token => void submitVerified(token),
        'expired-callback': () => {
          setState('ERROR');
          setMessage('Verification expired. Please submit the form again.');
          resetCaptcha();
        },
        'error-callback': () => {
          setState('ERROR');
          setMessage('Verification could not start. Check your connection and try again.');
        },
      });
    } catch {
      setState('ERROR');
      setMessage('Verification could not start. Please try again or email contact@irisos.app directly.');
    }
  }, [recaptchaReady, resetCaptcha, siteKey, state, submitVerified]);

  const handleRecaptchaReady = useCallback(() => {
    const enterprise = window.grecaptcha?.enterprise;
    if (typeof enterprise?.ready !== 'function') {
      setState('ERROR');
      setMessage('Verification could not initialize. Please try again or email contact@irisos.app directly.');
      return;
    }
    enterprise.ready(() => {
      if (typeof window.grecaptcha?.enterprise?.render === 'function') {
        setRecaptchaReady(true);
      } else {
        setState('ERROR');
        setMessage('Verification could not initialize. Please try again or email contact@irisos.app directly.');
      }
    });
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!siteKey) {
      setState('ERROR');
      setMessage('Contact verification is temporarily unavailable. Please email contact@irisos.app directly.');
      return;
    }
    if (widgetIdRef.current !== null) resetCaptcha();
    setCaptchaRequested(true);
    setState('VERIFYING');
    setMessage('Loading secure verification…');
  };

  const busy = state === 'VERIFYING' || state === 'SENDING';
  return <>
    {siteKey && captchaRequested && <Script
      id="iris-contact-recaptcha-enterprise"
      src="https://www.google.com/recaptcha/enterprise.js?render=explicit"
      strategy="afterInteractive"
      onReady={handleRecaptchaReady}
      onError={() => {
        setState('ERROR');
        setMessage('Verification could not load. Please email contact@irisos.app directly.');
      }}
    />}
    <form ref={formRef} className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.formHeader}>
        <span>SECURE INQUIRY</span>
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
        <div className={styles.verification}>
          <span><ShieldCheck aria-hidden="true" /> Google reCAPTCHA Enterprise opens securely when you submit.</span>
        </div>
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
        <div className={styles.recaptchaWidget} ref={recaptchaRef} />
        <button className={styles.cancelVerification} type="button" onClick={() => { resetCaptcha(); setState('IDLE'); setMessage(''); }}>Cancel</button>
      </div>
    </div>
  </>;
}
