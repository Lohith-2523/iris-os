'use client';

import { useCallback, useEffect } from 'react';
import Script from 'next/script';
import {
  META_SDK_ERROR_EVENT,
  META_SDK_READY_EVENT,
  type MetaSdkStatus,
} from '@/lib/meta-sdk-status';

type FacebookSdk = {
  init: (options: {
    appId: string;
    cookie: boolean;
    xfbml: boolean;
    version: string;
  }) => void;
  AppEvents?: {
    logPageView?: () => void;
  };
};

declare global {
  interface Window {
    FB?: FacebookSdk;
    __crystalMetaSdkInitialized?: boolean;
  }
}

type MetaSdkLoaderProps = {
  appId: string;
  apiVersion: string;
};

function publishStatus(status: MetaSdkStatus) {
  document.documentElement.dataset.metaSdkStatus = status;
  window.dispatchEvent(
    new Event(status === 'ready' ? META_SDK_READY_EVENT : META_SDK_ERROR_EVENT),
  );
}

export function MetaSdkLoader({ appId, apiVersion }: MetaSdkLoaderProps) {
  const initializeSdk = useCallback(() => {
    if (!window.FB) {
      publishStatus('error');
      return;
    }

    try {
      if (!window.__crystalMetaSdkInitialized) {
        window.FB.init({
          appId,
          cookie: true,
          xfbml: true,
          version: apiVersion,
        });
        window.__crystalMetaSdkInitialized = true;
        try {
          window.FB.AppEvents?.logPageView?.();
        } catch {
          // Analytics must not prevent Facebook Login from becoming available.
        }
      }

      publishStatus('ready');
    } catch {
      publishStatus('error');
    }
  }, [apiVersion, appId]);

  useEffect(() => {
    document.documentElement.dataset.metaSdkStatus = 'loading';

    const timeoutId = window.setTimeout(() => {
      if (!window.FB) {
        publishStatus('error');
      }
    }, 10_000);

    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <Script
      id="meta-facebook-sdk"
      src="https://connect.facebook.net/en_US/sdk.js"
      strategy="afterInteractive"
      onReady={initializeSdk}
      onError={() => publishStatus('error')}
    />
  );
}
