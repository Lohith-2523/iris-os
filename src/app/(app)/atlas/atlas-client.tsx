'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AudioLines, Maximize2, Mic, Minimize2, PencilLine, Pin, Plus, Radio, Send, Square, Trash2 } from 'lucide-react';
import { AtlasIcon } from '@/components/ui/atlas-icon';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import {
  AtlasAIService,
  type AtlasVoiceWorkflowAction,
  type AtlasVoiceWorkflowHandoff,
} from '@/lib/atlas-ai/service';
import { formatUserMessage } from '@/lib/utils';
import { FormattedMarkdown } from '@/components/ui/formatted-markdown';
import { ATLAS_GUIDE_MESSAGES, ATLAS_GUIDE_SESSION_ID, ATLAS_GUIDE_TITLE } from '@/lib/atlas-ai/guide';
import type { AtlasInitialReadModel } from '@/server/domains/atlas-read-service';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  voiceItemId?: string;
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

function spokenAtlasResult(value: string) {
  return value
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/[*_`#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function confirmedToolActions(value: unknown): AtlasVoiceWorkflowAction[] {
  if (!value || typeof value !== 'object' || (value as { confirmed?: unknown }).confirmed !== true) return [];
  const actions = (value as { actions?: unknown }).actions;
  if (!Array.isArray(actions)) return [];
  const allowedKinds = new Set<AtlasVoiceWorkflowAction['kind']>(['PROJECT', 'TASK', 'INVOICE', 'REPORT', 'MEETING']);
  return actions.slice(0, 5).flatMap((action) => {
    if (!action || typeof action !== 'object') return [];
    const kind = (action as { kind?: unknown }).kind;
    const request = (action as { request?: unknown }).request;
    const details = (action as { details?: unknown }).details;
    return typeof kind === 'string'
      && allowedKinds.has(kind as AtlasVoiceWorkflowAction['kind'])
      && typeof request === 'string'
      && request.trim()
      && details !== null
      && typeof details === 'object'
      && !Array.isArray(details)
      ? [{
          kind: kind as AtlasVoiceWorkflowAction['kind'],
          request: request.trim().slice(0, 2_000),
          details: details as Record<string, unknown>,
        }]
      : [];
  });
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
  const [composerExpanded, setComposerExpanded] = React.useState(false);
  const [chatExpanded, setChatExpanded] = React.useState(false);
  const [voiceChatActive, setVoiceChatActive] = React.useState(false);
  const [liveVoiceText, setLiveVoiceText] = React.useState('');
  const [liveAtlasText, setLiveAtlasText] = React.useState('');
  const [realtimeState, setRealtimeState] = React.useState<'idle' | 'connecting' | 'listening' | 'speaking'>('idle');
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
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
  const messagesScrollRef = React.useRef<HTMLDivElement>(null);
  const voiceChatActiveRef = React.useRef(false);
  const realtimePeerRef = React.useRef<RTCPeerConnection | null>(null);
  const realtimeChannelRef = React.useRef<RTCDataChannel | null>(null);
  const realtimeStreamRef = React.useRef<MediaStream | null>(null);
  const realtimeAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const realtimeAttemptRef = React.useRef<AbortController | null>(null);
  const realtimeWorkflowAbortRef = React.useRef<AbortController | null>(null);
  const realtimeTurnQueueRef = React.useRef(Promise.resolve());
  const realtimePersistenceQueueRef = React.useRef<Promise<void>>(Promise.resolve());
  const processedRealtimeTurnIdsRef = React.useRef(new Set<string>());
  const processedRealtimeToolCallIdsRef = React.useRef(new Set<string>());
  const voiceActionTranscriptRef = React.useRef<AtlasVoiceWorkflowHandoff['transcript']>([]);
  const voiceWorkflowActiveRef = React.useRef(false);
  const workflowRequestInFlightRef = React.useRef(false);
  const persistedNarrationStartedRef = React.useRef(false);
  const ignoredRealtimeErrorIdsRef = React.useRef(new Set<string>());
  const currentSessionIdRef = React.useRef(currentSessionId);
  const [audioBlocked, setAudioBlocked] = React.useState(false);

  React.useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

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
    realtimeAttemptRef.current?.abort();
    realtimeWorkflowAbortRef.current?.abort();
    voiceChatActiveRef.current = false;
    chatAbortControllerRef.current?.abort();
    speechRecognitionRef.current?.abort();
    voiceStateRef.current = 'idle';
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === 'recording') {
      recorder.onstop = null;
      recorder.stop();
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    realtimeChannelRef.current?.close();
    realtimePeerRef.current?.close();
    realtimeStreamRef.current?.getTracks().forEach((track) => track.stop());
    if (realtimeAudioRef.current) realtimeAudioRef.current.srcObject = null;
    realtimeAttemptRef.current?.abort();
  }, []);

  React.useEffect(() => {
    const scroller = messagesScrollRef.current;
    if (!scroller) return;
    if (typeof scroller.scrollTo === 'function') {
      scroller.scrollTo({ top: scroller.scrollHeight, behavior: isLoading ? 'auto' : 'smooth' });
    } else {
      scroller.scrollTop = scroller.scrollHeight;
    }
  }, [messages, isLoading]);

  const loadSessions = React.useCallback(async () => {
    const data = await AtlasAIService.getSessions();
    setSessions(data);
    return data;
  }, []);

  const persistRealtimeTurn = React.useCallback((role: Message['role'], content: string) => {
    realtimePersistenceQueueRef.current = realtimePersistenceQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const saved = await AtlasAIService.persistVoiceTurn(
          role,
          content,
          currentSessionIdRef.current || undefined,
        );
        if (saved.sessionId !== currentSessionIdRef.current) {
          currentSessionIdRef.current = saved.sessionId;
          setCurrentSessionId(saved.sessionId);
        }
        if (saved.created) await loadSessions();
      })
      .catch((error) => {
        setVoiceError(error instanceof Error ? error.message : 'Atlas could not save this voice conversation.');
      });
    return realtimePersistenceQueueRef.current;
  }, [loadSessions]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading || voiceStateRef.current !== 'idle' || realtimeAttemptRef.current || voiceChatActiveRef.current) return;

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
    voiceActionTranscriptRef.current = [];
    voiceWorkflowActiveRef.current = false;
    if (currentSessionId) setSessionMessages((current) => ({ ...current, [currentSessionId]: messages }));
    setCurrentSessionId(null);
    setIsGuideSelected(false);
    setMessages([initialMessage]);
  };

  const selectGuide = () => {
    abortActiveResponse();
    voiceActionTranscriptRef.current = [];
    voiceWorkflowActiveRef.current = false;
    if (currentSessionId) setSessionMessages((current) => ({ ...current, [currentSessionId]: messages }));
    setCurrentSessionId(null);
    setIsGuideSelected(true);
    setMessages(ATLAS_GUIDE_MESSAGES.map((message) => ({ ...message })));
  };

  const selectSession = async (id: string) => {
    abortActiveResponse();
    voiceActionTranscriptRef.current = [];
    voiceWorkflowActiveRef.current = false;
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
    if (voiceStateRef.current !== 'idle' || realtimeAttemptRef.current || realtimePeerRef.current || voiceChatActiveRef.current) return;
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
      setLiveVoiceText('');
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
          const finalText = joinTranscript(voicePrefixRef.current, data.text || liveTranscript);
          setQuery(finalText);
          setLiveVoiceText('');
          requestAnimationFrame(() => inputRef.current?.focus());
        } catch (error) {
          if (liveTranscript) {
            setQuery(joinTranscript(voicePrefixRef.current, liveTranscript));
            setLiveVoiceText('');
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
          setLiveVoiceText(joinTranscript(speechFinalRef.current, interim));
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
  }, [query, updateVoiceState]);

  const stopRealtimeVoice = React.useCallback(() => {
    voiceChatActiveRef.current = false;
    realtimeAttemptRef.current?.abort();
    realtimeWorkflowAbortRef.current?.abort();
    realtimeChannelRef.current?.close();
    realtimePeerRef.current?.close();
    realtimeStreamRef.current?.getTracks().forEach((track) => track.stop());
    if (realtimeAudioRef.current) realtimeAudioRef.current.srcObject = null;
    speechRecognitionRef.current?.abort();
    speechRecognitionRef.current = null;
    realtimeAttemptRef.current?.abort();
    realtimeAttemptRef.current = null;
    realtimeWorkflowAbortRef.current = null;
    voiceActionTranscriptRef.current = [];
    processedRealtimeToolCallIdsRef.current.clear();
    workflowRequestInFlightRef.current = false;
    persistedNarrationStartedRef.current = false;
    ignoredRealtimeErrorIdsRef.current.clear();
    realtimeChannelRef.current = null;
    realtimePeerRef.current = null;
    realtimeStreamRef.current = null;
    realtimeAudioRef.current = null;
    setAudioBlocked(false);
    setVoiceChatActive(false);
    setRealtimeState('idle');
    setLiveVoiceText('');
    setLiveAtlasText('');
  }, []);

  const processRealtimeTranscript = React.useCallback(async (
    transcript: string,
    itemId: string,
    channel: RTCDataChannel,
    voiceConfirmation?: {
      transcript: AtlasVoiceWorkflowHandoff['transcript'];
      actions: AtlasVoiceWorkflowAction[];
      callId?: string;
    },
  ) => {
    if (!transcript || !voiceChatActiveRef.current) return;
    workflowRequestInFlightRef.current = true;
    const assistantItemId = `atlas-workflow:${itemId}`;
    const controller = new AbortController();
    realtimeWorkflowAbortRef.current?.abort();
    realtimeWorkflowAbortRef.current = controller;
    setVoiceError(null);
    setRealtimeState('speaking');
    setLiveAtlasText('Atlas is checking and saving this request…');
    setMessages((current) => [...current, { role: 'assistant', content: '', voiceItemId: assistantItemId, model: 'Atlas Voice' }]);
    try {
      const queuedActions = voiceConfirmation?.actions.length ? voiceConfirmation.actions : [undefined];
      const completedResults: string[] = [];
      let workflowActive = false;
      for (const action of queuedActions) {
        let streamedResult = '';
        const result = await AtlasAIService.askAtlas(
          action?.request || transcript,
          undefined,
          currentSessionIdRef.current || undefined,
          {
            signal: controller.signal,
            voiceWorkflow: action && voiceConfirmation
              ? { confirmed: true, transcript: voiceConfirmation.transcript, action }
              : undefined,
            onDelta: (delta) => {
              streamedResult += delta;
              const combined = [...completedResults, streamedResult].join('\n\n');
              setLiveAtlasText(spokenAtlasResult(combined));
              setMessages((current) => current.map((message) => message.voiceItemId === assistantItemId
                ? { ...message, content: formatUserMessage(combined) }
                : message));
            },
          },
        );
        if (!voiceChatActiveRef.current || controller.signal.aborted) return;
        currentSessionIdRef.current = result.sessionId;
        setCurrentSessionId(result.sessionId);
        completedResults.push(result.result);
        workflowActive = Boolean(result.workflow?.active);
        if (workflowActive) break;
      }
      const combinedResult = completedResults.join('\n\n');
      voiceWorkflowActiveRef.current = workflowActive;
      if (!workflowActive) voiceActionTranscriptRef.current = [];
      setMessages((current) => current.map((message) => message.voiceItemId === assistantItemId
        ? { ...message, content: formatUserMessage(combinedResult), model: 'Atlas AI' }
        : message));
      setLiveAtlasText(spokenAtlasResult(combinedResult));

      if (voiceConfirmation?.callId && channel.readyState === 'open') {
        channel.send(JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: voiceConfirmation.callId,
            output: JSON.stringify({ success: !workflowActive, result: combinedResult }),
          },
        }));
      }

      const speechText = spokenAtlasResult(combinedResult);
      if (speechText && channel.readyState === 'open') {
        channel.send(JSON.stringify({
          type: 'response.create',
          response: {
            conversation: 'none',
            output_modalities: ['audio'],
            tools: [],
            metadata: { purpose: 'atlas_persisted_result' },
            instructions: 'Read the supplied Atlas result faithfully. Do not add, remove, or infer any completed action.',
            input: [{
              type: 'message',
              role: 'user',
              content: [{ type: 'input_text', text: speechText }],
            }],
          },
        }));
      } else {
        workflowRequestInFlightRef.current = false;
        setRealtimeState('listening');
      }
      // The workspace action is already committed at this point. A temporary
      // history refresh failure must not erase or suppress its success reply.
      void loadSessions().catch(() => undefined);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      const errorMessage = error instanceof Error ? error.message : 'Atlas could not save this voice request. Please retry.';
      voiceWorkflowActiveRef.current = false;
      setMessages((current) => current.map((message) => message.voiceItemId === assistantItemId
        ? { ...message, content: errorMessage, model: 'Atlas AI' }
        : message));
      setLiveAtlasText(errorMessage);
      setVoiceError(errorMessage);

      if (voiceConfirmation?.callId && channel.readyState === 'open') {
        channel.send(JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: voiceConfirmation.callId,
            output: JSON.stringify({ success: false, error: errorMessage }),
          },
        }));
        channel.send(JSON.stringify({
          type: 'response.create',
          response: {
            conversation: 'none',
            output_modalities: ['audio'],
            tools: [],
            metadata: { purpose: 'atlas_persisted_result' },
            instructions: 'Tell the user the supplied Atlas request failed and can be retried. Do not claim that any action completed.',
            input: [{
              type: 'message',
              role: 'user',
              content: [{ type: 'input_text', text: errorMessage }],
            }],
          },
        }));
      } else {
        workflowRequestInFlightRef.current = false;
        setRealtimeState('listening');
      }
    } finally {
      if (realtimeWorkflowAbortRef.current === controller) realtimeWorkflowAbortRef.current = null;
    }
  }, [loadSessions]);

  const startRealtimeVoice = React.useCallback(async () => {
    if (voiceStateRef.current !== 'idle' || realtimeAttemptRef.current || voiceChatActiveRef.current || realtimeState === 'connecting') return;
    if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === 'undefined') {
      setVoiceError('Realtime voice is not supported in this browser.');
      return;
    }
    setVoiceError(null);
    setRealtimeState('connecting');
    processedRealtimeTurnIdsRef.current.clear();
    processedRealtimeToolCallIdsRef.current.clear();
    voiceActionTranscriptRef.current = [];
    workflowRequestInFlightRef.current = false;
    persistedNarrationStartedRef.current = false;
    ignoredRealtimeErrorIdsRef.current.clear();
    realtimeTurnQueueRef.current = Promise.resolve();
    const attempt = new AbortController();
    realtimeAttemptRef.current = attempt;
    const timeout = window.setTimeout(() => {
      if (realtimeAttemptRef.current !== attempt || voiceChatActiveRef.current) return;
      stopRealtimeVoice();
      setVoiceError('Voice connection timed out. Check microphone permission and your network, then retry.');
    }, 30_000);
    attempt.signal.addEventListener('abort', () => window.clearTimeout(timeout), { once: true });
    try {
      // A cancelled startup must never reconnect after permission or network waits.
      const sessionResponse = await fetch('/api/atlas-ai/realtime/session', { method: 'POST', cache: 'no-store', signal: attempt.signal });
      const session = await sessionResponse.json().catch(() => ({})) as { value?: string; client_secret?: { value?: string }; error?: string };
      const ephemeralKey = session.value || session.client_secret?.value;
      if (!sessionResponse.ok || !ephemeralKey) throw new Error(session.error || 'Atlas could not create a realtime voice session.');

      if (attempt.signal.aborted) return;
      const peer = new RTCPeerConnection();
      const audio = new Audio();
      audio.autoplay = true;
      audio.volume = 1;
      realtimePeerRef.current = peer;
      realtimeAudioRef.current = audio;
      peer.ontrack = (event) => {
        audio.srcObject = event.streams[0] || new MediaStream([event.track]);
        void audio.play().catch(() => setAudioBlocked(true));
      };
      peer.onconnectionstatechange = () => {
        if (!attempt.signal.aborted && ['failed', 'disconnected', 'closed'].includes(peer.connectionState)) {
          stopRealtimeVoice();
          setVoiceError('Voice connection lost. Please start the conversation again.');
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (attempt.signal.aborted) { stream.getTracks().forEach((track) => track.stop()); return; }
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      realtimeStreamRef.current = stream;

      const channel = peer.createDataChannel('oai-events');
      realtimeChannelRef.current = channel;
      channel.onopen = () => {
        if (attempt.signal.aborted) return;
        window.clearTimeout(timeout);
        voiceChatActiveRef.current = true;
        setVoiceChatActive(true);
        setRealtimeState('listening');
        // WebRTC exclusively owns the microphone in live mode.
      };
      channel.onmessage = (message) => {
        let event: Record<string, unknown>;
        try { event = JSON.parse(String(message.data)) as Record<string, unknown>; } catch { return; }
        if (attempt.signal.aborted) return;
        const type = String(event.type || '');
        const itemId = String(event.item_id || '');
        const updateItem = (role: Message['role'], text: string, append = false) => {
          if (!itemId) return;
          setMessages((current) => {
            const index = current.findIndex((item) => item.voiceItemId === itemId);
            if (index < 0) return [...current, { role, content: text, voiceItemId: itemId, model: 'Atlas Voice' }];
            return current.map((item, position) => position === index
              ? { ...item, content: append && item.content !== 'Listening…' ? item.content + text : text } : item);
          });
        };
        if (type === 'input_audio_buffer.speech_started') {
          setRealtimeState('listening');
          setLiveVoiceText('');
          updateItem('user', 'Listening…');
        } else if (type === 'conversation.item.input_audio_transcription.delta') {
          const delta = String(event.delta || '');
          setLiveVoiceText((current) => current + delta);
          updateItem('user', delta, true);
        } else if (type === 'conversation.item.input_audio_transcription.completed') {
          const transcript = String(event.transcript || '').trim();
          updateItem('user', transcript || '[No speech recognised]');
          setLiveVoiceText(transcript);
          if (transcript && itemId && !processedRealtimeTurnIdsRef.current.has(itemId)) {
            processedRealtimeTurnIdsRef.current.add(itemId);
            void persistRealtimeTurn('user', transcript);
            voiceActionTranscriptRef.current = [
              ...voiceActionTranscriptRef.current,
              { role: 'user' as const, content: transcript },
            ].slice(-40);
            if (voiceWorkflowActiveRef.current) {
              workflowRequestInFlightRef.current = true;
              const cancelEventId = `atlas-workflow-cancel:${itemId}`;
              const clearEventId = `atlas-workflow-clear:${itemId}`;
              ignoredRealtimeErrorIdsRef.current.add(cancelEventId);
              ignoredRealtimeErrorIdsRef.current.add(clearEventId);
              channel.send(JSON.stringify({ type: 'response.cancel', event_id: cancelEventId }));
              channel.send(JSON.stringify({ type: 'output_audio_buffer.clear', event_id: clearEventId }));
              realtimeTurnQueueRef.current = realtimeTurnQueueRef.current
                .catch(() => undefined)
                .then(() => realtimePersistenceQueueRef.current)
                .then(() => processRealtimeTranscript(transcript, itemId, channel));
            }
          }
        } else if (type === 'response.output_item.done') {
          const toolItem = event.item as {
            type?: string;
            status?: string;
            name?: string;
            call_id?: string;
            arguments?: string;
          } | undefined;
          const name = String(toolItem?.name || '');
          const callId = String(toolItem?.call_id || '');
          if (toolItem?.type !== 'function_call' || toolItem.status !== 'completed') return;
          if (name !== 'confirm_workspace_actions' || !callId || processedRealtimeToolCallIdsRef.current.has(callId)) return;
          let parsedArguments: unknown;
          try { parsedArguments = JSON.parse(String(toolItem.arguments || '{}')); } catch { parsedArguments = null; }
          const actions = confirmedToolActions(parsedArguments);
          if (actions.length === 0) {
            setVoiceError('Atlas could not validate the confirmed workspace actions. Please confirm again.');
            return;
          }
          processedRealtimeToolCallIdsRef.current.add(callId);
          voiceWorkflowActiveRef.current = true;
          workflowRequestInFlightRef.current = true;
          const cancelEventId = `atlas-tool-cancel:${callId}`;
          const clearEventId = `atlas-tool-clear:${callId}`;
          ignoredRealtimeErrorIdsRef.current.add(cancelEventId);
          ignoredRealtimeErrorIdsRef.current.add(clearEventId);
          channel.send(JSON.stringify({ type: 'response.cancel', event_id: cancelEventId }));
          channel.send(JSON.stringify({ type: 'output_audio_buffer.clear', event_id: clearEventId }));
          const confirmationTranscript = voiceActionTranscriptRef.current.length >= 2
            ? [...voiceActionTranscriptRef.current]
            : [
                { role: 'user' as const, content: actions.map((action) => action.request).join(' ') },
                { role: 'user' as const, content: 'Confirmed by voice.' },
              ];
          realtimeTurnQueueRef.current = realtimeTurnQueueRef.current
            .catch(() => undefined)
            .then(() => realtimePersistenceQueueRef.current)
            .then(() => processRealtimeTranscript(
              'Confirm.',
              `atlas-tool:${callId}`,
              channel,
              { transcript: confirmationTranscript, actions, callId },
            ));
        } else if (type === 'conversation.item.input_audio_transcription.failed') {
          updateItem('user', '[Transcription failed]');
          setVoiceError('Your audio could not be transcribed. Please try again.');
        } else if (type === 'response.created') {
          const response = event.response as { metadata?: { purpose?: string } } | undefined;
          persistedNarrationStartedRef.current = response?.metadata?.purpose === 'atlas_persisted_result';
          setLiveAtlasText('');
        } else if (type === 'response.output_audio_transcript.delta' || type === 'response.audio_transcript.delta' || type === 'response.output_text.delta') {
          const delta = String(event.delta || '');
          setLiveAtlasText((current) => current + delta);
          if (!workflowRequestInFlightRef.current) updateItem('assistant', delta, true);
        } else if (type === 'response.output_audio_transcript.done' || type === 'response.audio_transcript.done' || type === 'response.output_text.done') {
          const transcript = String(event.transcript || event.text || '');
          setLiveAtlasText(transcript);
          if (!workflowRequestInFlightRef.current) {
            updateItem('assistant', transcript);
            if (transcript) void persistRealtimeTurn('assistant', transcript);
            if (transcript) {
              voiceActionTranscriptRef.current = [
                ...voiceActionTranscriptRef.current,
                { role: 'assistant' as const, content: transcript },
              ].slice(-40);
            }
          }
        } else if (type === 'output_audio_buffer.started') {
          setRealtimeState('speaking');
        } else if (type === 'output_audio_buffer.stopped' || type === 'output_audio_buffer.cleared') {
          if (persistedNarrationStartedRef.current) {
            persistedNarrationStartedRef.current = false;
            workflowRequestInFlightRef.current = false;
          }
          setRealtimeState('listening');
        } else if (type === 'response.done') {
          const response = event.response as { status?: string; status_details?: { error?: { message?: string } } } | undefined;
          if (response?.status === 'failed') {
            workflowRequestInFlightRef.current = false;
            persistedNarrationStartedRef.current = false;
            setVoiceError(response.status_details?.error?.message || 'Atlas could not reply. Please retry.');
            setRealtimeState('listening');
          }
        } else if (type === 'error') {
          const eventId = String(event.event_id || '');
          if (eventId && ignoredRealtimeErrorIdsRef.current.delete(eventId)) return;
          const details = event.error as { message?: string } | undefined;
          workflowRequestInFlightRef.current = false;
          persistedNarrationStartedRef.current = false;
          setVoiceError(details?.message || 'Atlas realtime voice encountered an error.');
          setRealtimeState('listening');
        }
      };
      channel.onclose = () => {
        if (voiceChatActiveRef.current) stopRealtimeVoice();
      };

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      const answerResponse = await fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST',
        headers: { authorization: `Bearer ${ephemeralKey}`, 'content-type': 'application/sdp' },
        body: offer.sdp,
        signal: attempt.signal,
      });
      if (!answerResponse.ok) throw new Error((await answerResponse.text()) || 'Atlas could not establish the realtime audio connection.');
      const answer = await answerResponse.text();
      if (attempt.signal.aborted) return;
      await peer.setRemoteDescription({ type: 'answer', sdp: answer });
    } catch (error) {
      if (attempt.signal.aborted) return;
      window.clearTimeout(timeout);
      stopRealtimeVoice();
      setVoiceError(error instanceof DOMException && error.name === 'NotAllowedError'
        ? 'Microphone access was denied. Allow it in browser settings and try again.'
        : error instanceof Error ? error.message : 'Atlas could not start realtime voice.');
    }
  }, [persistRealtimeTurn, processRealtimeTranscript, realtimeState, stopRealtimeVoice]);

  const toggleVoiceChat = React.useCallback(() => {
    if (voiceChatActiveRef.current || realtimeState === 'connecting') stopRealtimeVoice();
    else void startRealtimeVoice();
  }, [realtimeState, startRealtimeVoice, stopRealtimeVoice]);

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
    <div className={`atlas-workspace flex h-full min-h-0 min-w-0 overflow-hidden flex-col ${chatExpanded ? 'gap-0' : 'gap-6'}`}>
      {/* Header */}
      <div className={`${chatExpanded ? 'hidden' : 'flex'} flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-zinc-800/60 pb-5 shrink-0`}>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white silver-text-gradient">Atlas Command Center</h1>
            <Badge variant="default" className="bg-zinc-900 border-zinc-800 text-zinc-300 py-0.5 px-2 flex items-center gap-1 font-semibold">
              <AtlasIcon className="atlas-proprietary-engine-icon h-3 w-3" />
              <span>Proprietary AI Engine</span>
            </Badge>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleNewChat} className="h-8 border-zinc-800 text-zinc-300 gap-1.5 self-start md:self-auto rounded-none bg-zinc-900 hover:bg-zinc-800">
          <Plus className="h-3.5 w-3.5" />
          <span>New Chat</span>
        </Button>
      </div>

      {/* Main Terminal Chat Interface */}
      <div className="flex flex-1 gap-6 overflow-hidden min-h-0">
        
        {/* Chat History Sidebar (Left) */}
        <div className={`${chatExpanded ? 'hidden' : 'hidden lg:flex'} h-full min-h-0 w-68 flex-col shrink-0 overflow-hidden border border-zinc-850 bg-[#0c0d12]/50 p-4 rounded-lg shadow-xl backdrop-blur-md`}>
          <div className="flex items-center justify-between pb-3 border-b border-zinc-850/60 mb-4 shrink-0">
            <div className="flex items-center gap-2 text-zinc-400">
              <AudioLines className="h-4 w-4 text-zinc-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-sans">Chat History</span>
            </div>
            <span className="text-[9px] font-semibold bg-zinc-900 border border-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded uppercase font-mono">
              {sessions.length} chats
            </span>
          </div>

          <div className="atlas-chat-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 space-y-2">
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
        <div onDoubleClick={(event) => { if ((event.target as HTMLElement).closest('button,input,textarea,a')) return; setChatExpanded(true); }} className={`${chatExpanded ? 'fixed inset-0 z-[80]' : 'relative'} flex min-h-0 flex-1 flex-col overflow-hidden rounded-none border border-zinc-800 bg-[#0d0e12] brushed-border`}>
          <button type="button" onClick={() => setChatExpanded((value) => !value)} className="absolute left-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full border border-zinc-700 bg-zinc-950/80 text-zinc-400 backdrop-blur hover:text-white" aria-label={chatExpanded ? 'Restore chat interface' : 'Expand chat interface'} title="Expand chat interface">
            {chatExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
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
          <div ref={messagesScrollRef} className="atlas-chat-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
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
                    ? <ProfileAvatar src={userAvatarUrl} name={initialData.userName} seed={initialData.userId} className="rounded-full" />
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
          </div>

          {(voiceChatActive || realtimeState === 'connecting') && (
            <div className="shrink-0 border-t border-zinc-800 bg-zinc-950/80 px-5 py-4 text-center" role="status">
              <div className="mx-auto mb-2 flex w-fit items-center gap-1">{[.5,.9,.65,1,.7].map((scale,index) => <i key={index} className="atlas-transcription-wave" style={{ '--wave-scale': scale, '--wave-delay': `${index * 80}ms` } as React.CSSProperties} />)}</div>
              <p className="text-sm text-white">{realtimeState === 'connecting' ? 'Connecting securely…' : realtimeState === 'speaking' ? liveAtlasText || 'Atlas is responding…' : liveVoiceText || 'Listening…'}</p>
            </div>
          )}
          {audioBlocked && <button type="button" className="px-5 py-2 text-sm text-white underline" onClick={() => {
            void realtimeAudioRef.current?.play().then(() => setAudioBlocked(false)).catch(() => setVoiceError('Audio is blocked. Allow sound for this site and retry.'));
          }}>Enable audio</button>}
          {/* Form Input area */}
          <div className="shrink-0 border-t border-zinc-800 p-4 bg-zinc-950/40">
            <form onSubmit={handleFormSubmit} className="flex items-end gap-2 sm:gap-3">
              <div className="relative min-w-0 flex-1" onDoubleClick={() => setComposerExpanded(true)}>
              {voiceState !== 'idle' ? (
                <div role="status" aria-label={voiceState === 'recording' ? 'Recording audio' : voiceState === 'requesting' ? 'Waiting for microphone' : 'Polishing transcript'} className={`${composerExpanded ? 'h-40' : 'h-11'} flex w-full items-center justify-between gap-1 overflow-hidden border border-zinc-800 bg-zinc-900/40 px-3`}>
                  {Array.from({ length: 64 }, (_, index) => <i aria-hidden="true" key={index} className="atlas-transcription-wave min-w-px flex-1" style={{ '--wave-scale': .3 + ((index * 7) % 11) / 14, '--wave-delay': `${index * 45}ms` } as React.CSSProperties} />)}
                </div>
              ) : (<>
              <button type="button" onClick={() => setComposerExpanded((value) => !value)} className="absolute left-2 top-2 z-10 grid h-6 w-6 place-items-center rounded-full text-zinc-500 hover:bg-zinc-800 hover:text-white" aria-label={composerExpanded ? 'Collapse message editor' : 'Expand message editor'}>
                {composerExpanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
              </button>
              <textarea
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask Atlas anything, or say “Create a project…”"
                onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !composerExpanded) { event.preventDefault(); void handleSendMessage(query); } }}
                className={`${composerExpanded ? 'h-40' : 'h-11'} block w-full resize-none rounded-none border border-zinc-800 bg-zinc-900/40 pb-2 pl-10 pr-4 pt-3 text-xs text-white placeholder-zinc-500 focus:border-zinc-700 focus:bg-zinc-900/80 focus:outline-none focus:ring-0 transition-[height,background-color,border-color] font-sans`}
              />
              </>)}
              </div>
              <button
                type="button"
                onClick={voiceState === 'recording' ? stopRecording : () => void startRecording()}
                disabled={voiceChatActive || realtimeState === 'connecting' || voiceState === 'requesting' || voiceState === 'transcribing'}
                className={`atlas-voice-button grid h-11 w-11 shrink-0 place-items-center rounded-full border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 active:bg-zinc-800 disabled:cursor-wait disabled:opacity-60 ${voiceState === 'recording' ? 'is-recording' : ''}`}
                aria-label={voiceState === 'recording' ? 'Stop recording' : voiceState === 'transcribing' ? 'Transcribing recording' : 'Transcribe'}
                aria-pressed={voiceState === 'recording'}
              >
                {voiceState === 'recording' ? <Square className="h-3.5 w-3.5 fill-current" /> : voiceState === 'transcribing' ? <AudioLines className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
              <button type="button" onClick={toggleVoiceChat} disabled={voiceState !== 'idle' || isLoading} className={`atlas-live-voice grid h-11 w-11 shrink-0 place-items-center rounded-full border ${voiceChatActive || realtimeState === 'connecting' ? 'is-active' : ''}`} aria-label={voiceChatActive || realtimeState === 'connecting' ? 'End voice conversation' : 'Start voice conversation'} aria-pressed={voiceChatActive} title="Realtime voice conversation">{realtimeState === 'connecting' ? <AudioLines className="h-4 w-4 animate-pulse" /> : <Radio className="h-4 w-4" />}</button>
              <Button type="submit" disabled={isLoading || voiceState !== 'idle' || realtimeState !== 'idle' || !query.trim()} className="h-11 w-11 px-0 bg-white hover:bg-zinc-200 text-zinc-950 shrink-0 rounded-none">
                <Send className="h-4 w-4" />
              </Button>
            </form>
            {(voiceState === 'recording' || voiceState === 'transcribing' || voiceError) && (
              <p role={voiceError ? 'alert' : 'status'} className={`mt-2 text-[10px] ${voiceError ? 'text-rose-400' : 'text-zinc-500'}`}>
                {voiceError || (voiceState === 'recording'
                  ? 'Recording... stop to polish and insert your transcript.'
                  : 'Polishing the live transcript...')}
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
