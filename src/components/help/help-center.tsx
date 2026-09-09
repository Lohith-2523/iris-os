'use client';

import * as React from 'react';
import { Bot, Bug, ChevronLeft, CircleHelp, Lightbulb, MessageCircleQuestion, Send, ShieldAlert, X } from 'lucide-react';
import { usePathname } from 'next/navigation';

type HelpMode = 'menu' | 'FEATURE' | 'COMPLAINT' | 'ISSUE' | 'QUESTION';
type ChatMessage = { role: 'user' | 'assistant'; text: string };

const choices = [
  { mode: 'FEATURE' as const, label: 'Request a feature', icon: Lightbulb },
  { mode: 'COMPLAINT' as const, label: 'Raise a complaint', icon: ShieldAlert },
  { mode: 'ISSUE' as const, label: 'Raise an issue', icon: Bug },
  { mode: 'QUESTION' as const, label: 'Ask a question', icon: MessageCircleQuestion },
];

export function HelpCenter() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<HelpMode>('menu');
  const [status, setStatus] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [question, setQuestion] = React.useState('');
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    { role: 'assistant', text: 'Ask me how anything in Iris OS works.' },
  ]);

  if (pathname === '/' || pathname === '/waitlist') return null;

  const close = () => {
    setOpen(false);
    setMode('menu');
    setStatus('');
  };

  const submitRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setStatus('');
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/help', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        requestId: crypto.randomUUID(),
        type: mode,
        name: form.get('name'),
        email: form.get('email'),
        subject: form.get('subject'),
        details: form.get('details'),
        page: window.location.href,
      }),
    }).catch(() => null);
    const body = await response?.json().catch(() => ({}));
    setBusy(false);
    if (!response?.ok) return setStatus(body?.error || 'Could not send your request.');
    event.currentTarget.reset();
    setStatus('Sent. The Iris team has your request.');
  };

  const askAtlas = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = question.trim();
    if (!text || busy) return;
    setQuestion('');
    setMessages((current) => [...current, { role: 'user', text }]);
    setBusy(true);
    const response = await fetch('/api/help/ask', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question: text }),
    }).catch(() => null);
    const body = await response?.json().catch(() => ({}));
    setBusy(false);
    setMessages((current) => [...current, {
      role: 'assistant',
      text: response?.ok && typeof body.answer === 'string' ? body.answer : body?.error || 'I could not answer that just now.',
    }]);
  };

  return (
    <div className="iris-help-root">
      {open && (
        <section className="iris-help-panel" aria-label="Iris help">
          <header>
            {mode !== 'menu' ? <button type="button" onClick={() => { setMode('menu'); setStatus(''); }} aria-label="Back"><ChevronLeft /></button> : <span />}
            <div><strong>{mode === 'menu' ? 'How can we help?' : mode === 'QUESTION' ? 'Ask Atlas' : choices.find((item) => item.mode === mode)?.label}</strong><small>{mode === 'QUESTION' ? 'Iris OS product guide' : 'Iris support'}</small></div>
            <button type="button" onClick={close} aria-label="Close help"><X /></button>
          </header>
          {mode === 'menu' ? (
            <div className="iris-help-menu">
              {choices.map(({ mode: choiceMode, label, icon: Icon }) => (
                <button type="button" key={choiceMode} onClick={() => setMode(choiceMode)}><Icon /><span>{label}</span></button>
              ))}
            </div>
          ) : mode === 'QUESTION' ? (
            <div className="iris-help-chat">
              <div className="iris-help-messages">
                {messages.map((message, index) => <p key={index} data-role={message.role}>{message.role === 'assistant' && <Bot />}{message.text}</p>)}
                {busy && <p data-role="assistant"><Bot />Atlas is thinking…</p>}
              </div>
              <form onSubmit={askAtlas}><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about Iris OS…" /><button disabled={!question.trim() || busy} aria-label="Send question"><Send /></button></form>
            </div>
          ) : (
            <form className="iris-help-form" onSubmit={submitRequest}>
              <input name="name" required minLength={2} maxLength={120} placeholder="Your name" />
              <input name="email" required type="email" maxLength={320} placeholder="Work email" />
              <input name="subject" required minLength={3} maxLength={160} placeholder="Subject" />
              <textarea name="details" required minLength={10} maxLength={8000} rows={6} placeholder="Tell us what happened or what you need…" />
              <button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send to Iris'}</button>
              {status && <p role="status">{status}</p>}
            </form>
          )}
        </section>
      )}
      <button type="button" className="iris-help-bubble" onClick={() => setOpen((value) => !value)} aria-label={open ? 'Close help' : 'Get help'} aria-expanded={open}>
        {open ? <X /> : <CircleHelp />}<span>Get help</span>
      </button>
    </div>
  );
}
