'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, ImageUp, Loader2, MoreHorizontal, Move, RotateCcw, Trash2 } from 'lucide-react';
import { Popover } from 'radix-ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MAX_SOURCE_IMAGE_BYTES, processBrowserImage } from '@/lib/browser-image-processing';
import { validateBrowserFile } from '@/lib/file-security';
import type { WorkspaceBannerPosition } from '@/lib/workspace-banner';

const CLIENT_CANVA_BANNER_URL = '/api/canva/designs/banner?target=client';

export function ClientWorkspaceBanner({ name, backgroundDataUrl, position, zoom, accentColor, onBackgroundChange, onLayoutChange }: {
  name: string;
  backgroundDataUrl?: string | null;
  position: WorkspaceBannerPosition;
  zoom: number;
  accentColor?: string;
  onBackgroundChange: (dataUrl: string | null) => Promise<void>;
  onLayoutChange: (position: WorkspaceBannerPosition, zoom: number) => Promise<void>;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [isRepositioning, setIsRepositioning] = React.useState(false);
  const [draftPosition, setDraftPosition] = React.useState(position);
  const [savedPosition, setSavedPosition] = React.useState(position);
  const [draftZoom, setDraftZoom] = React.useState(zoom);
  const [savedZoom, setSavedZoom] = React.useState(zoom);
  const pointerRef = React.useRef<{ pointerId: number; x: number; y: number; start: WorkspaceBannerPosition } | null>(null);

  React.useEffect(() => { setDraftPosition(position); setSavedPosition(position); }, [position]);
  React.useEffect(() => { setDraftZoom(zoom); setSavedZoom(zoom); }, [zoom]);

  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setSaving(true); setError('');
    try {
      const validation = await validateBrowserFile(file, 'profile-avatar', { maxBytes: MAX_SOURCE_IMAGE_BYTES });
      if (!validation.ok) throw new Error(validation.error);
      const processed = await processBrowserImage(file, 'welcome-background');
      await onBackgroundChange(processed.dataUrl);
      setDraftPosition({ x: 50, y: 50 }); setSavedPosition({ x: 50, y: 50 });
      setDraftZoom(1); setSavedZoom(1);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The banner could not be uploaded.'); }
    finally { setSaving(false); }
  };

  const moveFromPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = pointerRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setDraftPosition({
      x: Math.min(100, Math.max(0, drag.start.x + ((event.clientX - drag.x) / bounds.width) * 100)),
      y: Math.min(100, Math.max(0, drag.start.y + ((event.clientY - drag.y) / bounds.height) * 100)),
    });
  };

  const saveLayout = async () => {
    setSaving(true); setError('');
    try {
      await onLayoutChange(draftPosition, draftZoom);
      setSavedPosition(draftPosition); setSavedZoom(draftZoom); setIsRepositioning(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The banner layout could not be saved.'); }
    finally { setSaving(false); }
  };

  const removeBanner = async () => {
    setSaving(true); setError('');
    try {
      await onBackgroundChange(null);
      setDraftPosition({ x: 50, y: 50 }); setSavedPosition({ x: 50, y: 50 });
      setDraftZoom(1); setSavedZoom(1); setIsRepositioning(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The banner could not be removed.'); }
    finally { setSaving(false); }
  };

  return (
    <section className="dashboard-header dashboard-command-center relative isolate grid min-w-0 max-w-full grid-cols-1 items-center gap-4 overflow-hidden border-b border-zinc-800/60 p-4 sm:p-5 md:grid-cols-[minmax(0,1fr)_auto]">
      {backgroundDataUrl ? <>
        <div aria-hidden="true" className="dashboard-command-center-banner-backdrop pointer-events-none absolute inset-0" style={{ backgroundImage: `url(${backgroundDataUrl})` }} />
        <div aria-hidden="true" className="dashboard-command-center-banner-artwork pointer-events-none absolute inset-0" style={{ backgroundImage: `url(${backgroundDataUrl})`, transform: `translate3d(${draftPosition.x - 50}%, ${draftPosition.y - 50}%, 0) scale(${draftZoom})` }} />
      </> : <div aria-hidden="true" className="dashboard-command-center-banner pointer-events-none absolute inset-0" />}
      {isRepositioning && backgroundDataUrl && <div aria-label="Drag to reposition banner" className="absolute inset-0 z-[15] cursor-grab touch-none" role="application" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); pointerRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, start: draftPosition }; event.currentTarget.classList.replace('cursor-grab', 'cursor-grabbing'); }} onPointerMove={moveFromPointer} onPointerUp={(event) => { pointerRef.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); event.currentTarget.classList.replace('cursor-grabbing', 'cursor-grab'); }} onPointerCancel={(event) => { pointerRef.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }} />}
      <div className="relative z-10 min-w-0">
        <div className="dashboard-welcome-card inline-flex max-w-full items-center rounded-2xl border border-zinc-700 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 px-5 py-3 shadow-[inset_0_1px_rgba(255,255,255,.08),0_12px_40px_rgba(0,0,0,.25)]" style={accentColor ? { borderColor: `${accentColor}80`, boxShadow: `inset 0 1px rgba(255,255,255,.08), 0 12px 40px ${accentColor}24` } : undefined}>
          <h1 className="truncate text-xl font-bold tracking-tight text-white silver-text-gradient sm:text-2xl">Welcome, {name}</h1>
        </div>
      </div>
      <Popover.Root>
        <Popover.Trigger asChild><button type="button" className="dashboard-banner-menu absolute right-2 top-2 z-20 grid place-items-center border border-zinc-700/70 bg-zinc-950/65 p-0 text-zinc-300 backdrop-blur-md" aria-label="Banner options"><MoreHorizontal className="h-2.5 w-2.5" /></button></Popover.Trigger>
        <Popover.Portal><Popover.Content align="end" sideOffset={8} collisionPadding={16} className="dashboard-popover z-[110] w-72 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-white shadow-2xl">
          <h2 className="text-sm font-bold">Client workspace banner</h2><p className="mt-1 text-xs leading-relaxed text-zinc-500">Upload a PNG, JPEG, or WebP image for this workspace.</p>
          <div className="mt-4 space-y-2"><button type="button" disabled={saving} onClick={() => inputRef.current?.click()} className="dashboard-menu-item w-full"><ImageUp className="h-4 w-4" />{saving ? 'Saving banner…' : backgroundDataUrl ? 'Replace banner' : 'Upload banner'}{saving && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin" />}</button>{backgroundDataUrl && <button type="button" disabled={saving} onClick={() => setIsRepositioning(true)} className="dashboard-menu-item w-full"><Move className="h-4 w-4" />Resize and reposition</button>}<a href={CLIENT_CANVA_BANNER_URL} className="dashboard-menu-item w-full"><Image src="/canva-icon.svg" alt="" width={16} height={16} className="canva-logo" aria-hidden="true" />Create with Canva</a>{backgroundDataUrl && <button type="button" disabled={saving} onClick={() => void removeBanner()} className="dashboard-menu-item w-full"><Trash2 className="h-4 w-4" />Remove banner</button>}</div>
          {error && <p role="alert" className="mt-3 text-[11px] text-rose-300">{error}</p>}
          <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={upload} />
        </Popover.Content></Popover.Portal>
      </Popover.Root>
      {isRepositioning && backgroundDataUrl && <div className="absolute inset-x-3 bottom-3 z-30 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-700 bg-zinc-950/90 p-2.5 shadow-2xl backdrop-blur-md"><div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-zinc-500">Horizontal<input type="range" min="0" max="100" value={Math.round(draftPosition.x)} onChange={(event) => setDraftPosition((current) => ({ ...current, x: Number(event.target.value) }))} className="w-16 accent-zinc-200" /></label><label className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-zinc-500">Vertical<input type="range" min="0" max="100" value={Math.round(draftPosition.y)} onChange={(event) => setDraftPosition((current) => ({ ...current, y: Number(event.target.value) }))} className="w-16 accent-zinc-200" /></label><label className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-zinc-500">Zoom<input type="range" min="50" max="400" value={Math.round(draftZoom * 100)} onChange={(event) => setDraftZoom(Number(event.target.value) / 100)} className="w-20 accent-zinc-200" /></label></div><div className="flex items-center gap-2"><button type="button" aria-label="Reset banner layout" onClick={() => { setDraftPosition({ x: 50, y: 50 }); setDraftZoom(1); }} className="grid h-7 w-7 place-items-center rounded-md border border-zinc-800 text-zinc-400 hover:text-white"><RotateCcw className="h-3.5 w-3.5" /></button><Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={() => { setDraftPosition(savedPosition); setDraftZoom(savedZoom); setIsRepositioning(false); }}>Cancel</Button><Button type="button" size="sm" disabled={saving} className="h-7 px-2 text-[10px]" onClick={() => void saveLayout()}>{saving ? 'Saving…' : 'Save layout'}</Button></div></div>}
    </section>
  );
}

export function ClientWorkspacePageHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <header className="border-b border-zinc-800/60 pb-5"><span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">{eyebrow}</span><h1 className="mt-1 text-2xl font-bold tracking-tight text-white silver-text-gradient">{title}</h1><p className="mt-1 max-w-3xl text-xs leading-relaxed text-zinc-500">{description}</p></header>;
}

const metricTones = { projects: 'border-sky-400/20 bg-sky-400/[.07] text-sky-300', tasks: 'border-violet-400/20 bg-violet-400/[.07] text-violet-300', documents: 'border-amber-400/20 bg-amber-400/[.07] text-amber-300', approvals: 'border-emerald-400/20 bg-emerald-400/[.07] text-emerald-300' } as const;

export function ClientMetricCard({ icon: Icon, label, value, detail, href, tone, accentColor }: { icon: LucideIcon; label: string; value: number | string; detail: string; href: string; tone: keyof typeof metricTones; accentColor?: string }) {
  const accentStyle = accentColor ? { borderColor: `${accentColor}55`, backgroundColor: `${accentColor}12`, color: accentColor } : undefined;
  return <Link href={href} className="group block min-w-0"><Card className="relative h-full overflow-hidden transition-colors group-hover:border-zinc-600"><div className={`absolute inset-x-0 top-0 h-px ${accentColor ? '' : metricTones[tone].split(' ')[1]}`} style={accentColor ? { backgroundColor: accentColor } : undefined} /><CardContent className="flex min-h-32 items-center gap-4 p-5"><div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl border shadow-[inset_0_1px_rgba(255,255,255,.08)] ${accentColor ? '' : metricTones[tone]}`} style={accentStyle}><Icon className="h-5 w-5" aria-hidden="true" /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><span className="text-sm font-bold text-zinc-100">{label}</span><ArrowRight className="h-4 w-4 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-200" aria-hidden="true" /></div><div className="mt-1 font-mono text-3xl font-bold tracking-tight text-white">{value}</div><p className="mt-1 truncate text-[11px] font-medium text-zinc-500">{detail}</p></div></CardContent></Card></Link>;
}

export function ClientPanel({ title, href, linkLabel = 'View all', children, className = '' }: { title: string; href?: string; linkLabel?: string; children: React.ReactNode; className?: string }) {
  return <Card className={`client-overview-panel min-w-0 overflow-hidden ${className}`}><CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-zinc-900 pb-3"><CardTitle className="text-sm font-semibold text-white">{title}</CardTitle>{href && <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-zinc-500 hover:text-white">{linkLabel}<ArrowRight className="h-3 w-3" aria-hidden="true" /></Link>}</CardHeader><CardContent className="p-0">{children}</CardContent></Card>;
}

export function ClientEmptyState({ children }: { children: React.ReactNode }) {
  return <div className="px-5 py-10 text-center text-xs text-zinc-500">{children}</div>;
}
