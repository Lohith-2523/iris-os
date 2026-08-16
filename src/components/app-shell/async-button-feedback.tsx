'use client';

import * as React from 'react';

const FEEDBACK_DELAY_MS = 140;
const CLICK_CONTEXT_MS = 750;

function requestDetails(input: RequestInfo | URL, init?: RequestInit) {
  const request = typeof Request !== 'undefined' && input instanceof Request ? input : null;
  return {
    method: (init?.method || request?.method || 'GET').toUpperCase(),
    headers: new Headers(init?.headers || request?.headers),
    url: typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url,
  };
}

function shouldShowFeedback(input: RequestInfo | URL, init?: RequestInit) {
  const { headers, url } = requestDetails(input, init);
  if (headers.get('X-Workspace-Cache-Prefetch') === '1' || headers.get('X-Workspace-Cache-Background') === '1') return false;
  try {
    return new URL(url, window.location.origin).pathname.startsWith('/api/');
  } catch {
    return false;
  }
}

export function AsyncButtonFeedback() {
  React.useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    let recentButton: HTMLButtonElement | null = null;
    let recentClickAt = 0;
    const pendingCounts = new WeakMap<HTMLButtonElement, number>();
    const pendingTimers = new WeakMap<HTMLButtonElement, number>();
    const autoApplied = new WeakSet<HTMLButtonElement>();

    const rememberButton = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('button') : null;
      if (target instanceof HTMLButtonElement && (pendingCounts.get(target) || 0) > 0) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      recentButton = target instanceof HTMLButtonElement && !target.disabled ? target : null;
      recentClickAt = performance.now();
    };

    const begin = (button: HTMLButtonElement) => {
      const count = (pendingCounts.get(button) || 0) + 1;
      pendingCounts.set(button, count);
      if (count > 1 || pendingTimers.has(button)) return;
      const timer = window.setTimeout(() => {
        pendingTimers.delete(button);
        if (!button.isConnected || (pendingCounts.get(button) || 0) === 0) return;
        if (button.matches('[aria-busy="true"], [data-loading="true"]') || button.querySelector('.animate-spin')) return;
        button.classList.add('workspace-auto-pending');
        button.setAttribute('aria-busy', 'true');
        autoApplied.add(button);
      }, FEEDBACK_DELAY_MS);
      pendingTimers.set(button, timer);
    };

    const finish = (button: HTMLButtonElement) => {
      const nextCount = Math.max(0, (pendingCounts.get(button) || 1) - 1);
      pendingCounts.set(button, nextCount);
      if (nextCount > 0) return;
      const timer = pendingTimers.get(button);
      if (timer !== undefined) window.clearTimeout(timer);
      pendingTimers.delete(button);
      if (autoApplied.has(button)) {
        autoApplied.delete(button);
        button.classList.remove('workspace-auto-pending');
        if (button.getAttribute('aria-busy') === 'true') button.removeAttribute('aria-busy');
      }
    };

    window.addEventListener('click', rememberButton, true);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const button = recentButton && performance.now() - recentClickAt <= CLICK_CONTEXT_MS
        ? recentButton
        : null;
      const trackedButton = button && shouldShowFeedback(input, init) ? button : null;
      if (trackedButton) begin(trackedButton);
      try {
        return await originalFetch(input, init);
      } finally {
        if (trackedButton) finish(trackedButton);
      }
    };

    return () => {
      window.removeEventListener('click', rememberButton, true);
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
