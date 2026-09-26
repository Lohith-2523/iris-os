'use client';

import * as React from 'react';
import { isMessagingTeamRole } from '@/lib/messaging/roles';
import { workspaceRoleLabel } from '@/lib/workspace-role-label';
import { CalendarPlus, Check, ChevronDown, CircleCheck, Clock3, FileText, Link2, LockKeyhole, MapPin, MessageCircle, Paperclip, Plus, Send, ShieldCheck, ShieldAlert, X } from 'lucide-react';
import { getMessagingProtocol } from '@/lib/messaging/protocol';
import { safeDownloadName, validateBrowserFile, type SafeAttachmentCategory } from '@/lib/file-security';
import type { MessagingLimits } from '@/lib/plan-entitlements';
import styles from './messages.module.css';
import { PageSkeleton } from '@/components/ui/page-skeletons';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { ChatFilePreview, type LoadedChatFile } from '@/components/ui/chat-file-preview';
import { SubscriptionPlanDialog } from '@/components/billing/subscription-plan-dialog';
import { normalizePlan, type PlanId } from '@/lib/plan-entitlements';
import { useWorkspaceRuntime } from '@/components/demo/demo-mode-provider';

type Person = { id: string; name: string; email: string; role: string; avatarUrl?: string | null };
type Conversation = {
  id: string;
  updatedAt: string;
  participant: Person | null;
  lastMessage: { id: string; senderUserId: string; createdAt: string; attachmentCount: number } | null;
  messages: WireMessage[];
  receiptStates: ReceiptState[];
};
type WireMessage = {
  id: string;
  clientMessageId: string;
  senderUserId: string;
  senderDeviceId: string;
  encryptedEnvelope: string;
  protocolVersion: number;
  createdAt: string;
  attachments: WireAttachment[];
};
type WireAttachment = {
  id: string;
  category: SafeAttachmentCategory;
  byteSize: number;
  encryptedMetadata: string;
  ciphertext?: string;
};
type DisplayAttachment = WireAttachment & { name: string | null; type: string | null };
type DeliveryState = 'sending' | 'sent' | 'read' | 'failed';
type DisplayMessage = Omit<WireMessage, 'attachments'> & {
  plaintext: string | null;
  attachments: DisplayAttachment[];
  deliveryState?: DeliveryState;
};
type ReceiptState = { messageId: string; clientMessageId: string; readAt: string | null };
type MeetingMessage = {
  kind: 'meeting';
  version: 1;
  eventId: string;
  title: string;
  description: string;
  location: string;
  meetingLink: string;
  startTime: string;
  endTime: string;
  timeZone: string;
};
type InboxPayload = {
  currentUserId: string;
  currentUserRole: string;
  directory: Person[];
  conversations: Conversation[];
  limits: MessagingLimits | null;
  plan?: string;
};

const shortTime = (value: string) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const MEETING_MESSAGE_PREFIX = 'IRIS_MEETING_V1:';
const serializeMeetingMessage = (meeting: MeetingMessage) => `${MEETING_MESSAGE_PREFIX}${JSON.stringify(meeting)}`;
const parseMeetingMessage = (value: string | null): MeetingMessage | null => {
  if (!value?.startsWith(MEETING_MESSAGE_PREFIX)) return null;
  try {
    const parsed = JSON.parse(value.slice(MEETING_MESSAGE_PREFIX.length)) as MeetingMessage;
    return parsed.kind === 'meeting' && parsed.version === 1 && parsed.title && parsed.startTime ? parsed : null;
  } catch {
    return null;
  }
};
const meetingTime = (meeting: MeetingMessage) => {
  const start = new Date(meeting.startTime);
  const end = new Date(meeting.endTime);
  try {
    return `${start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', timeZone: meeting.timeZone })} · ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: meeting.timeZone })}–${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: meeting.timeZone })}`;
  } catch {
    return `${start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} · ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}–${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
};
const safeMeetingLink = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : '';
  } catch {
    return '';
  }
};
const chatAccentPalette = ['#c49a58', '#8f7fbd', '#5f9b8e', '#b87777', '#6489ad', '#a57699', '#89935f', '#9a7a62'];
const chatAccent = (conversationId: string) => {
  const hash = Array.from(conversationId).reduce((value, character) => ((value * 31) + character.charCodeAt(0)) >>> 0, 0);
  return chatAccentPalette[hash % chatAccentPalette.length];
};

function DeliveryReceipt({ state }: { state: DeliveryState }) {
  if (state === 'failed') return <span className={styles.failedState}>Failed</span>;
  if (state === 'sending') return <span className={styles.sendingState}>Sending</span>;
  if (state === 'read') return <span className={styles.readReceipt} aria-label="Seen" title="Seen">
    <CircleCheck aria-hidden="true" size={15} strokeWidth={2.2} />
  </span>;
  return <span className={styles.sentReceipt} aria-label="Sent" title="Sent"><Check size={15} strokeWidth={2.4} /></span>;
}

function CreateMeetingDialog({ participant, onClose, onCreate }: {
  participant: Person;
  onClose: () => void;
  onCreate: (meeting: { title: string; description: string; location: string; meetingLink: string; startTime: string; endTime: string; timeZone: string; createGoogleMeet: boolean }) => Promise<void>;
}) {
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const nextHour = React.useMemo(() => {
    const value = new Date();
    value.setMinutes(0, 0, 0);
    value.setHours(value.getHours() + 1);
    return value;
  }, []);
  const [title, setTitle] = React.useState('');
  const [date, setDate] = React.useState(nextHour.toISOString().slice(0, 10));
  const [start, setStart] = React.useState(nextHour.toTimeString().slice(0, 5));
  const [end, setEnd] = React.useState(new Date(nextHour.getTime() + 60 * 60 * 1000).toTimeString().slice(0, 5));
  const [location, setLocation] = React.useState('');
  const [meetingLink, setMeetingLink] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [createGoogleMeet, setCreateGoogleMeet] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [dialogError, setDialogError] = React.useState('');
  const timeZone = React.useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', []);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!meetingLink.trim() && !createGoogleMeet) {
      setDialogError('Add a meeting link or ask IrisOS to create a Google Meet link.');
      return;
    }
    if (meetingLink.trim() && !safeMeetingLink(meetingLink.trim())) {
      setDialogError('Use a complete http or https meeting link.');
      return;
    }
    const startDate = new Date(`${date}T${start}`);
    const endDate = new Date(`${date}T${end}`);
    if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime())) {
      setDialogError('Choose a valid meeting date and time.');
      return;
    }
    const startTime = startDate.toISOString();
    const endTime = endDate.toISOString();
    if (startDate >= endDate) {
      setDialogError('The meeting end time must be later than its start time.');
      return;
    }
    setBusy(true);
    setDialogError('');
    try {
      await onCreate({ title: title.trim(), description: description.trim(), location: location.trim(), meetingLink: meetingLink.trim(), startTime, endTime, timeZone, createGoogleMeet });
    } catch (reason) {
      setDialogError(reason instanceof Error ? reason.message : 'The meeting could not be created.');
      setBusy(false);
    }
  };

  return <dialog ref={dialogRef} className={styles.meetingDialog} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }} onClick={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <form className={styles.meetingForm} onSubmit={(event) => void submit(event)}>
      <header className={styles.meetingDialogHeader}>
        <div><span className={styles.meetingDialogIcon}><CalendarPlus size={18} /></span><h2>Create meeting</h2><p>Schedule with {participant.name} and send the details in this encrypted conversation.</p></div>
        <button type="button" onClick={onClose} disabled={busy} aria-label="Close create meeting"><X size={17} /></button>
      </header>
      <div className={styles.meetingFields}>
        <label className={styles.fullField}><span>Meeting title</span><input required autoFocus value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label><span>Date</span><input required type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label><span>Start time</span><input required type="time" value={start} onChange={(event) => setStart(event.target.value)} /></label>
        <label><span>End time</span><input required type="time" value={end} onChange={(event) => setEnd(event.target.value)} /></label>
        <label><span>Location</span><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Office or room" /></label>
        <label className={styles.fullField}><span>Direct meeting link</span><input type="url" value={meetingLink} onChange={(event) => setMeetingLink(event.target.value)} placeholder="https://meet.example.com/…" /></label>
        <label className={`${styles.fullField} ${styles.meetToggle}`}><input type="checkbox" checked={createGoogleMeet} onChange={(event) => setCreateGoogleMeet(event.target.checked)} /><span>Create a Google Meet link from my connected calendar</span></label>
        <label className={styles.fullField}><span>Agenda and details</span><textarea rows={4} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
      </div>
      {dialogError && <p className={styles.dialogError} role="alert">{dialogError}</p>}
      <footer className={styles.meetingDialogFooter}><button type="button" onClick={onClose} disabled={busy}>Cancel</button><button type="submit" disabled={busy}>{busy ? 'Creating meeting…' : 'Create and send'}</button></footer>
    </form>
  </dialog>;
}

export default function MessagesClient({ initialInbox }: { initialInbox: InboxPayload }) {
  const runtime = useWorkspaceRuntime();
  const fetch = runtime.fetch;
  const [directory, setDirectory] = React.useState<Person[]>(initialInbox.directory);
  const [conversations, setConversations] = React.useState<Conversation[]>(initialInbox.conversations);
  const [selected, setSelected] = React.useState<Conversation | null>(null);
  const [messages, setMessages] = React.useState<DisplayMessage[]>([]);
  const [currentUserId, setCurrentUserId] = React.useState(initialInbox.currentUserId);
  const [currentUserRole, setCurrentUserRole] = React.useState(initialInbox.currentUserRole);
  const [audience, setAudience] = React.useState<'team' | 'clients'>('team');
  const [draft, setDraft] = React.useState('');
  const [error, setError] = React.useState('');
  const protocol = React.useMemo(() => getMessagingProtocol(), []);
  const [protocolReady, setProtocolReady] = React.useState(false);
  const [protocolError, setProtocolError] = React.useState('');
  const [attachments, setAttachments] = React.useState<File[]>([]);
  const [limits, setLimits] = React.useState<MessagingLimits | null>(initialInbox.limits);
  const [plan, setPlan] = React.useState<PlanId>(normalizePlan(initialInbox.plan));
  const [upgradePromptOpen, setUpgradePromptOpen] = React.useState(false);
  const [pageReady, setPageReady] = React.useState(false);
  const [conversationLoading, setConversationLoading] = React.useState(false);
  const [composerMenuOpen, setComposerMenuOpen] = React.useState(false);
  const [meetingDialogOpen, setMeetingDialogOpen] = React.useState(false);
  const [expandedMeetingId, setExpandedMeetingId] = React.useState('');
  const attachmentInputRef = React.useRef<HTMLInputElement>(null);
  const composerWrapRef = React.useRef<HTMLDivElement>(null);
  const cursorByConversationRef = React.useRef(new Map<string, { after: string; afterId: string }>());
  const activeConversationIdRef = React.useRef('');
  const currentUserIdRef = React.useRef(initialInbox.currentUserId);
  const protocolReadyRef = React.useRef(false);
  const syncingConversationIdsRef = React.useRef(new Set<string>());
  const decryptedMessageCacheRef = React.useRef(new Map<string, DisplayMessage>());
  const threadMessageCacheRef = React.useRef(new Map<string, DisplayMessage[]>());
  const attachmentFileCacheRef = React.useRef(new Map<string, Promise<LoadedChatFile>>());

  React.useEffect(() => {
    attachmentFileCacheRef.current.clear();
  }, [selected?.id]);

  const requestInbox = React.useCallback(async () => {
    const messagingResponse = await fetch('/api/messaging', { cache: 'no-store' });
    if (!messagingResponse.ok) {
      const payload = await messagingResponse.json().catch(() => ({}));
      throw new Error(payload.error || 'Unable to load secure messaging.');
    }
    return messagingResponse.json() as Promise<InboxPayload>;
  }, []);

  const applyInbox = React.useCallback((payload: InboxPayload) => {
    setDirectory(payload.directory || []);
    setConversations(payload.conversations || []);
    setCurrentUserId(payload.currentUserId);
    currentUserIdRef.current = payload.currentUserId;
    setCurrentUserRole(payload.currentUserRole || '');
    setLimits(payload.limits);
    if (payload.plan) setPlan(normalizePlan(payload.plan));
  }, []);

  const loadInbox = React.useCallback(async () => applyInbox(await requestInbox()), [applyInbox, requestInbox]);

  React.useEffect(() => {
    const syncInbox = () => {
      void loadInbox().catch((inboxError) => {
        setError(inboxError instanceof Error ? inboxError.message : 'Unable to refresh secure messaging.');
      });
    };
    const refresh = window.setInterval(syncInbox, 10_000);
    window.addEventListener('focus', syncInbox);
    return () => {
      window.clearInterval(refresh);
      window.removeEventListener('focus', syncInbox);
    };
  }, [loadInbox]);

  React.useEffect(() => {
    if (!composerMenuOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (!composerWrapRef.current?.contains(event.target as Node)) setComposerMenuOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setComposerMenuOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, [composerMenuOpen]);

  const loadMessages = React.useCallback(async (
    conversation: Conversation,
    options: {
      replace?: boolean;
      retryLocked?: boolean;
      preloaded?: { messages: WireMessage[]; receiptStates: ReceiptState[] };
    } = {},
  ) => {
    if (syncingConversationIdsRef.current.has(conversation.id)) return;
    syncingConversationIdsRef.current.add(conversation.id);
    try {
      let payload = options.preloaded;
      if (!payload) {
        const cursor = options.replace || options.retryLocked ? null : cursorByConversationRef.current.get(conversation.id);
        const query = new URLSearchParams({ conversationId: conversation.id });
        if (cursor?.after) {
          query.set('after', cursor.after);
          query.set('afterId', cursor.afterId);
        }
        const response = await fetch(`/api/messaging/messages?${query.toString()}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('Unable to retrieve encrypted messages.');
        payload = await response.json() as { messages: WireMessage[]; receiptStates: ReceiptState[] };
      }
      const wireMessages = payload.messages || [];
      const userId = currentUserIdRef.current;
      const decrypted = await Promise.all(wireMessages.map(async (message): Promise<DisplayMessage> => {
        const cacheKey = `${conversation.id}:${message.id}:${message.encryptedEnvelope}`;
        const cached = decryptedMessageCacheRef.current.get(cacheKey);
        if (cached) return { ...cached, ...message, plaintext: cached.plaintext, attachments: cached.attachments };
        if (runtime.isDemo) return {
          ...message,
          plaintext: message.encryptedEnvelope,
          attachments: [],
          deliveryState: message.senderUserId === userId ? 'read' : undefined,
        };
        if (!protocolReadyRef.current) return {
          ...message,
          plaintext: null,
          attachments: (message.attachments || []).map((attachment) => ({ ...attachment, name: null, type: null })),
          deliveryState: message.senderUserId === userId ? 'sent' : undefined,
        };
        try {
          const plaintext = await protocol.decrypt({
            conversationId: conversation.id,
            senderUserId: message.senderUserId,
            senderDeviceId: message.senderDeviceId,
            encryptedEnvelope: message.encryptedEnvelope,
            protocolVersion: message.protocolVersion,
          });
          const decryptedAttachments = await Promise.all((message.attachments || []).map(async (attachment) => {
            try {
              const metadata = JSON.parse(await protocol.decrypt({
                conversationId: conversation.id,
                senderUserId: message.senderUserId,
                senderDeviceId: message.senderDeviceId,
                encryptedEnvelope: attachment.encryptedMetadata,
                protocolVersion: message.protocolVersion,
              })) as { name?: string; type?: string };
              return { ...attachment, name: String(metadata.name || ''), type: String(metadata.type || '') };
            } catch {
              return { ...attachment, name: null, type: null };
            }
          }));
          const displayMessage = {
            ...message,
            plaintext,
            attachments: decryptedAttachments,
            deliveryState: message.senderUserId === userId ? 'sent' : undefined,
          } as DisplayMessage;
          decryptedMessageCacheRef.current.set(cacheKey, displayMessage);
          return displayMessage;
        } catch {
          return {
            ...message,
            plaintext: null,
            attachments: (message.attachments || []).map((attachment) => ({ ...attachment, name: null, type: null })),
            deliveryState: message.senderUserId === userId ? 'sent' : undefined,
          };
        }
      }));
      const receiptByMessageId = new Map((payload.receiptStates || []).map((receipt) => [receipt.messageId, receipt]));
      const receiptByClientId = new Map((payload.receiptStates || []).map((receipt) => [receipt.clientMessageId, receipt]));
      const current = threadMessageCacheRef.current.get(conversation.id) || [];
      const existingByClientId = new Map(current.map((message) => [message.clientMessageId, message]));
      const incoming = decrypted.map((message) => {
        const local = existingByClientId.get(message.clientMessageId);
        const receipt = receiptByMessageId.get(message.id) || receiptByClientId.get(message.clientMessageId);
        return {
          ...message,
          plaintext: local?.plaintext ?? message.plaintext,
          attachments: local?.attachments?.some((attachment) => attachment.name) ? local.attachments : message.attachments,
          deliveryState: message.senderUserId === userId ? (receipt?.readAt ? 'read' : 'sent') : undefined,
        } as DisplayMessage;
      });
      const merged = (options.replace ? incoming : [
        ...current.filter((message) => !incoming.some((item) => item.id === message.id || item.clientMessageId === message.clientMessageId)),
        ...incoming,
      ])
        .map((message) => {
          if (message.senderUserId !== userId) return message;
          const receipt = receiptByMessageId.get(message.id) || receiptByClientId.get(message.clientMessageId);
          return receipt?.readAt ? { ...message, deliveryState: 'read' as const } : message;
        })
        .sort((first, second) => new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime());
      threadMessageCacheRef.current.set(conversation.id, merged);
      if (activeConversationIdRef.current === conversation.id) setMessages(merged);

      const lastMessage = wireMessages.at(-1);
      if (lastMessage) cursorByConversationRef.current.set(conversation.id, { after: lastMessage.createdAt, afterId: lastMessage.id });
      if (activeConversationIdRef.current === conversation.id && wireMessages.some((message) => message.senderUserId !== userId)) {
        void fetch('/api/messaging/messages', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId: conversation.id }),
        });
      }
    } finally {
      syncingConversationIdsRef.current.delete(conversation.id);
    }
  }, [protocol, runtime.isDemo]);

  React.useEffect(() => {
    let current = true;
    void (async () => {
      applyInbox(initialInbox);
      try {
        if (!runtime.isDemo) await protocol.prepare({ userId: initialInbox.currentUserId });
        if (!current) return;
        protocolReadyRef.current = true;
        setProtocolReady(true);
      } catch (prepareError) {
        if (!current) return;
        setProtocolError(prepareError instanceof Error ? prepareError.message : 'Secure device setup failed.');
      }

      for (let index = 0; current && index < initialInbox.conversations.length; index += 2) {
        await Promise.all(initialInbox.conversations.slice(index, index + 2).map((conversation) => loadMessages(conversation, {
          replace: true,
          preloaded: { messages: conversation.messages, receiptStates: conversation.receiptStates },
        })));
      }
    })()
      .catch((inboxError) => {
        if (current) setError(inboxError instanceof Error ? inboxError.message : 'Unable to prepare messaging.');
      })
      .finally(() => { if (current) setPageReady(true); });
    return () => { current = false; };
  }, [applyInbox, initialInbox, loadMessages, protocol, runtime.isDemo]);

  React.useEffect(() => {
    if (!selected) return;
    activeConversationIdRef.current = selected.id;
    const cachedMessages = threadMessageCacheRef.current.get(selected.id);
    setMessages(cachedMessages || []);
    setConversationLoading(cachedMessages === undefined);
    const sync = () => {
      const retryLocked = Boolean(threadMessageCacheRef.current.get(selected.id)?.some((message) => message.plaintext === null));
      void loadMessages(selected, { retryLocked }).catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load messages.'));
    };
    if (cachedMessages === undefined) {
      void loadMessages(selected, { replace: true })
        .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load messages.'))
        .finally(() => setConversationLoading(false));
    } else if (cachedMessages.some((message) => message.senderUserId !== currentUserIdRef.current)) {
      void fetch('/api/messaging/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selected.id }),
      });
    }

    const stream = new EventSource(`/api/messaging/stream?conversationId=${encodeURIComponent(selected.id)}`);
    stream.addEventListener('change', sync);
    const fallback = window.setInterval(sync, 10_000);
    window.addEventListener('focus', sync);
    return () => {
      activeConversationIdRef.current = '';
      stream.close();
      window.clearInterval(fallback);
      window.removeEventListener('focus', sync);
    };
  }, [loadMessages, selected]);

  const updateActiveMessages = React.useCallback((update: (current: DisplayMessage[]) => DisplayMessage[]) => {
    setMessages((current) => {
      const next = update(current);
      const conversationId = activeConversationIdRef.current;
      if (conversationId) threadMessageCacheRef.current.set(conversationId, next);
      return next;
    });
  }, []);

  async function startConversation(person: Person) {
    setError('');
    const response = await fetch('/api/messaging', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantUserId: person.id }),
    });
    const payload = await response.json();
    if (!response.ok) return setError(payload.error || 'Unable to start conversation.');
    const conversation: Conversation = { ...payload.conversation, lastMessage: null, messages: [], receiptStates: [] };
    threadMessageCacheRef.current.set(conversation.id, []);
    setSelected(conversation);
    await loadInbox();
  }

  async function sendMessage(messageOverride?: string, attachmentOverride?: File[]) {
    const plaintext = messageOverride ?? (draft.trim() || 'Sent an encrypted attachment.');
    const queuedAttachments = attachmentOverride ?? [...attachments];
    if (!selected?.participant || !protocolReady || (!plaintext.trim() && queuedAttachments.length === 0)) return;
    if (plan === 'BASIC') {
      setUpgradePromptOpen(true);
      return;
    }
    const conversation = selected;
    const recipient = selected.participant;
    const clientMessageId = crypto.randomUUID();
    const clientCreatedAt = new Date().toISOString();
    const optimisticMessage: DisplayMessage = {
      id: `optimistic:${clientMessageId}`,
      clientMessageId,
      senderUserId: currentUserId,
      senderDeviceId: '',
      encryptedEnvelope: '',
      protocolVersion: 1,
      createdAt: clientCreatedAt,
      plaintext,
      attachments: queuedAttachments.map((file, index) => ({
        id: `optimistic-attachment:${clientMessageId}:${index}`,
        category: 'DOCUMENT',
        byteSize: file.size,
        encryptedMetadata: '',
        ciphertext: '',
        name: file.name,
        type: file.type || 'application/octet-stream',
      })),
      deliveryState: 'sending',
    };

    setError('');
    if (messageOverride === undefined) setDraft('');
    if (attachmentOverride === undefined) setAttachments([]);
    updateActiveMessages((current) => [...current, optimisticMessage]);
    try {
      let encrypted = await protocol.encrypt({
        conversationId: conversation.id,
        recipientUserId: recipient.id,
        plaintext,
      });
      const encryptedAttachments = await Promise.all(queuedAttachments.map(async (file) => {
        const validation = await validateBrowserFile(file, 'message-attachment');
        if (!validation.ok || !validation.category) throw new Error(validation.ok ? 'Unsupported attachment.' : validation.error);
        const transfer = await protocol.encryptAttachment({ recipientUserId: recipient.id, plaintext: new Uint8Array(await file.arrayBuffer()) });
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(transfer.ciphertext));
        const metadata = await protocol.encrypt({ conversationId: conversation.id, recipientUserId: recipient.id, plaintext: JSON.stringify({ name: file.name, type: file.type || 'application/octet-stream' }) });
        return { storageObjectId: crypto.randomUUID(), category: validation.category, byteSize: file.size, ciphertextSha256: Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join(''), encryptedMetadata: metadata.encryptedEnvelope, ciphertext: transfer.ciphertext };
      }));
      const basePayload = {
        conversationId: conversation.id,
        clientMessageId,
        clientCreatedAt,
        attachments: encryptedAttachments,
      };
      const postMessage = (envelope: typeof encrypted) => fetch('/api/messaging/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...basePayload, ...envelope }),
      });
      let response = await postMessage(encrypted);
      let payload = await response.json();
      if (response.status === 403 && payload.error === 'Registered sender device not found.') {
        await protocol.prepare({ userId: currentUserId, force: true });
        encrypted = await protocol.encrypt({
          conversationId: conversation.id,
          recipientUserId: recipient.id,
          plaintext,
        });
        response = await postMessage(encrypted);
        payload = await response.json();
      }
      if (!response.ok) throw new Error(payload.error || 'Unable to send message.');
      updateActiveMessages((current) => current.map((message) => message.clientMessageId === clientMessageId ? {
        ...message,
        id: payload.message.id,
        senderDeviceId: encrypted.senderDeviceId,
        encryptedEnvelope: encrypted.encryptedEnvelope,
        protocolVersion: encrypted.protocolVersion,
        createdAt: payload.message.createdAt,
        deliveryState: 'sent',
      } : message));
      setConversations((current) => current.map((item) => item.id === conversation.id ? {
        ...item,
        updatedAt: payload.message.createdAt,
        lastMessage: {
          id: payload.message.id,
          senderUserId: currentUserId,
          createdAt: payload.message.createdAt,
          attachmentCount: encryptedAttachments.length,
        },
      } : item));
    } catch (sendError) {
      updateActiveMessages((current) => messageOverride !== undefined
        ? current.filter((message) => message.clientMessageId !== clientMessageId)
        : current.map((message) => message.clientMessageId === clientMessageId
          ? { ...message, deliveryState: 'failed' }
          : message));
      setError(sendError instanceof Error ? sendError.message : 'Unable to send message.');
      if (messageOverride !== undefined) throw sendError;
    }
  }

  async function createMeeting(input: { title: string; description: string; location: string; meetingLink: string; startTime: string; endTime: string; timeZone: string; createGoogleMeet: boolean }) {
    if (!selected?.participant) throw new Error('Select a conversation before creating a meeting.');
    if (plan === 'BASIC') {
      setMeetingDialogOpen(false);
      setUpgradePromptOpen(true);
      return;
    }
    const response = await fetch('/api/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, attendees: [selected.participant.email], isRecurring: false, recurrence: 'NONE' }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'The calendar event could not be created.');
    const meeting: MeetingMessage = {
      kind: 'meeting',
      version: 1,
      eventId: String(payload.event.id),
      title: String(payload.event.title),
      description: String(payload.event.description || input.description || ''),
      location: String(payload.event.location || input.location || ''),
      meetingLink: String(payload.event.meetLink || input.meetingLink || ''),
      startTime: new Date(payload.event.startTime || input.startTime).toISOString(),
      endTime: new Date(payload.event.endTime || input.endTime).toISOString(),
      timeZone: input.timeZone,
    };
    try {
      await sendMessage(serializeMeetingMessage(meeting), []);
      setMeetingDialogOpen(false);
    } catch (reason) {
      await fetch(`/api/calendar?id=${encodeURIComponent(meeting.eventId)}`, { method: 'DELETE' }).catch(() => undefined);
      throw reason;
    }
  }

  async function queueAttachments(files: FileList | null) {
    if (!files?.length) return;
    try {
      if (!limits) throw new Error('Attachment limits are still loading.');
      const queued = [...attachments];
      for (const file of Array.from(files)) {
        if (queued.length >= limits.attachmentsPerMessage) throw new Error(`A message can contain up to ${limits.attachmentsPerMessage} attachments.`);
        const validation = await validateBrowserFile(file, 'message-attachment');
        if (!validation.ok || !validation.category) throw new Error(validation.ok ? 'Unsupported attachment.' : validation.error);
        const categoryLimit = validation.category === 'IMAGE' ? limits.imageBytes
          : validation.category === 'GIF' ? limits.gifBytes
            : validation.category === 'VOICE' ? limits.voiceBytes
              : validation.category === 'VIDEO' ? limits.videoBytes
                : validation.category === 'ARCHIVE' ? limits.archiveBytes
                  : limits.documentBytes;
        if (file.size > categoryLimit) throw new Error(`${file.name} exceeds this plan's file-size limit.`);
        if (queued.reduce((total, item) => total + item.size, 0) + file.size > limits.combinedAttachmentBytes) {
          throw new Error('The combined attachment payload exceeds this plan’s limit.');
        }
        queued.push(file);
      }
      setAttachments(queued);
      setError('');
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'The selected attachment is not permitted.');
    } finally {
      if (attachmentInputRef.current) attachmentInputRef.current.value = '';
    }
  }

  async function loadAttachmentFile(message: DisplayMessage, attachment: DisplayAttachment, signal: AbortSignal) {
    if (!attachment.name || !attachment.type) throw new Error('Encrypted attachment metadata is unavailable on this device.');
    if (!selected) throw new Error('Select a conversation before opening an attachment.');
    const attachmentName = attachment.name;
    const attachmentType = attachment.type;
    const conversationId = selected.id;
    const cached = attachmentFileCacheRef.current.get(attachment.id);
    if (cached) return cached;
    const pending = (async (): Promise<LoadedChatFile> => {
      let ciphertext = attachment.ciphertext;
      if (!ciphertext) {
        const query = new URLSearchParams({ conversationId, attachmentId: attachment.id });
        const response = await fetch(`/api/messaging/messages?${query.toString()}`, { cache: 'no-store', signal });
        const payload = await response.json().catch(() => ({})) as { attachment?: { ciphertext?: string }; error?: string };
        if (!response.ok || !payload.attachment?.ciphertext) throw new Error(payload.error || 'Unable to retrieve encrypted attachment.');
        ciphertext = payload.attachment.ciphertext;
      }
      const bytes = await protocol.decryptAttachment({
        senderUserId: message.senderUserId,
        senderDeviceId: message.senderDeviceId,
        ciphertext,
      });
      const copy = Uint8Array.from(bytes);
      const validation = await validateBrowserFile({
        name: attachmentName,
        type: attachmentType,
        size: copy.byteLength,
        arrayBuffer: async () => copy.buffer,
      }, 'message-attachment');
      if (!validation.ok) throw new Error(validation.error);
      return { blob: new Blob([copy], { type: attachmentType }), fileName: safeDownloadName(attachmentName), mimeType: attachmentType };
    })();
    attachmentFileCacheRef.current.set(attachment.id, pending);
    pending.catch(() => attachmentFileCacheRef.current.delete(attachment.id));
    return pending;
  }

  if (!pageReady) {
    return <PageSkeleton variant="messages" />;
  }

  const isAdmin = currentUserRole.toLowerCase() === 'admin';
  const matchesAudience = (person: Person | null) => Boolean(person) && (audience === 'clients'
    ? person!.role.toLowerCase() === 'client'
    : isMessagingTeamRole(person!.role));
  const visibleDirectory = isAdmin ? directory.filter(matchesAudience) : directory;
  const visibleConversations = isAdmin ? conversations.filter((conversation) => matchesAudience(conversation.participant)) : conversations;

  const selectAudience = (nextAudience: 'team' | 'clients') => {
    setAudience(nextAudience);
    if (selected?.participant) {
      const selectedIsClient = selected.participant.role.toLowerCase() === 'client';
      if ((nextAudience === 'clients') !== selectedIsClient) setSelected(null);
    }
  };

  return (
    <section className={styles.shell} aria-label="Secure messaging workspace">
      <div className={styles.frame}>
        <aside className={styles.rail}>
          <header className={styles.railHeader}>
            <div className={styles.eyebrow}>IrisOS Secure</div>
            <h1 className={styles.title}>Messages</h1>
            <p className={styles.subtitle}>Private owner-to-client and owner-to-team conversations.</p>
          </header>
          <div className={styles.directory}>
            {isAdmin && <div className={styles.audienceTabs} role="tablist" aria-label="Conversation audience">
              <button type="button" role="tab" aria-selected={audience === 'team'} className={audience === 'team' ? styles.activeAudience : ''} onClick={() => selectAudience('team')}>Teams</button>
              <button type="button" role="tab" aria-selected={audience === 'clients'} className={audience === 'clients' ? styles.activeAudience : ''} onClick={() => selectAudience('clients')}>Clients</button>
            </div>}
            <div className={styles.sectionLabel}>{isAdmin ? `${audience === 'team' ? 'Team' : 'Client'} directory` : 'Start a secure conversation'}</div>
            <div className={styles.contactStrip}>
              {visibleDirectory.map((person) => (
                <button key={person.id} className={styles.contactButton} onClick={() => void startConversation(person)} title={person.email}>
                  <ProfileAvatar src={person.avatarUrl} name={person.name} seed={person.id} className={styles.avatar} />
                  <span className={styles.contactName}>{person.name.split(' ')[0]}</span>
                </button>
              ))}
              {visibleDirectory.length === 0 && <span className={styles.directoryEmpty}>No {audience === 'team' ? 'team members' : 'clients'} available.</span>}
            </div>
          </div>
          <div className={styles.threadList}>
            <div className={styles.sectionLabel}>{isAdmin ? `${audience === 'team' ? 'Team' : 'Client'} conversations` : 'Conversations'}</div>
            {visibleConversations.map((conversation) => conversation.participant && (
              <button
                key={conversation.id}
                className={`${styles.threadButton} ${selected?.id === conversation.id ? styles.activeThread : ''}`}
                style={{ '--chat-accent': chatAccent(conversation.id) } as React.CSSProperties}
                onClick={() => setSelected(conversation)}
              >
                <ProfileAvatar src={conversation.participant.avatarUrl} name={conversation.participant.name} seed={conversation.participant.id} className={styles.avatar} />
                <span>
                  <span className={styles.threadName}>{conversation.participant.name}</span>
                  <span className={styles.threadMeta}>{conversation.lastMessage ? 'Encrypted message' : workspaceRoleLabel(conversation.participant.role)}</span>
                </span>
                <span className={styles.time}>{shortTime(conversation.updatedAt)}</span>
              </button>
            ))}
            {visibleConversations.length === 0 && <div className={styles.threadEmpty}>No conversations in this section yet.</div>}
          </div>
          {error && <div className={styles.error}>{error}</div>}
        </aside>

        <main className={styles.chat}>
          {!selected?.participant ? (
            <div className={styles.empty}>
              <div>
                <span className={styles.emptyIcon}><MessageCircle size={24} /></span>
                <h2>Select a conversation</h2>
                <p>Agency owners can message clients and team members. Client and team accounts can only message an agency owner.</p>
              </div>
            </div>
          ) : (
            <>
              <header className={styles.chatHeader}>
                <div className={styles.identity}>
                  <ProfileAvatar src={selected.participant.avatarUrl} name={selected.participant.name} seed={selected.participant.id} className={styles.avatar} />
                  <div><div className={styles.threadName}>{selected.participant.name}</div><div className={styles.threadMeta}>{workspaceRoleLabel(selected.participant.role)} · {selected.participant.email}</div></div>
                </div>
                <span className={`${styles.securePill} ${protocolReady ? styles.secureReady : ''}`}>
                  {protocolReady ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
                  {protocolReady ? 'Account encryption active' : 'Preparing account encryption'}
                </span>
              </header>
              <div className={styles.messages} aria-live="polite">
                {conversationLoading ? (
                  <div className={styles.threadLoading} role="status">Decrypting conversation…</div>
                ) : messages.length === 0 ? (
                  <div className={styles.empty}><div><span className={styles.emptyIcon}><LockKeyhole size={23} /></span><h2>A private conversation</h2><p>Encrypted with keys secured to your account</p></div></div>
                ) : messages.map((message) => {
                  const meeting = parseMeetingMessage(message.plaintext);
                  const meetingExpanded = expandedMeetingId === message.id;
                  return <div key={message.id} className={`${styles.bubble} ${meeting ? styles.meetingBubble : ''} ${message.senderUserId === currentUserId ? styles.mine : ''}`}>
                    {meeting ? <div className={styles.meetingMessage}>
                      <button type="button" className={styles.meetingMessageHeading} aria-expanded={meetingExpanded} onClick={() => setExpandedMeetingId(meetingExpanded ? '' : message.id)}><span className={styles.meetingMessageIcon}><CalendarPlus size={17} /></span><span><strong>{meeting.title}</strong><small>{meetingTime(meeting)}</small></span><ChevronDown className={meetingExpanded ? styles.meetingChevronOpen : ''} size={16} /></button>
                      {meetingExpanded && <div className={styles.meetingDetails}>
                        {meeting.description && <span>{meeting.description}</span>}
                        {meeting.location && <span><MapPin size={14} />{meeting.location}</span>}
                        <span><Clock3 size={14} />{meetingTime(meeting)} · {meeting.timeZone}</span>
                        {safeMeetingLink(meeting.meetingLink) && <a href={safeMeetingLink(meeting.meetingLink)} target="_blank" rel="noreferrer"><Link2 size={14} />Open meeting link</a>}
                      </div>}
                    </div> : (message.plaintext || 'Encrypted message — syncing account key…')}
                    {message.attachments.length > 0 && (
                      <div className={styles.receivedAttachments}>
                        {message.attachments.map((attachment) => (
                          <ChatFilePreview
                            key={attachment.id}
                            fileKey={attachment.id}
                            fileName={attachment.name || 'Encrypted attachment'}
                            mimeType={attachment.type}
                            byteSize={attachment.byteSize}
                            loadFile={(signal) => loadAttachmentFile(message, attachment, signal)}
                          />
                        ))}
                      </div>
                    )}
                    <div className={styles.bubbleMeta}>
                      <span>{shortTime(message.createdAt)}</span>
                      {message.senderUserId === currentUserId && message.deliveryState && (
                        <span className={styles.deliveryState}><DeliveryReceipt state={message.deliveryState} /></span>
                      )}
                    </div>
                  </div>;
                })}
              </div>
              <div ref={composerWrapRef} className={styles.composerWrap}>
                {!protocolReady && <div className={styles.protocolNotice}><ShieldAlert size={15} /><span>{protocolError || 'Restoring the encryption keys secured to your account. Sending remains locked until setup completes.'}</span></div>}
                <div className={styles.composer}>
                  <input ref={attachmentInputRef} className={styles.fileInput} type="file" multiple accept=".png,.jpg,.jpeg,.webp,.gif,.avif,.mp3,.m4a,.ogg,.wav,.webm,.mp4,.mov,.pdf,.txt,.csv,.docx,.xlsx,.pptx,.zip" onChange={(event) => void queueAttachments(event.target.files)} />
                  <textarea className={styles.input} rows={2} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a secure message…" disabled={!protocolReady} />
                  <button className={styles.attach} type="button" onClick={() => setComposerMenuOpen((current) => !current)} disabled={!protocolReady} aria-expanded={composerMenuOpen} aria-label="Add to message"><Plus size={19} /></button>
                  <button className={styles.send} onClick={() => void sendMessage()} disabled={!protocolReady || (!draft.trim() && attachments.length === 0)} aria-label="Send encrypted message"><Send size={17} /></button>
                </div>
                {composerMenuOpen && <div className={styles.composerMenu} role="menu">
                  <button type="button" role="menuitem" onClick={() => { setComposerMenuOpen(false); setMeetingDialogOpen(true); }}><CalendarPlus size={17} /><span><strong>Create meeting</strong><small>Schedule and send an encrypted meeting card</small></span></button>
                  <button type="button" role="menuitem" onClick={() => { setComposerMenuOpen(false); attachmentInputRef.current?.click(); }}><Paperclip size={17} /><span><strong>Attach file</strong><small>Add a securely encrypted file</small></span></button>
                </div>}
                {attachments.length > 0 && <div className={styles.attachments}>{attachments.map((file, index) => <span className={styles.attachment} key={`${file.name}-${index}`}><FileText size={13} />{file.name}<button type="button" onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${file.name}`}><X size={12} /></button></span>)}</div>}
              </div>
            </>
          )}
        </main>
      </div>
      {meetingDialogOpen && selected?.participant && <CreateMeetingDialog participant={selected.participant} onClose={() => setMeetingDialogOpen(false)} onCreate={createMeeting} />}
      <SubscriptionPlanDialog
        open={upgradePromptOpen}
        currentPlan={plan}
        feature="sending messages"
        requiredPlan="PRO"
        canManage={isAdmin}
        onClose={() => setUpgradePromptOpen(false)}
        onPlanChanged={(nextPlan) => {
          setPlan(nextPlan);
          setUpgradePromptOpen(false);
          void loadInbox();
        }}
      />
    </section>
  );
}
