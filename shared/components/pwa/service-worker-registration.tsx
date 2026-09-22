'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, Download, X } from 'lucide-react';

const INSTALL_PROMPT_DISMISSED = 'iris-os:pwa-install-dismissed';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export function ServiceWorkerRegistration() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;

    const register = () => {
      void navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      }).catch((error: unknown) => {
        console.error('Iris OS service worker registration failed:', error);
      });
    };

    if (document.readyState === 'complete') {
      register();
      return;
    }

    window.addEventListener('load', register, { once: true });
    return () => window.removeEventListener('load', register);
  }, []);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    if (standalone || sessionStorage.getItem(INSTALL_PROMPT_DISMISSED) === 'true') return;

    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const hideInstalledPrompt = () => setInstallPrompt(null);

    window.addEventListener('beforeinstallprompt', captureInstallPrompt);
    window.addEventListener('appinstalled', hideInstalledPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', captureInstallPrompt);
      window.removeEventListener('appinstalled', hideInstalledPrompt);
    };
  }, []);

  if (!installPrompt) return null;

  const dismiss = () => {
    sessionStorage.setItem(INSTALL_PROMPT_DISMISSED, 'true');
    setInstallPrompt(null);
  };

  const install = async () => {
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'dismissed') sessionStorage.setItem(INSTALL_PROMPT_DISMISSED, 'true');
    setInstallPrompt(null);
  };

  return (
    <aside
      aria-labelledby="pwa-install-title"
      aria-describedby="pwa-install-description"
      aria-modal="true"
      className="fixed inset-0 z-[150] bg-zinc-950/75 backdrop-grayscale"
      data-testid="pwa-install-overlay"
      role="dialog"
    >
      <div className="absolute left-4 right-4 top-14 mx-auto max-w-md rounded-xl border border-zinc-700/80 bg-zinc-950/95 p-4 text-white shadow-2xl shadow-black/50 backdrop-blur-xl sm:left-auto sm:right-6 sm:top-10 sm:mx-0">
        <div className="pointer-events-none absolute -top-10 right-5 flex items-center gap-1.5 text-xs font-semibold text-zinc-200" aria-hidden="true">
          <span>Browser install button</span><ArrowUpRight className="h-7 w-7" strokeWidth={1.7} />
        </div>
        <button
          aria-label="Dismiss app install prompt"
          className="absolute right-3 top-3 rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          onClick={dismiss}
          type="button"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
        <div className="flex gap-3 pr-7">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900">
            <Download aria-hidden="true" className="h-5 w-5 text-zinc-200" />
          </div>
          <div>
            <h2 className="text-sm font-semibold" id="pwa-install-title">Install Iris OS</h2>
            <p className="mt-1 text-xs leading-5 text-zinc-400" id="pwa-install-description">
              Install from here, or use Chrome&apos;s Install App button in the browser bar above.
            </p>
          </div>
        </div>
        <button
          className="mt-4 h-9 w-full rounded-md bg-white px-4 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          onClick={() => void install()}
          type="button"
        >
          Quick install
        </button>
      </div>
    </aside>
  );
}
