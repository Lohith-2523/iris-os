'use client';

import * as React from 'react';
import Script from 'next/script';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import {
  RECAPTCHA_ENTERPRISE_SITE_KEY,
  type RecaptchaAction,
} from '@/config/recaptcha';
import styles from './auth-recaptcha.module.css';

type RecaptchaEnterpriseApi = {
  ready?: (callback: () => void) => void;
  render?: (container: HTMLElement, parameters: Record<string, unknown>) => number;
  reset?: (widgetId?: number) => void;
};

function recaptchaApi() {
  return (window as Window & {
    grecaptcha?: { enterprise?: RecaptchaEnterpriseApi };
  }).grecaptcha?.enterprise;
}

export function AuthRecaptcha({
  action,
  onTokenChange,
}: {
  action: RecaptchaAction;
  onTokenChange: (token: string | null) => void;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const widgetIdRef = React.useRef<number | null>(null);
  const renderRequestedRef = React.useRef(false);
  const [status, setStatus] = React.useState<'LOADING' | 'READY' | 'VERIFIED' | 'ERROR'>('LOADING');

  const renderWidget = React.useCallback(() => {
    const api = recaptchaApi();
    if (!api?.ready || !api.render || !containerRef.current || widgetIdRef.current !== null || renderRequestedRef.current) return;

    renderRequestedRef.current = true;
    api.ready(() => {
      if (!api.render || !containerRef.current || widgetIdRef.current !== null) return;
      try {
        widgetIdRef.current = api.render(containerRef.current, {
          sitekey: RECAPTCHA_ENTERPRISE_SITE_KEY,
          action,
          theme: 'dark',
          callback: (token: string) => {
            setStatus('VERIFIED');
            onTokenChange(token);
          },
          'expired-callback': () => {
            setStatus('READY');
            onTokenChange(null);
          },
          'error-callback': () => {
            setStatus('ERROR');
            onTokenChange(null);
          },
        });
        setStatus('READY');
      } catch {
        setStatus('ERROR');
        onTokenChange(null);
      }
    });
  }, [action, onTokenChange]);

  React.useEffect(() => {
    let attempts = 0;
    let timer: number | undefined;
    const attemptRender = () => {
      renderWidget();
      attempts += 1;
      if (!renderRequestedRef.current && attempts < 100) {
        timer = window.setTimeout(attemptRender, 100);
      } else if (!renderRequestedRef.current) {
        setStatus('ERROR');
      }
    };
    attemptRender();
    return () => window.clearTimeout(timer);
  }, [renderWidget]);

  React.useEffect(() => () => {
    if (widgetIdRef.current !== null) recaptchaApi()?.reset?.(widgetIdRef.current);
    onTokenChange(null);
  }, [onTokenChange]);

  return (
    <section className={styles.panel} aria-label="Human verification">
      <Script
        id="iris-auth-recaptcha-enterprise"
        src="https://www.google.com/recaptcha/enterprise.js?render=explicit"
        strategy="afterInteractive"
        onLoad={renderWidget}
        onReady={renderWidget}
        onError={() => {
          setStatus('ERROR');
          onTokenChange(null);
        }}
      />
      <div className={styles.heading}>
        <span><ShieldCheck aria-hidden="true" /> Security check</span>
        {status === 'VERIFIED' && (
          <span className={styles.verified}><CheckCircle2 aria-hidden="true" /> Verified</span>
        )}
      </div>
      <div ref={containerRef} className={styles.widget} />
      <p className={status === 'ERROR' ? styles.error : styles.status} aria-live="polite">
        {status === 'LOADING' && 'Loading Google verification…'}
        {status === 'READY' && 'Complete the check above to continue.'}
        {status === 'VERIFIED' && 'Verification complete. You can continue.'}
        {status === 'ERROR' && 'Verification could not load. Refresh the page and try again.'}
      </p>
    </section>
  );
}
