'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { workspaceFetch } from '@/lib/workspace-data-cache';
import { createIrisDemoState, handleIrisDemoRequest, type IrisDemoState } from '@/lib/demo/iris-demo-fixtures';

type DemoModeContextValue = {
  isDemo: true;
  pathname: string;
  navigate: (href: string) => void;
  request: typeof fetch;
  reset: () => void;
  resetVersion: number;
  state: IrisDemoState;
  notice: string;
  showNotice: (message: string) => void;
};

const DemoModeContext = React.createContext<DemoModeContextValue | null>(null);

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const [pathname, setPathname] = React.useState('/dashboard');
  const [state, setState] = React.useState<IrisDemoState>(() => createIrisDemoState());
  const stateRef = React.useRef(state);
  const [resetVersion, setResetVersion] = React.useState(0);
  const [notice, setNotice] = React.useState('');

  const showNotice = React.useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice((current) => current === message ? '' : current), 3_200);
  }, []);

  const navigate = React.useCallback((href: string) => {
    const nextPath = href.split('?')[0] || '/dashboard';
    setPathname(nextPath);
  }, []);

  const updateState = React.useCallback<React.Dispatch<React.SetStateAction<IrisDemoState>>>((action) => {
    setState((current) => {
      const next = typeof action === 'function' ? action(current) : action;
      stateRef.current = next;
      return next;
    });
  }, []);

  const request = React.useCallback<typeof fetch>((input, init) => (
    handleIrisDemoRequest(stateRef.current, updateState, input, init, showNotice)
  ), [showNotice, updateState]);

  const reset = React.useCallback(() => {
    const restored = createIrisDemoState();
    stateRef.current = restored;
    setState(restored);
    setPathname('/dashboard');
    setResetVersion((value) => value + 1);
    showNotice('Demo restored to its original workspace state.');
  }, [showNotice]);

  const value = React.useMemo<DemoModeContextValue>(() => ({
    isDemo: true,
    pathname,
    navigate,
    request,
    reset,
    resetVersion,
    state,
    notice,
    showNotice,
  }), [navigate, notice, pathname, request, reset, resetVersion, showNotice, state]);

  return <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider>;
}

export function useDemoMode() {
  return React.useContext(DemoModeContext);
}

export function useWorkspaceRuntime() {
  const demo = useDemoMode();
  const nextRouter = useRouter();
  const nextPathname = usePathname();

  return React.useMemo(() => ({
    isDemo: Boolean(demo),
    pathname: demo?.pathname ?? nextPathname,
    fetch: demo?.request ?? workspaceFetch,
    router: {
      push: (href: string, options?: { scroll?: boolean }) => demo ? demo.navigate(href) : nextRouter.push(href, options),
      replace: (href: string, options?: { scroll?: boolean }) => demo ? demo.navigate(href) : nextRouter.replace(href, options),
      prefetch: (href: string) => demo ? Promise.resolve() : nextRouter.prefetch(href),
      refresh: () => demo ? undefined : nextRouter.refresh(),
    },
    demo,
  }), [demo, nextPathname, nextRouter]);
}
