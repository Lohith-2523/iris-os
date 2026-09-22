type MessagingChangeListener = () => void;

type MessagingRealtimeGlobal = typeof globalThis & {
  messagingChangeListeners?: Map<string, Set<MessagingChangeListener>>;
};

const realtimeGlobal = globalThis as MessagingRealtimeGlobal;
const listeners = realtimeGlobal.messagingChangeListeners ?? new Map<string, Set<MessagingChangeListener>>();
realtimeGlobal.messagingChangeListeners = listeners;

export function publishMessagingChange(conversationId: string) {
  for (const listener of listeners.get(conversationId) ?? []) listener();
}

export function subscribeToMessagingChanges(conversationId: string, listener: MessagingChangeListener) {
  const conversationListeners = listeners.get(conversationId) ?? new Set<MessagingChangeListener>();
  conversationListeners.add(listener);
  listeners.set(conversationId, conversationListeners);

  return () => {
    conversationListeners.delete(listener);
    if (conversationListeners.size === 0) listeners.delete(conversationId);
  };
}
