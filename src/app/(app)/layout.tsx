'use client';

import * as React from 'react';
import { Sidebar } from '@/components/app-shell/sidebar';
import { Topbar } from '@/components/app-shell/topbar';
import { X, Lock, ArrowRight } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { setActiveWorkspaceContext } from '@/lib/utils';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const pathname = usePathname();
  const router = useRouter();
  
  const [user, setUser] = React.useState<{ name: string; role: string } | null>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchUser = React.useCallback(async () => {
    try {
      const res = await fetch('/api/user');
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        const workspaceRes = await fetch('/api/workspace');
        if (workspaceRes.ok) {
          const workspace = await workspaceRes.json();
          setActiveWorkspaceContext({ userName: data.name, currency: workspace.organization.currency });
        }
      } else if (res.status === 401) {
        router.replace('/login');
      }
    } catch (e) {
      console.error('Error fetching user in layout:', e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  React.useEffect(() => {
    fetchUser();
    window.addEventListener('user-updated', fetchUser);
    return () => {
      window.removeEventListener('user-updated', fetchUser);
    };
  }, [fetchUser]);

  const isClientGated = user?.role?.toLowerCase() === 'client' && 
    pathname !== '/client-dashboard' && 
    pathname !== '/clients/onboard' &&
    pathname !== '/calendar';
  
  const isMemberGated = user?.role?.toLowerCase() === 'member' && 
    pathname !== '/teams-dashboard' && 
    pathname !== '/tasks' &&
    pathname !== '/calendar';

  const isAdminGated = user?.role?.toLowerCase() === 'admin' && 
    (pathname === '/client-dashboard' || pathname === '/teams-dashboard');

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#09090b]">
        <div className="text-zinc-500 text-xs flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border border-t-transparent border-zinc-400" />
          <span>Loading workspace session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#09090b]">
      {/* Desktop Sidebar */}
      <Sidebar className="hidden md:flex shrink-0" />

      {/* Mobile Sidebar overlay drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Sidebar Drawer */}
          <div className="relative z-50 flex h-full w-64 transform transition-transform duration-300 ease-in-out">
            <Sidebar onCloseMobile={() => setIsMobileOpen(false)} className="w-full" />
            <button
              onClick={() => setIsMobileOpen(false)}
              className="absolute top-4 -right-12 flex h-8 w-8 items-center justify-center rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      )}

      {/* Right Column (Topbar + Main Content) */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onMenuToggle={() => setIsMobileOpen(true)} />
        
        {/* Page Content area */}
        <main className="flex-1 overflow-y-auto bg-[#0c0c0e] p-6 lg:p-8">
           {isAdminGated ? (
            <div className="flex h-[70vh] flex-col items-center justify-center font-sans text-xs">
              <div className="w-full max-w-md bg-[#0d0e12] border border-zinc-800 p-6 rounded-lg shadow-2xl space-y-6 text-center relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-0.5 bg-zinc-800" />
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                  <Lock className="h-5 w-5" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">Restricted Area</h2>
                  <p className="text-[11px] text-zinc-500 max-w-xs mx-auto leading-normal">
                    This workspace is dedicated to client or team member accounts. Admins should view operational data in the Command Center.
                  </p>
                </div>
                <div className="pt-2">
                  <Button
                    onClick={() => router.push('/dashboard')}
                    className="w-full h-9 font-semibold bg-white text-zinc-950 hover:bg-zinc-200 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Return to Admin Dashboard</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : isClientGated ? (
            <div className="flex h-[70vh] flex-col items-center justify-center font-sans text-xs">
              <div className="w-full max-w-md bg-[#0d0e12] border border-zinc-800 p-6 rounded-lg shadow-2xl space-y-6 text-center relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-0.5 bg-zinc-800" />
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                  <Lock className="h-5 w-5" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">Restricted Area</h2>
                  <p className="text-[11px] text-zinc-500 max-w-xs mx-auto leading-normal">
                    Your account has client clearance level and is authorized to view only the **Client Dashboard** and **Calendar**.
                  </p>
                </div>
                <div className="pt-2">
                  <Button
                    onClick={() => router.push('/client-dashboard')}
                    className="w-full h-9 font-semibold bg-white text-zinc-950 hover:bg-zinc-200 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Proceed to Client Dashboard</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : isMemberGated ? (
            <div className="flex h-[70vh] flex-col items-center justify-center font-sans text-xs">
              <div className="w-full max-w-md bg-[#0d0e12] border border-zinc-800 p-6 rounded-lg shadow-2xl space-y-6 text-center relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-0.5 bg-zinc-800" />
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                  <Lock className="h-5 w-5" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">Restricted Area</h2>
                  <p className="text-[11px] text-zinc-500 max-w-xs mx-auto leading-normal">
                    Your account has team member clearance level and is authorized to view only the **Teams Dashboard**, **Tasks**, and **Calendar**.
                  </p>
                </div>
                <div className="pt-2">
                  <Button
                    onClick={() => router.push('/teams-dashboard')}
                    className="w-full h-9 font-semibold bg-white text-zinc-950 hover:bg-zinc-200 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Proceed to Teams Dashboard</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
