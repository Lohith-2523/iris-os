'use client';

export type WorkspaceTheme = 'dark' | 'light';

const THEME_COOKIE = 'crystal_theme';
const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function readWorkspaceTheme(): WorkspaceTheme {
  if (typeof document === 'undefined') return 'dark';
  const match = document.cookie.match(new RegExp(`(?:^|; )${THEME_COOKIE}=(light|dark)(?:;|$)`));
  return match?.[1] === 'light' ? 'light' : 'dark';
}

export function hasPersistedWorkspaceTheme() {
  if (typeof document === 'undefined') return false;
  return new RegExp(`(?:^|; )${THEME_COOKIE}=(light|dark)(?:;|$)`).test(document.cookie);
}

export function applyWorkspaceTheme(theme: WorkspaceTheme, target?: Element | null) {
  if (typeof document === 'undefined') return;
  const root = target ?? document.documentElement;
  root.classList.toggle('light', theme === 'light');
  root.classList.toggle('dark', theme === 'dark');
}

export function persistWorkspaceTheme(theme: WorkspaceTheme) {
  if (typeof document === 'undefined') return;
  document.cookie = `${THEME_COOKIE}=${theme}; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}
