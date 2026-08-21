'use client';

import * as React from 'react';
import { Download, FileText, LoaderCircle, LockKeyhole, MessageCircle, Paperclip, Send, ShieldCheck, ShieldAlert, X } from 'lucide-react';
import { getMessagingProtocol } from '@/lib/messaging/protocol';
import { safeDownloadName, validateBrowserFile, type SafeAttachmentCategory } from '@/lib/file-security';
import type { MessagingLimits } from '@/lib/plan-entitlements';
import styles from './messages.module.css';
import { PageSkeleton } from '@/components/ui/page-skeletons';

type Person = { id: string; name: string; email: string; role: string; avatarUrl?: string | null };
type Conversation = {
  id: string;
  updatedAt: string;
  participant: Person | null;
  lastMessage: { id: string; senderUserId: string; createdAt: string; attachmentCount: number } | null;
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
  ciphertext: string;
};
type DisplayAttachment = WireAttachment & { name: string | null; type: string | null };
type DeliveryState = 'sending' | 'sent' | 'read' | 'failed';
type DisplayMessage = Omit<WireMessage, 'attachments'> & {
  plaintext: string | null;
  attachments: DisplayAttachment[];
  deliveryState?: DeliveryState;
};
type ReceiptState = { messageId: string; clientMessageId: string; readAt: string | null };
type InboxPayload = {
  currentUserId: string;
  currentUserRole: string;
  directory: Person[];
  conversations: Conversation[];
  limits: MessagingLimits;
};

const initials = (name: string) => name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
const shortTime = (value: string) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const chatAccentPalette = ['#c49a58', '#8f7fbd', '#5f9b8e', '#b87777', '#6489ad', '#a57699', '#89935f', '#9a7a62'];
const chatAccent = (conversationId: string) => {
  const hash = Array.from(conversationId).reduce((value, character) => ((value * 31) + character.charCodeAt(0)) >>> 0, 0);
  return chatAccentPalette[hash % chatAccentPalette.length];
};

export default function MessagesPage() {
  const [directory, setDirectory] = React.useState<Person[]>([]);
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [selected, setSelected] = React.useState<Conversation | null>(null);
  const [messages, setMessages] = React.useState<DisplayMessage[]>([]);
  const [currentUserId, setCurrentUserId] = React.useState('');
  const [currentUserRole, setCurrentUserRole] = React.useState('');
  const [audience, setAudience] = React.useState<'team' | 'clients'>('team');
  const [draft, setDraft] = React.useState('');
  const [error, setError] = React.useState('');
  const protocol = React.useMemo(() => getMessagingProtocol(), []);
  const [protocolReady, setProtocolReady] = React.useState(false);
  const [protocolError, setProtocolError] = React.useState('');
  const [attachments, setAttachments] = React.useState<File[]>([]);
  const [limits, setLimits] = React.useState<MessagingLimits | null>(null);
  const [pageReady, setPageReady] = React.useState(false);
  const [conversationLoading, setConversationLoading] = React.useState(false);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = React.useState('');
  const attachmentInputRef = React.useRef<HTMLInputElement>(null);
  const cursorRef = React.useRef<{ conversationId: string; after: string; afterId: string } | null>(null);
  const activeConversationIdRef = React.useRef('');
  const syncingConversationIdsRef = React.useRef(new Set<string>());

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
    setCurrentUserRole(payload.currentUserRole || '');
    setLimits(payload.limits);
  }, []);

  const loadInbox = React.useCallback(async () => applyInbox(await requestInbox()), [applyInbox, requestInbox]);

  React.useEffect(() => {
    let current = true;
    void requestInbox()
      .then(async (inbox) => {
        if (!current) return;
        applyInbox(inbox);
        try {
          await protocol.prepare({ userId: inbox.currentUserId });
          if (current) setProtocolReady(true);
        } catch (prepareError) {
          if (current) setProtocolError(prepareError instanceof Error ? prepareError.message : 'Secure device setup failed.');
        }
      })
      .catch((inboxError) => {
        if (current) setError(inboxError instanceof Error ? inboxError.message : 'Unable to load messaging.');
      })
      .finally(() => { if (current) setPageReady(true); });
    return () => { current = false; };
  }, [applyInbox, protocol, requestInbox]);

  const loadMessages = React.useCallback(async (conversation: Conversation, initial = false) => {
    if (syncingConversationIdsRef.current.has(conversation.id)) return;
    syncingConversationIdsRef.current.add(conversation.id);
    try {
      const cursor = !initial && cursorRef.current?.conversationId === conversation.id ? cursorRef.current : null;
      const query = new URLSearchParams({ conversationId: conversation.id });
      if (cursor?.after) {
        query.set('after', cursor.after);
        query.set('afterId', cursor.afterId);
      }
      const response = await fetch(`/api/messaging/messages?${query.toString()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Unable to retrieve encrypted messages.');
      const payload = await response.json() as { messages: WireMessage[]; receiptStates: ReceiptState[] };
      const wireMessages = payload.messages || [];
      const decrypted = await Promise.all(wireMessages.map(async (message): Promise<DisplayMessage> => {
        if (!protocolReady) return {
          ...message,
          plaintext: null,
          attachments: (message.attachments || []).map((attachment) => ({ ...attachment, name: null, type: null })),
          deliveryState: message.senderUserId === currentUserId ? 'sent' : undefined,
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
          return {
            ...message,
            plaintext,
            attachments: decryptedAttachments,
            deliveryState: message.senderUserId === currentUserId ? 'sent' : undefined,
          };
        } catch {
          return {
            ...message,
            plaintext: null,
            attachments: (message.attachments || []).map((attachment) => ({ ...attachment, name: null, type: null })),
            deliveryState: message.senderUserId === currentUserId ? 'sent' : undefined,
          };
        }
      }));
      if (activeConversationIdRef.current !== conversation.id) return;

      const receiptByMessageId = new Map((payload.receiptStates || []).map((receipt) => [receipt.messageId, receipt]));
      const receiptByClientId = new Map((payload.receiptStates || []).map((receipt) => [receipt.clientMessageId, receipt]));
      setMessages((current) => {
        const existingByClientId = new Map(current.map((message) => [message.clientMessageId, message]));
        const incoming = decrypted.map((message) => {
          const local = existingByClientId.get(message.clientMessageId);
          const receipt = receiptByMessageId.get(message.id) || receiptByClientId.get(message.clientMessageId);
          return {
            ...message,
            plaintext: local?.plaintext ?? message.plaintext,
            attachments: local?.attachments?.length ? local.attachments : message.attachments,
            deliveryState: message.senderUserId === currentUserId ? (receipt?.readAt ? 'read' : 'sent') : undefined,
          } as DisplayMessage;
        });
        const merged = initial ? incoming : [
          ...current.filter((message) => !incoming.some((item) => item.id === message.id || item.clientMessageId === message.clientMessageId)),
          ...incoming,
        ];
        return merged
          .map((message) => {
            if (message.senderUserId !== currentUserId) return message;
            const receipt = receiptByMessageId.get(message.id) || receiptByClientId.get(message.clientMessageId);
            return receipt?.readAt ? { ...message, deliveryState: 'read' as const } : message;
          })
          .sort((first, second) => new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime());
      });

      const lastMessage = wireMessages.at(-1);
      if (lastMessage) cursorRef.current = { conversationId: conversation.id, after: lastMessage.createdAt, afterId: lastMessage.id };
      if (wireMessages.some((message) => message.senderUserId !== currentUserId)) {
        void fetch('/api/messaging/messages', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId: conversation.id }),
        });
      }
    } finally {
      syncingConversationIdsRef.current.delete(conversation.id);
    }
  }, [currentUserId, protocol, protocolReady]);

  React.useEffect(() => {
    if (!selected) return;
    activeConversationIdRef.current = selected.id;
    cursorRef.current = null;
    setMessages([]);
    setConversationLoading(true);
    const sync = () => void loadMessages(selected).catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load messages.'));
    void loadMessages(selected, true)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load messages.'))
      .finally(() => setConversationLoading(false));

    const stream = new EventSource(`/api/messaging/stream?conversationId=${encodeURIComponent(selected.id)}`);
    stream.addEventListener('change', sync);
    const fallback = window.setInterval(sync, 1_000);
    return () => {
      activeConversationIdRef.current = '';
      stream.close();
      window.clearInterval(fallback);
    };
  }, [loadMessages, selected]);

  async function startConversation(person: Person) {
    setError('');
    const response = await fetch('/api/messaging', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantUserId: person.id }),
    });
    const payload = await response.json();
    if (!response.ok) return setError(payload.error || 'Unable to start conversation.');
    const conversation: Conversation = { ...payload.conversation, lastMessage: null };
    setSelected(conversation);
    await loadInbox();
  }

  async function sendMessage() {
    if (!selected?.participant || !protocolReady || (!draft.trim() && attachments.length === 0)) return;
    const conversation = selected;
    const recipient = selected.participant;
    const plaintext = draft.trim() || 'Sent an encrypted attachment.';
    const queuedAttachments = [...attachments];
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
    setDraft('');
    setAttachments([]);
    setMessages((current) => [...current, optimisticMessage]);
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
      setMessages((current) => current.map((message) => message.clientMessageId === clientMessageId ? {
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
      setMessages((current) => current.map((message) => message.clientMessageId === clientMessageId
        ? { ...message, deliveryState: 'failed' }
        : message));
      setError(sendError instanceof Error ? sendError.message : 'Unable to send message.');
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

  async function downloadAttachment(message: DisplayMessage, attachment: DisplayAttachment) {
    if (!attachment.name || !attachment.type) return setError('Encrypted attachment metadata is unavailable on this device.');
    setDownloadingAttachmentId(attachment.id);
    setError('');
    try {
      const bytes = await protocol.decryptAttachment({
        senderUserId: message.senderUserId,
        senderDeviceId: message.senderDeviceId,
        ciphertext: attachment.ciphertext,
      });
      const copy = Uint8Array.from(bytes);
      const validation = await validateBrowserFile({
        name: attachment.name,
        type: attachment.type,
        size: copy.byteLength,
        arrayBuffer: async () => copy.buffer,
      }, 'message-attachment');
      if (!validation.ok) throw new Error(validation.error);
      const url = URL.createObjectURL(new Blob([copy], { type: 'application/octet-stream' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = safeDownloadName(attachment.name);
      anchor.rel = 'noopener';
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Unable to decrypt this attachment safely.');
    } finally {
      setDownloadingAttachmentId('');
    }
  }

  if (!pageReady) {
    return <PageSkeleton variant="messages" />;
  }

  const isAdmin = currentUserRole.toLowerCase() === 'admin';
  const matchesAudience = (person: Person | null) => Boolean(person) && (audience === 'clients'
    ? person!.role.toLowerCase() === 'client'
    : person!.role.toLowerCase() === 'member');
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
            <div className={styles.eyebrow}>Iris Secure</div>
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
                  <span className={styles.avatar}>{initials(person.name)}</span>
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
                <span className={styles.avatar}>{initials(conversation.participant.name)}</span>
                <span>
                  <span className={styles.threadName}>{conversation.participant.name}</span>
                  <span className={styles.threadMeta}>{conversation.lastMessage ? 'Encrypted message' : conversation.participant.role}</span>
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
                  <span className={styles.avatar}>{initials(selected.participant.name)}</span>
                  <div><div className={styles.threadName}>{selected.participant.name}</div><div className={styles.threadMeta}>{selected.participant.role} · {selected.participant.email}</div></div>
                </div>
                <span className={`${styles.securePill} ${protocolReady ? styles.secureReady : ''}`}>
                  {protocolReady ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
                  {protocolReady ? 'Signed end-to-end encryption' : 'Preparing secure device'}
                </span>
              </header>
              <div className={styles.messages} aria-live="polite">
                {conversationLoading ? (
                  <div className={styles.threadLoading} role="status"><LoaderCircle className={styles.loadingSpinner} size={19} />Decrypting conversation…</div>
                ) : messages.length === 0 ? (
                  <div className={styles.empty}><div><span className={styles.emptyIcon}><LockKeyhole size={23} /></span><h2>A private conversation</h2><p>End-to-End Encryption, powered by CipherText</p></div></div>
                ) : messages.map((message) => (
                  <div key={message.id} className={`${styles.bubble} ${message.senderUserId === currentUserId ? styles.mine : ''}`}>
                    {message.plaintext || 'Encrypted message — unlock with a registered secure device.'}
                    {message.attachments.length > 0 && (
                      <div className={styles.receivedAttachments}>
                        {message.attachments.map((attachment) => (
                          <button
                            type="button"
                            key={attachment.id}
                            className={styles.downloadAttachment}
                            onClick={() => void downloadAttachment(message, attachment)}
                            disabled={!attachment.name || !attachment.ciphertext || downloadingAttachmentId === attachment.id}
                          >
                            {downloadingAttachmentId === attachment.id ? <LoaderCircle className={styles.loadingSpinner} size={13} /> : <Download size={13} />}
                            <span>{attachment.name || 'Encrypted attachment'}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <div className={styles.bubbleMeta}>
                      <span>{shortTime(message.createdAt)}</span>
                      {message.senderUserId === currentUserId && message.deliveryState && (
                        <span className={`${styles.deliveryState} ${message.deliveryState === 'read' ? styles.readState : ''} ${message.deliveryState === 'failed' ? styles.failedState : ''}`}>
                          {message.deliveryState === 'sending' ? 'Sending…' : message.deliveryState === 'read' ? 'Read' : message.deliveryState === 'failed' ? 'Failed' : 'Sent'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.composerWrap}>
                {!protocolReady && <div className={styles.protocolNotice}><ShieldAlert size={15} /><span>{protocolError || 'Generating or restoring this browser’s OpenPGP device identity. Sending remains locked until secure setup completes.'}</span></div>}
                <div className={styles.composer}>
                  <input ref={attachmentInputRef} className={styles.fileInput} type="file" multiple accept=".png,.jpg,.jpeg,.webp,.gif,.avif,.mp3,.m4a,.ogg,.wav,.webm,.mp4,.mov,.pdf,.txt,.csv,.docx,.xlsx,.pptx,.zip" onChange={(event) => void queueAttachments(event.target.files)} />
                  <textarea className={styles.input} rows={2} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a secure message…" disabled={!protocolReady} />
                  <button className={styles.attach} type="button" onClick={() => attachmentInputRef.current?.click()} disabled={!protocolReady} aria-label="Attach files"><Paperclip size={17} /></button>
                  <button className={styles.send} onClick={() => void sendMessage()} disabled={!protocolReady || (!draft.trim() && attachments.length === 0)} aria-label="Send encrypted message"><Send size={17} /></button>
                </div>
                {attachments.length > 0 && <div className={styles.attachments}>{attachments.map((file, index) => <span className={styles.attachment} key={`${file.name}-${index}`}><FileText size={13} />{file.name}<button type="button" onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${file.name}`}><X size={12} /></button></span>)}</div>}
              </div>
            </>
          )}
        </main>
      </div>
    </section>
  );
}
