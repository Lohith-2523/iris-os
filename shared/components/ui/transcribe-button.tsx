'use client';

import * as React from 'react';
import { AudioLines, Mic, Square } from 'lucide-react';

type EditableField = HTMLInputElement | HTMLTextAreaElement;

function replaceControlledValue(field: EditableField, text: string) {
  const prototype = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  const start = field.selectionStart ?? field.value.length;
  const end = field.selectionEnd ?? start;
  const spacing = start > 0 && !/\s$/.test(field.value.slice(0, start)) ? ' ' : '';
  const value = `${field.value.slice(0, start)}${spacing}${text}${field.value.slice(end)}`;
  setter?.call(field, value);
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.focus();
  field.setSelectionRange(start + spacing.length + text.length, start + spacing.length + text.length);
}

export function TranscribeButton({ label = 'Transcribe' }: { label?: string }) {
  const [state, setState] = React.useState<'idle' | 'recording' | 'transcribing'>('idle');
  const [error, setError] = React.useState('');
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const targetRef = React.useRef<EditableField | null>(null);

  React.useEffect(() => {
    const remember = (event: FocusEvent) => {
      if (event.target instanceof HTMLTextAreaElement || (event.target instanceof HTMLInputElement && /^(text|email|search|url|tel)$/.test(event.target.type))) targetRef.current = event.target;
    };
    document.addEventListener('focusin', remember);
    return () => document.removeEventListener('focusin', remember);
  }, []);

  const stop = () => recorderRef.current?.state === 'recording' && recorderRef.current.stop();

  const start = async () => {
    if (!targetRef.current) return setError('Select a text field first, then choose Transcribe.');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return setError('Voice recording is not supported in this browser.');
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => event.data.size && chunksRef.current.push(event.data);
      recorder.onstop = async () => {
        setState('transcribing');
        stream.getTracks().forEach((track) => track.stop());
        const audio = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        try {
          const form = new FormData();
          form.append('file', audio, recorder.mimeType.includes('mp4') ? 'document-recording.mp4' : 'document-recording.webm');
          const response = await fetch('/api/atlas-ai/transcribe', { method: 'POST', body: form });
          const data = await response.json().catch(() => ({}));
          if (!response.ok || typeof data.text !== 'string') throw new Error(data.error || 'Transcription failed.');
          if (targetRef.current) replaceControlledValue(targetRef.current, data.text.trim());
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : 'Transcription failed.');
        } finally {
          setState('idle');
          recorderRef.current = null;
          streamRef.current = null;
        }
      };
      recorder.start(250);
      setState('recording');
    } catch {
      setState('idle');
      setError('Microphone access was denied.');
    }
  };

  React.useEffect(() => () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  return <div className="flex flex-col items-end gap-1"><button type="button" onClick={state === 'recording' ? stop : start} disabled={state === 'transcribing'} className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-xs font-semibold text-white hover:border-zinc-500 disabled:opacity-60">{state === 'recording' ? <Square className="h-3.5 w-3.5 fill-current" /> : state === 'transcribing' ? <AudioLines className="h-4 w-4 animate-pulse" /> : <Mic className="h-4 w-4" />}{state === 'recording' ? 'Stop' : state === 'transcribing' ? 'Transcribing…' : label}</button>{error && <span role="alert" className="max-w-64 text-right text-[10px] text-rose-400">{error}</span>}</div>;
}
