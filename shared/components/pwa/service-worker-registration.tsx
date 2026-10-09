'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Download, Monitor, X } from 'lucide-react';

const INSTALL_AVAILABLE_EVENT = 'iris-os:pwa-install-available';
const SHOW_INSTALL_PROMPT_EVENT = 'iris-os:show-install-prompt';
const LANDING_VISIT_COUNT_KEY = 'iris-os:landing-visit-count';
const AUTO_PROMPT_DISABLED_KEY = 'iris-os:pwa-auto-prompt-disabled';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function publishInstallAvailability(available: boolean) {
  document.documentElement.dataset.pwaInstallAvailable = String(available);
  window.dispatchEvent(new CustomEvent(INSTALL_AVAILABLE_EVENT, { detail: { available } }));
}

export function ServiceWorkerRegistration() {
  const pathname = usePathname();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const landingVisitRecorded = useRef(false);
  const autoPromptAllowed = useRef(false);

  useEffect(() => {
    if (pathname !== '/') {
      landingVisitRecorded.current = false;
      autoPromptAllowed.current = false;
      setIsOpen(false);
      return;
    }
    if (landingVisitRecorded.current) return;

    landingVisitRecorded.current = true;
    try {
      const visits = Number.parseInt(window.localStorage.getItem(LANDING_VISIT_COUNT_KEY) || '0', 10);
      const nextVisits = Number.isFinite(visits) ? visits + 1 : 1;
      window.localStorage.setItem(LANDING_VISIT_COUNT_KEY, String(nextVisits));
      autoPromptAllowed.current = nextVisits >= 2 && window.localStorage.getItem(AUTO_PROMPT_DISABLED_KEY) !== 'true';
    } catch {
      autoPromptAllowed.current = false;
    }

    if (installPrompt && autoPromptAllowed.current) setIsOpen(true);
  }, [installPrompt, pathname]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;

    const register = () => {
      void navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      }).catch((error: unknown) => {
        console.error('IrisOS service worker registration failed:', error);
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
    if (standalone) {
      publishInstallAvailability(false);
      return;
    }
    const desktop = window.matchMedia('(min-width: 768px)');

    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (!desktop.matches) {
        setInstallPrompt(null);
        publishInstallAvailability(false);
        return;
      }
      setInstallPrompt(event as BeforeInstallPromptEvent);
      if (pathname === '/' && autoPromptAllowed.current) setIsOpen(true);
      publishInstallAvailability(true);
    };
    const showInstallPrompt = () => {
      if (desktop.matches && pathname === '/') setIsOpen(true);
    };
    const hideInstalledPrompt = () => {
      setInstallPrompt(null);
      setIsOpen(false);
      publishInstallAvailability(false);
    };
    const enforceDesktopInstall = (event: MediaQueryListEvent) => {
      if (!event.matches) hideInstalledPrompt();
    };

    window.addEventListener('beforeinstallprompt', captureInstallPrompt);
    window.addEventListener('appinstalled', hideInstalledPrompt);
    window.addEventListener(SHOW_INSTALL_PROMPT_EVENT, showInstallPrompt);
    desktop.addEventListener('change', enforceDesktopInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', captureInstallPrompt);
      window.removeEventListener('appinstalled', hideInstalledPrompt);
      window.removeEventListener(SHOW_INSTALL_PROMPT_EVENT, showInstallPrompt);
      desktop.removeEventListener('change', enforceDesktopInstall);
    };
  }, [pathname]);

  if (pathname !== '/' || !installPrompt || !isOpen) return null;

  const dismiss = () => {
    setIsOpen(false);
  };

  const disableAutomaticPrompt = () => {
    try {
      window.localStorage.setItem(AUTO_PROMPT_DISABLED_KEY, 'true');
    } catch {
      // The manual Download App entry point remains available if storage is unavailable.
    }
    autoPromptAllowed.current = false;
    setIsOpen(false);
  };

  const install = async () => {
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      setIsOpen(false);
      if (choice.outcome === 'accepted') {
        setInstallPrompt(null);
        publishInstallAvailability(false);
      }
    } catch {
      setIsOpen(false);
    }
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
      <div className="absolute left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-700/80 bg-zinc-950/95 p-4 text-white shadow-2xl shadow-black/50 backdrop-blur-xl">
        <button
          aria-label="Dismiss app install prompt"
          className="absolute right-3 top-3 rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          onClick={dismiss}
          type="button"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
        <div className="flex gap-3 pr-7">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900">
            <Monitor aria-hidden="true" className="h-6 w-6 text-zinc-200" />
            <Download aria-hidden="true" className="absolute h-2.5 w-2.5 text-zinc-950" strokeWidth={3} />
          </div>
          <div>
            <h2 className="text-sm font-semibold" id="pwa-install-title">Install the IrisOS app</h2>
            <p className="mt-1 text-xs leading-5 text-zinc-400" id="pwa-install-description">
              Install the IrisOS app for free for a more seamless and uninterrupted user experience
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            className="h-9 rounded-md bg-white px-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            onClick={() => void install()}
            type="button"
          >
            Quick install
          </button>
          <button
            className="h-9 rounded-md border border-zinc-700 px-3 text-sm font-semibold text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
            onClick={disableAutomaticPrompt}
            type="button"
          >
            Don&apos;t ask again
          </button>
        </div>
      </div>
    </aside>
  );
}
