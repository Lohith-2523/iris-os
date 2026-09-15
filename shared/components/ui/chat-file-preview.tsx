'use client';

import * as React from 'react';
import { Archive, Download, File, FileAudio, FileImage, FileSpreadsheet, FileText, FileVideo, LoaderCircle, Presentation } from 'lucide-react';
import { safeDownloadName } from '@/lib/file-security';
import styles from './chat-file-preview.module.css';

export type LoadedChatFile = {
  blob: Blob;
  fileName?: string;
  mimeType?: string;
};

type ChatFilePreviewProps = {
  fileKey: string;
  fileName: string;
  mimeType?: string | null;
  byteSize?: number | null;
  href?: string;
  loadFile?: (signal: AbortSignal) => Promise<LoadedChatFile>;
};

type Preview =
  | { kind: 'image' | 'video' | 'audio' | 'pdf'; url: string }
  | { kind: 'text'; text: string }
  | { kind: 'generic' };

function extensionOf(name: string) {
  return name.split('.').at(-1)?.toLowerCase() || '';
}

function formatBytes(size?: number | null) {
  if (!size) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(size < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

function filenameFromDisposition(value: string | null) {
  if (!value) return '';
  const encoded = value.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try { return decodeURIComponent(encoded); } catch { return encoded; }
  }
  return value.match(/filename="([^"]+)"/i)?.[1] || value.match(/filename=([^;]+)/i)?.[1]?.trim() || '';
}

async function loadHref(href: string, signal: AbortSignal): Promise<LoadedChatFile> {
  const response = await fetch(href, { cache: 'no-store', credentials: 'same-origin', signal });
  if (!response.ok) throw new Error('Preview unavailable');
  return {
    blob: await response.blob(),
    fileName: filenameFromDisposition(response.headers.get('content-disposition')) || undefined,
    mimeType: response.headers.get('content-type')?.split(';')[0] || undefined,
  };
}

function xmlText(xml: string) {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  return Array.from(document.getElementsByTagName('*'))
    .filter((node) => node.localName === 't')
    .map((node) => node.textContent || '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function officeText(blob: Blob, extension: string) {
  if (extension === 'xlsx') {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(await blob.arrayBuffer(), { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    return firstSheet ? XLSX.utils.sheet_to_csv(firstSheet).slice(0, 2_400) : '';
  }
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(blob);
  if (extension === 'docx') return xmlText(await zip.file('word/document.xml')?.async('text') || '');
  if (extension === 'pptx') return xmlText(await zip.file('ppt/slides/slide1.xml')?.async('text') || '');
  if (extension === 'zip') return Object.keys(zip.files).filter((path) => !zip.files[path].dir).slice(0, 12).join('\n');
  return '';
}

async function createPreview(file: LoadedChatFile, name: string): Promise<Preview> {
  const type = (file.mimeType || file.blob.type || '').toLowerCase();
  const extension = extensionOf(name);
  const urlKind = type.startsWith('image/') ? 'image'
    : type.startsWith('video/') ? 'video'
      : type.startsWith('audio/') ? 'audio'
        : type === 'application/pdf' || extension === 'pdf' ? 'pdf'
          : null;
  if (urlKind) return { kind: urlKind, url: URL.createObjectURL(file.blob) };
  if (type.startsWith('text/') || ['txt', 'csv'].includes(extension)) {
    return { kind: 'text', text: (await file.blob.slice(0, 24_000).text()).slice(0, 2_400) };
  }
  if (['docx', 'xlsx', 'pptx', 'zip'].includes(extension)) {
    try {
      const text = await officeText(file.blob, extension);
      if (text) return { kind: 'text', text: text.slice(0, 2_400) };
    } catch { /* A valid download can still use the generic preview. */ }
  }
  return { kind: 'generic' };
}

function FileKindIcon({ name, type }: { name: string; type: string }) {
  const extension = extensionOf(name);
  if (type.startsWith('image/')) return <FileImage aria-hidden="true" />;
  if (type.startsWith('video/')) return <FileVideo aria-hidden="true" />;
  if (type.startsWith('audio/')) return <FileAudio aria-hidden="true" />;
  if (extension === 'xlsx' || extension === 'csv') return <FileSpreadsheet aria-hidden="true" />;
  if (extension === 'pptx') return <Presentation aria-hidden="true" />;
  if (extension === 'zip') return <Archive aria-hidden="true" />;
  if (['pdf', 'docx', 'txt'].includes(extension)) return <FileText aria-hidden="true" />;
  return <File aria-hidden="true" />;
}

export function ChatFilePreview({ fileKey, fileName, mimeType, byteSize, href, loadFile }: ChatFilePreviewProps) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const loaderRef = React.useRef(loadFile);
  const loadedRef = React.useRef<LoadedChatFile | null>(null);
  const [visible, setVisible] = React.useState(false);
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [resolvedName, setResolvedName] = React.useState(fileName);
  const [resolvedType, setResolvedType] = React.useState(mimeType || '');
  const [resolvedSize, setResolvedSize] = React.useState(byteSize || 0);
  const [preview, setPreview] = React.useState<Preview>({ kind: 'generic' });

  React.useEffect(() => {
    loaderRef.current = loadFile;
  }, [loadFile]);

  const getFile = React.useCallback(async (signal: AbortSignal) => {
    if (loadedRef.current) return loadedRef.current;
    const loaded = loaderRef.current
      ? await loaderRef.current(signal)
      : href ? await loadHref(href, signal) : null;
    if (!loaded) throw new Error('Preview unavailable');
    loadedRef.current = loaded;
    return loaded;
  }, [href]);

  React.useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '320px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [fileKey]);

  React.useEffect(() => {
    loadedRef.current = null;
    setResolvedName(fileName);
    setResolvedType(mimeType || '');
    setResolvedSize(byteSize || 0);
    setPreview({ kind: 'generic' });
    setStatus('idle');
  }, [fileKey, fileName, mimeType, byteSize]);

  React.useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    setStatus('loading');
    void getFile(controller.signal).then(async (loaded) => {
      const name = loaded.fileName || fileName;
      const type = loaded.mimeType || loaded.blob.type || mimeType || '';
      setResolvedName(name);
      setResolvedType(type);
      setResolvedSize(loaded.blob.size || byteSize || 0);
      setPreview(await createPreview({ ...loaded, mimeType: type }, name));
      setStatus('ready');
    }).catch((reason) => {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      setStatus('error');
    });
    return () => controller.abort();
  }, [visible, fileKey, getFile, fileName, mimeType, byteSize]);

  React.useEffect(() => () => {
    if ('url' in preview) URL.revokeObjectURL(preview.url);
  }, [preview]);

  async function download() {
    const controller = new AbortController();
    try {
      setStatus((current) => current === 'error' ? 'loading' : current);
      const loaded = await getFile(controller.signal);
      const name = loaded.fileName || resolvedName;
      const url = URL.createObjectURL(loaded.blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = safeDownloadName(name);
      anchor.rel = 'noopener';
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }

  const extension = extensionOf(resolvedName).toUpperCase() || 'FILE';
  return (
    <div ref={rootRef} className={styles.card} data-file-preview={fileKey}>
      <div className={styles.viewport} aria-label={`Preview of ${resolvedName}`}>
        {status === 'loading' && <div className={styles.loading}><LoaderCircle aria-hidden="true" /><span>Preparing preview</span></div>}
        {status === 'error' && <div className={styles.placeholder}><FileKindIcon name={resolvedName} type={resolvedType} /><strong>{extension}</strong><span>Preview unavailable</span></div>}
        {/* The source is an authenticated blob URL, so Next Image cannot optimize it. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {status !== 'loading' && status !== 'error' && preview.kind === 'image' && <img src={preview.url} alt="" />}
        {status !== 'loading' && status !== 'error' && preview.kind === 'video' && <video src={preview.url} muted preload="metadata" aria-label={`Video preview of ${resolvedName}`} />}
        {status !== 'loading' && status !== 'error' && preview.kind === 'audio' && <div className={styles.audio}><FileAudio aria-hidden="true" /><div className={styles.wave} /><audio src={preview.url} controls preload="metadata" aria-label={`Audio preview of ${resolvedName}`} /></div>}
        {status !== 'loading' && status !== 'error' && preview.kind === 'pdf' && <iframe src={`${preview.url}#page=1&view=FitH&toolbar=0&navpanes=0`} title={`Preview of ${resolvedName}`} tabIndex={-1} />}
        {status !== 'loading' && status !== 'error' && preview.kind === 'text' && <pre>{preview.text}</pre>}
        {status !== 'loading' && status !== 'error' && preview.kind === 'generic' && <div className={styles.placeholder}><FileKindIcon name={resolvedName} type={resolvedType} /><strong>{extension}</strong><span>File preview</span></div>}
      </div>
      <div className={styles.footer}>
        <FileKindIcon name={resolvedName} type={resolvedType} />
        <span className={styles.details}><strong title={resolvedName}>{resolvedName}</strong><small>{[extension, formatBytes(resolvedSize)].filter(Boolean).join(' · ')}</small></span>
        <button type="button" onClick={() => void download()} aria-label={`Download ${resolvedName}`} title={`Download ${resolvedName}`} disabled={status === 'loading'}>
          {status === 'loading' ? <LoaderCircle className={styles.spin} aria-hidden="true" /> : <Download aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}
