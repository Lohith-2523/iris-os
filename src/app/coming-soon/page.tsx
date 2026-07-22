import * as React from 'react';

export const metadata = {
  title: 'Coming Soon - Iris OS',
  description: 'Iris OS is coming soon. The enterprise command center for marketing operations and agency delivery.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ComingSoonPage() {
  return (
    <div className="workspace-auth min-h-screen w-full bg-[#09090b] text-white flex flex-col justify-between p-6 md:p-12 relative overflow-hidden font-sans select-none">
      {/* Background glow highlights */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-zinc-900/40 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-zinc-900/30 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="flex items-center gap-3 relative z-10">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white font-bold text-zinc-950 shadow-md border border-zinc-200 text-sm">
          I
        </div>
        <span className="font-bold tracking-wider text-xs uppercase text-zinc-300">Iris OS</span>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-8 relative z-10">
        <div className="space-y-4">
          <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest font-mono px-3 py-1 bg-red-950/20 border border-red-900/20 rounded-full">
            SYSTEM MAINTENANCE / LAUNCH DEPLOYMENT
          </span>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase silver-text-gradient leading-tight pt-2">
            Coming Soon
          </h1>
          <p className="text-zinc-400 text-xs md:text-sm leading-relaxed max-w-lg mx-auto font-medium font-sans">
            Iris OS is a state-of-the-art enterprise management monolith designed to consolidate creative design, marketing analytics, ad account monitoring, and operational delivery workflows into a single system of record.
          </p>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2 border border-zinc-800 bg-zinc-900/30 px-4 py-2.5 rounded text-xs font-semibold text-zinc-400">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
          <span>Preparing Production Release Pipeline</span>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-[10px] text-zinc-600 font-mono relative z-10">
        © {new Date().getFullYear()} Iris OS Monolith. All rights secured.
      </footer>
    </div>
  );
}
