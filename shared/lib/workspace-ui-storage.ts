'use client';

export type WorkspaceUiScope = {
  userId: string;
  orgId: string;
};

const PREFIX = 'crystal.ui';

function storageKey(scope: WorkspaceUiScope, preference: string) {
  return `${PREFIX}:${scope.userId}:${scope.orgId}:${preference}:v1`;
}

export function readWorkspaceUiPreference<T>(
  scope: WorkspaceUiScope | null,
  preference: string,
  fallback: T,
  isValid: (value: unknown) => value is T,
): T {
  if (!scope || typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(storageKey(scope, preference));
    if (!raw) return fallback;
    const value: unknown = JSON.parse(raw);
    return isValid(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

export function writeWorkspaceUiPreference<T>(
  scope: WorkspaceUiScope | null,
  preference: string,
  value: T,
) {
  if (!scope || typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(storageKey(scope, preference), JSON.stringify(value));
  } catch {
    // UI preferences are optional; private browsing and quota limits must not block the app.
  }
}

export function clearWorkspaceUiPreferences(scope: WorkspaceUiScope | null) {
  if (!scope || typeof window === 'undefined') return;

  const keyPrefix = `${PREFIX}:${scope.userId}:${scope.orgId}:`;
  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(keyPrefix)) window.localStorage.removeItem(key);
  }
}
