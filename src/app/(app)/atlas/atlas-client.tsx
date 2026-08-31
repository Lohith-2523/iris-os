'use client';

import * as React from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AudioLines, Mic, PencilLine, Pin, Plus, Send, Square, Trash2, User } from 'lucide-react';
import { AtlasIcon } from '@/components/ui/atlas-icon';
import { AtlasAIService } from '@/lib/atlas-ai/service';
import { formatUserMessage } from '@/lib/utils';
import { FormattedMarkdown } from '@/components/ui/formatted-markdown';
import { ATLAS_GUIDE_MESSAGES, ATLAS_GUIDE_SESSION_ID, ATLAS_GUIDE_TITLE } from '@/lib/atlas-ai/guide';
import type { AtlasInitialReadModel } from '@/server/domains/atlas-read-service';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  model?: string;
}

interface BrowserSpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: { transcript: string };
}

interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { resultIndex: number; results: ArrayLike<BrowserSpeechRecognitionResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

function getSpeechRecognitionConstructor() {
  const speechWindow = window as typeof window & {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
}

function joinTranscript(...parts: string[]) {
  return parts.map((part) => part.trim()).filter(Boolean).join(' ');
}

export default function AtlasClient({ initialData }: { initialData: AtlasInitialReadModel }) {
  const [sessions, setSessions] = React.useState<any[]>(initialData.sessions);
  const [sessionMessages, setSessionMessages] = React.useState<Record<string, Message[]>>(initialData.sessionMessages);
  const [currentSessionId, setCurrentSessionId] = React.useState<string | null>(initialData.currentSessionId);

  const initialMessage: Message = {
    role: 'assistant',
    content: formatUserMessage('Welcome to Atlas AI. Ask a question, or tell me to create a project, task, invoice, or report. I’ll collect any missing details and complete the work after your confirmation.'),
  };

  const [messages, setMessages] = React.useState<Message[]>(
    initialData.messages.length > 0 ? initialData.messages : [initialMessage],
  );
  const [query, setQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [chatError, setChatError] = React.useState<string | null>(null);
  const [userAvatarUrl, setUserAvatarUrl] = React.useState<string | null>(initialData.userAvatarUrl);
  const [isGuideSelected, setIsGuideSelected] = React.useState(false);
  const [editingSessionId, setEditingSessionId] = React.useState<string | null>(null);
  const [editingTitle, setEditingTitle] = React.useState('');
  const [voiceState, setVoiceState] = React.useState<'idle' | 'requesting' | 'recording' | 'transcribing'>('idle');
  const [voiceError, setVoiceError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const mediaStreamRef = React.useRef<MediaStream | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const voiceLaunchHandledRef = React.useRef(false);
  const speechRecognitionRef = React.useRef<BrowserSpeechRecognition | null>(null);
  const voiceStateRef = React.useRef(voiceState);
  const voicePrefixRef = React.useRef('');
  const speechFinalRef = React.useRef('');
  const speechInterimRef = React.useRef('');
  const chatAbortControllerRef = React.useRef<AbortController | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const updateVoiceState = React.useCallback((state: typeof voiceState) => {
    voiceStateRef.current = state;
    setVoiceState(state);
  }, []);

  const abortActiveResponse = React.useCallback(() => {
    chatAbortControllerRef.current?.abort();
    chatAbortControllerRef.current = null;
    setIsLoading(false);
  }, []);

  React.useEffect(() => {
    const updateAvatar = async () => {
      const response = await globalThis.fetch('/api/user', { cache: 'no-store' }).catch(() => null);
      if (!response?.ok) return;
      const profile = await response.json();
      setUserAvatarUrl(typeof profile.avatarUrl === 'string' && profile.avatarUrl ? profile.avatarUrl : null);
    };
    const handleUserUpdated = () => void updateAvatar();
    window.addEventListener('user-updated', handleUserUpdated);
    return () => window.removeEventListener('user-updated', handleUserUpdated);
  }, []);

  React.useEffect(() => () => {
    chatAbortControllerRef.current?.abort();
    speechRecognitionRef.current?.abort();
    voiceStateRef.current = 'idle';
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === 'recording') {
      recorder.onstop = null;
      recorder.stop();
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: isLoading ? 'auto' : 'smooth', block: 'end' });
  }, [messages, isLoading]);

  const loadSessions = React.useCallback(async () => {
    const data = await AtlasAIService.getSessions();
    setSessions(data);
    return data;
  }, []);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const startingFromGuide = isGuideSelected;
    const userMsg: Message = { role: 'user', content: textToSend };
    const assistantPlaceholder: Message = { role: 'assistant', content: '' };
    setMessages((prev) => startingFromGuide ? [userMsg, assistantPlaceholder] : [...prev, userMsg, assistantPlaceholder]);
    if (startingFromGuide) {
      setCurrentSessionId(null);
      setIsGuideSelected(false);
    }
    setQuery('');
    setChatError(null);
    setIsLoading(true);
    const controller = new AbortController();
    chatAbortControllerRef.current?.abort();
    chatAbortControllerRef.current = controller;
    let streamedResult = '';

    try {
      const response = await AtlasAIService.askAtlas(
        textToSend,
        undefined,
        startingFromGuide ? undefined : currentSessionId || undefined,
        {
          signal: controller.signal,
          onDelta: (delta) => {
            streamedResult += delta;
            setMessages((current) => current.map((message, index) =>
              index === current.length - 1 && message.role === 'assistant'
                ? { ...message, content: formatUserMessage(streamedResult) }
                : message));
          },
        },
      );
      
      if (response.sessionId !== currentSessionId) {
        setCurrentSessionId(response.sessionId);
      }
      setMessages((current) => current.map((message, index) =>
        index === current.length - 1 && message.role === 'assistant'
          ? { ...message, content: formatUserMessage(response.result), model: response.model }
          : message));
      await loadSessions();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      // The optimistic user message was never persisted, so remove it instead
      // of displaying a misleading completed-looking conversation.
      setMessages((prev) => startingFromGuide ? ATLAS_GUIDE_MESSAGES.map((message) => ({ ...message })) : prev.slice(0, -2));
      if (startingFromGuide) setIsGuideSelected(true);
      setChatError(error instanceof Error ? error.message : 'Atlas could not save this chat. Please retry.');
    } finally {
      if (chatAbortControllerRef.current === controller) {
        chatAbortControllerRef.current = null;
        setIsLoading(false);
      }
    }
  };

  // Parse initial query from URL search parameters
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const q = searchParams.get('q');
      if (q) {
        handleSendMessage(q);
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
    // A URL prompt is an arrival action and must run exactly once. Re-running
    // when chat state changes would submit the same prompt more than once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(query);
  };

  const handleNewChat = () => {
    abortActiveResponse();
    if (currentSessionId) setSessionMessages((current) => ({ ...current, [currentSessionId]: messages }));
    setCurrentSessionId(null);
    setIsGuideSelected(false);
    setMessages([initialMessage]);
  };

  const selectGuide = () => {
    abortActiveResponse();
    if (currentSessionId) setSessionMessages((current) => ({ ...current, [currentSessionId]: messages }));
    setCurrentSessionId(null);
    setIsGuideSelected(true);
    setMessages(ATLAS_GUIDE_MESSAGES.map((message) => ({ ...message })));
  };

  const selectSession = async (id: string) => {
    abortActiveResponse();
    if (currentSessionId) setSessionMessages((current) => ({ ...current, [currentSessionId]: messages }));
    setIsGuideSelected(false);
    setCurrentSessionId(id);
    if (Object.prototype.hasOwnProperty.call(sessionMessages, id)) {
      const cachedMessages = sessionMessages[id];
      setMessages(cachedMessages.length > 0 ? cachedMessages : [initialMessage]);
      return;
    }
    const data = await AtlasAIService.getSessionMessages(id);
    if (data && data.messages && data.messages.length > 0) {
      setMessages(data.messages);
      setSessionMessages((current) => ({ ...current, [id]: data.messages }));
    } else {
      setMessages([initialMessage]);
    }
  };

  const beginRename = (event: React.MouseEvent | React.KeyboardEvent, session: { id: string; title: string }) => {
    event.stopPropagation();
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
  };

  const saveRename = async (id: string) => {
    const title = editingTitle.trim();
    setEditingSessionId(null);
    if (!title) return;
    try {
      const updated = await AtlasAIService.renameSession(id, title);
      setSessions((items) => items.map((item) => item.id === id ? { ...item, title: updated.title } : item));
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'Atlas could not rename this chat.');
    }
  };

  const stopRecording = React.useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === 'recording') {
      updateVoiceState('transcribing');
      speechRecognitionRef.current?.stop();
      recorder.stop();
    }
  }, [updateVoiceState]);

  const startRecording = React.useCallback(async () => {
    if (voiceState !== 'idle') return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setVoiceError('Voice recording is not supported in this browser.');
      return;
    }
    setVoiceError(null);
    updateVoiceState('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = preferredType ? new MediaRecorder(stream, { mimeType: preferredType }) : new MediaRecorder(stream);
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      voicePrefixRef.current = query.trim();
      speechFinalRef.current = '';
      speechInterimRef.current = '';
      recorder.ondataavailable = (event) => {
        if (event.data.size) audioChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setVoiceError('The recording was interrupted. Please try again.');
        updateVoiceState('idle');
        speechRecognitionRef.current?.abort();
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.onstop = async () => {
        updateVoiceState('transcribing');
        speechRecognitionRef.current?.stop();
        speechRecognitionRef.current = null;
        stream.getTracks().forEach((track) => track.stop());
        mediaRecorderRef.current = null;
        mediaStreamRef.current = null;
        const audio = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (!audio.size) {
          updateVoiceState('idle');
          return;
        }
        const liveTranscript = joinTranscript(speechFinalRef.current, speechInterimRef.current);
        try {
          const form = new FormData();
          const extension = recorder.mimeType.includes('mp4') ? 'mp4' : 'webm';
          form.append('file', audio, `atlas-recording.${extension}`);
          const response = await fetch('/api/atlas-ai/transcribe', { method: 'POST', body: form });
          const data = await response.json().catch(() => ({}));
          if (!response.ok || typeof data.text !== 'string') throw new Error(data.error || 'Atlas could not transcribe this recording.');
          setQuery(joinTranscript(voicePrefixRef.current, data.text || liveTranscript));
          requestAnimationFrame(() => inputRef.current?.focus());
        } catch (error) {
          if (liveTranscript) {
            setQuery(joinTranscript(voicePrefixRef.current, liveTranscript));
            setVoiceError('Live transcript kept; final transcription could not be verified.');
          } else {
            setVoiceError(error instanceof Error ? error.message : 'Atlas could not transcribe this recording.');
          }
        } finally {
          updateVoiceState('idle');
        }
      };
      recorder.start(250);
      updateVoiceState('recording');

      const SpeechRecognition = getSpeechRecognitionConstructor();
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = navigator.language || 'en-US';
        recognition.onresult = (event) => {
          let finalAddition = '';
          let interim = '';
          for (let index = event.resultIndex; index < event.results.length; index += 1) {
            const result = event.results[index];
            const transcript = result[0]?.transcript || '';
            if (result.isFinal) finalAddition += transcript;
            else interim += transcript;
          }
          if (finalAddition) speechFinalRef.current = joinTranscript(speechFinalRef.current, finalAddition);
          speechInterimRef.current = interim;
          setQuery(joinTranscript(voicePrefixRef.current, speechFinalRef.current, interim));
        };
        recognition.onerror = (event) => {
          if (!speechFinalRef.current && !speechInterimRef.current && event.error === 'not-allowed') {
            setVoiceError('Live dictation was blocked; the recording will still be transcribed when stopped.');
          }
        };
        recognition.onend = () => {
          if (voiceStateRef.current === 'recording' && speechRecognitionRef.current === recognition) {
            try {
              recognition.start();
            } catch {
              // The browser may still be closing the previous recognition session.
            }
          }
        };
        speechRecognitionRef.current = recognition;
        try {
          recognition.start();
        } catch {
          speechRecognitionRef.current = null;
        }
      }
    } catch (error) {
      updateVoiceState('idle');
      setVoiceError(error instanceof DOMException && error.name === 'NotAllowedError'
        ? 'Microphone access was denied. Allow it in your browser settings and try again.'
        : 'Atlas could not access the microphone.');
    }
  }, [query, updateVoiceState, voiceState]);

  React.useEffect(() => {
    if (voiceLaunchHandledRef.current || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('voice') !== '1') return;
    voiceLaunchHandledRef.current = true;
    window.history.replaceState(null, '', window.location.pathname);
    void startRecording();
  }, [startRecording]);

  const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await AtlasAIService.deleteSession(id);
    setSessionMessages((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    if (currentSessionId === id) {
      handleNewChat();
    }
    loadSessions();
  };

  const suggestionPills = [
    'Create a new client project',
    'Add a task to a project',
    'Create and send an invoice',
    'Generate an executive report',
    'Schedule a meeting with my client',
  ];

  const showSuggestions = messages.length <= 1;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-zinc-800/60 pb-5 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white silver-text-gradient">Atlas Command Center</h1>
            <Badge variant="default" className="bg-zinc-900 border-zinc-800 text-zinc-300 py-0.5 px-2 flex items-center gap-1 font-semibold">
              <AtlasIcon className="atlas-proprietary-engine-icon h-3 w-3" />
              <span>Proprietary AI Engine</span>
            </Badge>
          </div>
          <p className="text-xs text-zinc-500">Ask, analyze, or create projects, tasks, invoices, reports, and meetings through one secure conversation.</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleNewChat} className="h-8 border-zinc-800 text-zinc-300 gap-1.5 self-start md:self-auto rounded-none bg-zinc-900 hover:bg-zinc-800">
          <Plus className="h-3.5 w-3.5" />
          <span>New Chat</span>
        </Button>
      </div>

      {/* Main Terminal Chat Interface */}
      <div className="flex flex-1 gap-6 overflow-hidden min-h-0">
        
        {/* Chat History Sidebar (Left) */}
        <div className="w-68 hidden lg:flex flex-col shrink-0 border border-zinc-850 bg-[#0c0d12]/50 p-4 rounded-lg shadow-xl backdrop-blur-md overflow-hidden h-full">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-850/60 mb-4 shrink-0">
            <div className="flex items-center gap-2 text-zinc-400">
              <AudioLines className="h-4 w-4 text-zinc-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-sans">Chat History</span>
            </div>
            <span className="text-[9px] font-semibold bg-zinc-900 border border-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded uppercase font-mono">
              {sessions.length} chats
            </span>
          </div>

          <div className="atlas-chat-scroll flex-1 overflow-y-auto pr-1 space-y-2">
            <button
              type="button"
              data-session-id={ATLAS_GUIDE_SESSION_ID}
              onClick={selectGuide}
              className={`flex w-full items-start gap-3 rounded-md border p-3.5 text-left text-xs transition-colors ${
                isGuideSelected ? 'border-zinc-700 bg-zinc-900 text-white' : 'border-zinc-800/70 bg-zinc-950/40 text-zinc-300 hover:bg-zinc-900/60'
              }`}
              aria-current={isGuideSelected ? 'page' : undefined}
            >
              <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0">
                <span className="block font-semibold">{ATLAS_GUIDE_TITLE}</span>
                <span className="mt-1 block text-[9px] leading-relaxed text-zinc-500">Pinned Atlas guide</span>
              </span>
            </button>
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => selectSession(session.id)}
                className={`group relative flex flex-col justify-between w-full text-left rounded-md border p-3.5 text-xs transition-colors duration-200 cursor-pointer ${
                  currentSessionId === session.id 
                    ? 'bg-zinc-900 border-zinc-750 text-white shadow-lg' 
                    : 'border-transparent bg-zinc-950/20 hover:bg-zinc-900/40 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  {editingSessionId === session.id ? (
                    <input
                      autoFocus
                      value={editingTitle}
                      maxLength={80}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => setEditingTitle(event.target.value)}
                      onBlur={() => void saveRename(session.id)}
                      onKeyDown={(event) => {
                        event.stopPropagation();
                        if (event.key === 'Enter') void saveRename(session.id);
                        if (event.key === 'Escape') setEditingSessionId(null);
                      }}
                      aria-label="Edit chat name"
                      className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-white outline-none focus:border-zinc-500"
                    />
                  ) : (
                    <span
                      className={`min-w-0 flex-1 truncate font-semibold ${currentSessionId === session.id ? 'text-white' : 'text-zinc-300'}`}
                      onDoubleClick={(event) => beginRename(event, session)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') beginRename(event, session);
                      }}
                      tabIndex={0}
                      title="Double-click to rename"
                    >
                      {session.title}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(event) => beginRename(event, session)}
                    className="shrink-0 text-zinc-650 opacity-0 transition-opacity hover:text-white group-hover:opacity-100 focus:opacity-100"
                    aria-label={`Rename ${session.title}`}
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                  </button>
                  <button 
                    type="button"
                    onClick={(e) => handleDeleteSession(e, session.id)}
                    className="text-zinc-650 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0"
                    title="Delete Chat"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {session.updatedAt && (
                  <div className="flex items-center justify-between mt-2.5">
                    <span className="text-[9px] text-zinc-500 font-medium font-sans">
                      {new Date(session.updatedAt).toLocaleDateString(undefined, { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                    <span className="text-[9px] text-zinc-650 font-mono">
                      {new Date(session.updatedAt).toLocaleTimeString(undefined, { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: false
                      })}
                    </span>
                  </div>
                )}
              </div>
            ))}
            {sessions.length === 0 && (
              <div className="text-xs text-zinc-600 italic py-6 text-center font-sans">No recent chats.</div>
            )}
          </div>
        </div>

        {/* Chat Stream Panel */}
        <div className="flex flex-1 flex-col rounded-none border border-zinc-800 bg-[#0d0e12] overflow-hidden brushed-border">
          <div className="border-b border-zinc-800 p-2 lg:hidden">
            <button
              type="button"
              onClick={selectGuide}
              className={`flex h-11 w-full items-center gap-2 whitespace-nowrap px-3 text-xs font-semibold transition-colors ${isGuideSelected ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-white'}`}
            >
              <Pin className="h-3.5 w-3.5" />
              {ATLAS_GUIDE_TITLE}
            </button>
          </div>
          {/* Messages stream */}
          <div className="atlas-chat-scroll flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {chatError && (
              <div role="alert" className="border border-amber-900/70 bg-amber-950/30 px-4 py-3 text-xs text-amber-200">
                {chatError}
              </div>
            )}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 text-xs leading-relaxed max-w-[85%] ${
                  msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {/* Avatar Icon */}
                <div className={`atlas-chat-avatar h-8 w-8 rounded-full border flex items-center justify-center shrink-0 overflow-hidden shadow-md ${
                  msg.role === 'user' 
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-200' 
                    : 'bg-[#121215] border-zinc-800 text-white font-bold'
                }`}>
                  {msg.role === 'user'
                    ? userAvatarUrl
                      ? <Image src={userAvatarUrl} alt="Your profile" width={32} height={32} unoptimized className="h-full w-full rounded-full object-cover" />
                      : <User className="h-4 w-4" />
                    : <AtlasIcon className="atlas-chat-avatar-icon h-4 w-4" />}
                </div>

                {/* Message Bubble */}
                <div className="space-y-1">
                  <div className={`rounded-none p-4 font-sans ${
                    msg.role === 'user'
                      ? 'bg-zinc-900 border border-zinc-800 text-zinc-100'
                      : 'bg-[#121215] border border-zinc-850 text-zinc-300'
                  }`}>
                    {isLoading && idx === messages.length - 1 && msg.role === 'assistant' && !msg.content ? (
                      <span className="italic text-zinc-500">Atlas is thinking...</span>
                    ) : (
                      <>
                        <FormattedMarkdown text={msg.content} />
                        {isLoading && idx === messages.length - 1 && msg.role === 'assistant' && (
                          <span aria-hidden="true" className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-zinc-400 align-middle" />
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Suggestions when empty */}
            {showSuggestions && (
              <div className="mt-8 flex flex-col gap-2">
                <div className="text-xs text-zinc-500 mb-2">Suggested queries:</div>
                <div className="flex flex-wrap gap-2">
                  {suggestionPills.map((pill, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(pill)}
                      className="text-left rounded-none border border-zinc-850 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-800 p-2 text-xs text-zinc-400 hover:text-white transition-colors font-sans cursor-pointer"
                    >
                      {pill}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form Input area */}
          <div className="border-t border-zinc-800 p-4 bg-zinc-950/40">
            <form onSubmit={handleFormSubmit} className="flex items-center gap-2 sm:gap-3">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask Atlas anything, or say “Create a project…”"
                className="h-11 min-w-0 flex-1 rounded-none border border-zinc-800 bg-zinc-900/40 px-4 text-xs text-white placeholder-zinc-500 focus:border-zinc-700 focus:bg-zinc-900/80 focus:outline-none focus:ring-0 transition-colors font-sans"
              />
              <button
                type="button"
                onClick={voiceState === 'recording' ? stopRecording : () => void startRecording()}
                disabled={voiceState === 'requesting' || voiceState === 'transcribing'}
                className={`atlas-voice-button grid h-11 w-11 shrink-0 place-items-center rounded-full border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 active:bg-zinc-800 disabled:cursor-wait disabled:opacity-60 ${voiceState === 'recording' ? 'is-recording' : ''}`}
                aria-label={voiceState === 'recording' ? 'Stop recording' : voiceState === 'transcribing' ? 'Transcribing recording' : 'Talk to Atlas'}
                aria-pressed={voiceState === 'recording'}
              >
                {voiceState === 'recording' ? <Square className="h-3.5 w-3.5 fill-current" /> : voiceState === 'transcribing' ? <AudioLines className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
              <Button type="submit" disabled={isLoading || !query.trim()} className="h-11 w-11 px-0 bg-white hover:bg-zinc-200 text-zinc-950 shrink-0 rounded-none">
                <Send className="h-4 w-4" />
              </Button>
            </form>
            {(voiceState === 'recording' || voiceState === 'transcribing' || voiceError) && (
              <p role={voiceError ? 'alert' : 'status'} className={`mt-2 text-[10px] ${voiceError ? 'text-rose-400' : 'text-zinc-500'}`}>
                {voiceError || (voiceState === 'recording'
                  ? 'Listening... your words appear in the question field live.'
                  : 'Polishing the live transcript...')}
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
