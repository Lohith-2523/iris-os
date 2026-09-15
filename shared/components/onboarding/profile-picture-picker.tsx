'use client';

import * as React from 'react';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { PROFILE_AVATAR_TEMPLATES } from '@/lib/profile-avatar-templates';
import { MAX_SOURCE_IMAGE_BYTES, processBrowserImage } from '@/lib/browser-image-processing';
import { validateBrowserFile } from '@/lib/file-security';

export function ProfilePicturePicker({ value, onChange, name, disabled, onBusyChange }: {
  value: string | null;
  onChange: (value: string | null) => void;
  name: string;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const inputId = React.useId();

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    onBusyChange?.(true);
    setError('');
    try {
      const validation = await validateBrowserFile(file, 'profile-avatar', { maxBytes: MAX_SOURCE_IMAGE_BYTES });
      if (!validation.ok) throw new Error(validation.error);
      const image = await processBrowserImage(file, 'profile-avatar');
      onChange(image.dataUrl);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to process this photo.');
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }

  return (
    <fieldset disabled={disabled || busy} className="space-y-3 rounded-xl border border-zinc-800 p-4" aria-busy={busy}>
      <legend className="px-1 text-xs font-semibold text-zinc-300">Profile picture (optional)</legend>
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full"><ProfileAvatar src={value} name={name || 'Your'} /></div>
        <div className="min-w-0 space-y-1">
          <label htmlFor={inputId} className="block text-xs text-zinc-300">Upload a photo</label>
          <input id={inputId} type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} className="block w-full text-xs text-zinc-400 file:mr-2 file:rounded file:border-0 file:px-2 file:py-1" />
          <p className="text-[10px] text-zinc-500">PNG, JPEG or WebP, up to 10 MB. Optimized before saving.</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Choose a profile illustration">
        {PROFILE_AVATAR_TEMPLATES.map(template => (
          <button key={template.id} type="button" onClick={() => { onChange(template.id); setError(''); }} aria-label={`Choose ${template.label} avatar`} aria-pressed={value === template.id} className="h-9 w-9 overflow-hidden rounded-full border-2 border-transparent aria-pressed:border-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50">
            <ProfileAvatar src={template.id} name={template.label} />
          </button>
        ))}
        {value && <button type="button" onClick={() => onChange(null)} className="text-xs text-zinc-400 underline">Remove</button>}
      </div>
      {busy && <p role="status" className="text-xs text-zinc-400">Preparing photo…</p>}
      {error && <p role="alert" className="text-xs text-rose-400">{error}</p>}
    </fieldset>
  );
}
