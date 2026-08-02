'use client';

import * as React from 'react';
import { ShieldAlert, X } from 'lucide-react';
import { executableFileBlockReason } from '@/lib/file-security';

const NOTICE_DURATION_MS = 6_000;

export function FileInputSecurityGuard() {
  const [notice, setNotice] = React.useState('');

  React.useEffect(() => {
    let noticeTimer: number | undefined;
    const showBlockedNotice = (message: string) => {
      window.clearTimeout(noticeTimer);
      setNotice(message);
      noticeTimer = window.setTimeout(() => setNotice(''), NOTICE_DURATION_MS);
    };
    const firstBlockedFile = (files: FileList | null) => Array.from(files || [])
      .map((file) => executableFileBlockReason(file))
      .find((reason): reason is string => Boolean(reason));

    const guardFileInput = (event: Event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.type !== 'file') return;
      const reason = firstBlockedFile(input.files);
      if (!reason) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      input.value = '';
      showBlockedNotice(reason);
    };

    const guardFileDrop = (event: DragEvent) => {
      const reason = firstBlockedFile(event.dataTransfer?.files || null);
      if (!reason) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      showBlockedNotice(reason);
    };

    document.addEventListener('change', guardFileInput, true);
    document.addEventListener('drop', guardFileDrop, true);
    return () => {
      window.clearTimeout(noticeTimer);
      document.removeEventListener('change', guardFileInput, true);
      document.removeEventListener('drop', guardFileDrop, true);
    };
  }, []);

  if (!notice) return null;
  return (
    <div className="fixed bottom-5 left-1/2 z-[200] flex w-[min(92vw,520px)] -translate-x-1/2 items-start gap-3 rounded-xl border border-amber-700/60 bg-zinc-950 px-4 py-3 text-zinc-100 shadow-2xl" role="alert" aria-live="assertive">
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold">File blocked</div>
        <div className="mt-1 text-[10px] leading-relaxed text-zinc-400">{notice}</div>
      </div>
      <button type="button" className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white" onClick={() => setNotice('')} aria-label="Dismiss file security notice">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
