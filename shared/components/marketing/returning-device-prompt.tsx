'use client';

import * as React from 'react';
import { ArrowRight, Home, Loader2 } from 'lucide-react';

type LandingChoice = 'LOGIN' | 'HOME';

export function ReturningDevicePrompt() {
  const [open, setOpen] = React.useState(false);
  const [rememberChoice, setRememberChoice] = React.useState(false);
  const [savingChoice, setSavingChoice] = React.useState<LandingChoice | null>(null);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/auth/device-access', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => response.ok ? response.json() : null)
      .then((device: { knownDevice?: boolean; directAccess?: boolean; landingPreference?: 'ASK' | LandingChoice } | null) => {
        if (!device?.knownDevice) return;
        if (device.directAccess) return;
        if (device.landingPreference === 'LOGIN') {
          window.location.replace('/login');
          return;
        }
        if (device.landingPreference !== 'HOME') setOpen(true);
      })
      .catch((requestError) => {
        if ((requestError as Error).name !== 'AbortError') console.error('Unable to check this browser device:', requestError);
      });
    return () => controller.abort();
  }, []);

  const choose = async (choice: LandingChoice) => {
    setError('');
    setSavingChoice(choice);

    if (rememberChoice) {
      try {
        const response = await fetch('/api/auth/device-access', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ landingPreference: choice }),
        });
        if (!response.ok) throw new Error('Unable to remember this choice. Please try again.');
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Unable to remember this choice. Please try again.');
        setSavingChoice(null);
        return;
      }
    }

    if (choice === 'LOGIN') {
      window.location.replace('/login');
      return;
    }
    setOpen(false);
    setSavingChoice(null);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="returning-device-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111] p-6 shadow-2xl sm:p-7">
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Recognized browser</p>
          <h2 id="returning-device-title" className="text-xl font-semibold leading-tight text-white">
            Welcome back to IrisOS
          </h2>
          <p className="text-sm leading-6 text-zinc-400">
            We can see you have logged in previously. Do you want to proceed to the login page?
          </p>
        </div>

        <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-xl border border-white/8 bg-white/[0.025] px-4 py-3 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={rememberChoice}
            onChange={(event) => setRememberChoice(event.target.checked)}
            className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 accent-white"
          />
          <span>Remember my choice</span>
        </label>

        {error && <p className="mt-3 text-xs text-rose-300" role="alert">{error}</p>}

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={savingChoice !== null}
            onClick={() => void choose('LOGIN')}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-200 disabled:cursor-wait disabled:opacity-60"
          >
            {savingChoice === 'LOGIN' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Continue to login page
          </button>
          <button
            type="button"
            disabled={savingChoice !== null}
            onClick={() => void choose('HOME')}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm font-semibold text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-white disabled:cursor-wait disabled:opacity-60"
          >
            {savingChoice === 'HOME' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Home className="h-4 w-4" />}
            Go to home page
          </button>
        </div>
      </div>
    </div>
  );
}
