'use client';

import * as React from 'react';
import { Sidebar } from '@/components/app-shell/sidebar';
import { Topbar } from '@/components/app-shell/topbar';
import { X } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#09090b]">
      {/* Desktop Sidebar (Sidebar is hidden on mobile, visible on medium screens and up) */}
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
          {children}
        </main>
      </div>
    </div>
  );
}
