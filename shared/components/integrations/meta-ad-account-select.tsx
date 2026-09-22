'use client';

import * as React from 'react';
import {
  metaAdAccountLabel,
  type AssignableMetaAdAccount,
  type MetaAdAccountOptionsResponse,
} from '@/lib/meta-ad-account-shared';

type MetaAdAccountSelectProps = {
  id?: string;
  value: string;
  onChange: (accountId: string) => void;
  disabled?: boolean;
  className?: string;
};

export function MetaAdAccountSelect({
  id = 'meta-ad-account',
  value,
  onChange,
  disabled = false,
  className = '',
}: MetaAdAccountSelectProps) {
  const [accounts, setAccounts] = React.useState<AssignableMetaAdAccount[]>([]);
  const [connected, setConnected] = React.useState(false);
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>('loading');

  React.useEffect(() => {
    let active = true;

    const loadAccounts = async () => {
      try {
        const response = await globalThis.fetch('/api/meta-ad-accounts', {
          cache: 'no-store',
        });
        const payload = await response.json() as MetaAdAccountOptionsResponse & { error?: string };
        if (!response.ok) throw new Error(payload.error || 'Unable to load Meta ad accounts.');
        if (!active) return;

        setAccounts(payload.accounts);
        setConnected(payload.connected);
        setStatus('ready');
      } catch {
        if (active) setStatus('error');
      }
    };

    void loadAccounts();
    return () => {
      active = false;
    };
  }, []);

  const unavailable = disabled || status === 'loading' || accounts.length === 0;
  const helpText = status === 'loading'
    ? 'Loading connected Meta ad accounts…'
    : status === 'error'
      ? 'Meta ad accounts could not be loaded. Refresh the page and try again.'
      : !connected
        ? 'Complete the Meta connection in Settings before assigning an account.'
        : accounts.length === 0
          ? 'Select at least one Meta ad account in Settings first.'
          : 'Only Meta ad accounts connected to this workspace are available.';

  return (
    <div className="space-y-1.5">
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={unavailable}
        aria-describedby={`${id}-status`}
        className={`w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white focus:border-zinc-750 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        <option value="">No Meta ad account assigned</option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {metaAdAccountLabel(account)}
          </option>
        ))}
      </select>
      <span id={`${id}-status`} className="block text-[10px] text-zinc-500">
        {helpText}
      </span>
    </div>
  );
}
