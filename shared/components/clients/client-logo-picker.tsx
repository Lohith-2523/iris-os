'use client';

import * as React from 'react';
import Image from 'next/image';
import { Building2, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MAX_SOURCE_IMAGE_BYTES, processBrowserImage } from '@/lib/browser-image-processing';
import { validateBrowserFile } from '@/lib/file-security';
import { formatUserMessage } from '@/lib/utils';

type ClientLogoPickerProps = {
  value?: string | null;
  companyName: string;
  onChange: (value: string | null) => void | Promise<void>;
  disabled?: boolean;
  description?: string;
};

export function ClientLogoAvatar({
  value,
  companyName,
  className = 'h-12 w-12',
}: {
  value?: string | null;
  companyName: string;
  className?: string;
}) {
  const initials = companyName.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'CL';
  return (
    <span className={`${className} relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-900 text-xs font-bold text-zinc-300`}>
      {value ? <Image src={value} alt={`${companyName} logo`} fill sizes="64px" unoptimized className="bg-white object-contain p-1" /> : initials}
    </span>
  );
}

export function ClientLogoPicker({
  value,
  companyName,
  onChange,
  disabled = false,
  description = 'PNG or JPEG · maximum 10 MB · optimized before saving',
}: ClientLogoPickerProps) {
  const inputId = React.useId();
  const [status, setStatus] = React.useState<'idle' | 'processing' | 'saving' | 'success' | 'error'>('idle');
  const [feedback, setFeedback] = React.useState(description);

  const commit = async (nextValue: string | null) => {
    setStatus('saving');
    setFeedback(nextValue ? 'Saving company logo…' : 'Removing company logo…');
    try {
      await onChange(nextValue);
      setStatus('success');
      setFeedback(nextValue ? 'Company logo ready.' : 'Company logo removed.');
    } catch (error) {
      setStatus('error');
      setFeedback(formatUserMessage(error instanceof Error ? error.message : 'Unable to save the company logo.'));
    }
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const validation = await validateBrowserFile(file, 'invoice-logo', { maxBytes: MAX_SOURCE_IMAGE_BYTES });
    if (!validation.ok) {
      setStatus('error');
      setFeedback(validation.error);
      return;
    }

    setStatus('processing');
    setFeedback('Optimizing company logo…');
    try {
      const processed = await processBrowserImage(file, 'invoice-logo');
      await commit(processed.dataUrl);
    } catch (error) {
      setStatus('error');
      setFeedback(formatUserMessage(error instanceof Error ? error.message : 'Unable to process the selected company logo.'));
    }
  };

  const busy = disabled || status === 'processing' || status === 'saving';

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-950/35 p-4 sm:flex-row sm:items-center">
      <ClientLogoAvatar value={value} companyName={companyName || 'Client company'} className="h-16 w-16" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Building2 className="h-4 w-4 text-zinc-400" aria-hidden="true" />
          Client company logo
        </div>
        <p className={`mt-1 text-[10px] ${status === 'error' ? 'text-rose-400' : 'text-zinc-500'}`} role="status">{feedback}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <label htmlFor={inputId} className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded border border-zinc-700 bg-zinc-900 px-3 text-[10px] font-semibold text-zinc-200 transition-colors hover:border-zinc-500 hover:text-white aria-disabled:pointer-events-none aria-disabled:opacity-50" aria-disabled={busy}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
            {value ? 'Replace logo' : 'Upload logo'}
          </label>
          <input id={inputId} type="file" accept="image/png,image/jpeg" className="sr-only" disabled={busy} onChange={handleFile} />
          {value && (
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void commit(null)} className="h-8 gap-1.5 text-[10px] text-zinc-500 hover:text-white">
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
