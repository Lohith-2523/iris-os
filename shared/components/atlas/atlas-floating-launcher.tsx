'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { BookOpenText, Mic, X } from 'lucide-react';
import { AtlasIcon } from '@/components/ui/atlas-icon';
import { DailyBriefing } from '@/components/daily-briefing/daily-briefing';
import { SubscriptionPlanDialog } from '@/components/billing/subscription-plan-dialog';
import { planIncludes } from '@/lib/plan-entitlements';

export function AtlasTopbarMenu({ workspacePlan, canManagePlan }: { workspacePlan?: string; canManagePlan?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [briefingOpen, setBriefingOpen] = React.useState(false);
  const [upgradeOpen, setUpgradeOpen] = React.useState(false);

  React.useEffect(() => {
    setOpen(false);
    setBriefingOpen(false);
  }, [pathname]);

  const openBriefing = () => {
    setOpen(false);
    if (!planIncludes(workspacePlan, 'ADVANCED')) {
      setUpgradeOpen(true);
      return;
    }
    setBriefingOpen(true);
  };

  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setOpen(false);
    };
    window.addEventListener('pointerdown', closeOnOutsidePress);
    return () => window.removeEventListener('pointerdown', closeOnOutsidePress);
  }, [open]);

  return <div ref={menuRef} className="atlas-topbar-menu relative flex shrink-0 items-center">
    {briefingOpen && <div className="fixed inset-0 z-[120] overflow-y-auto bg-[#0c0c0e] p-4 sm:p-6 lg:p-8"><button type="button" onClick={() => setBriefingOpen(false)} className="fixed right-5 top-5 z-[130] grid h-11 w-11 place-items-center rounded-full border border-zinc-600 bg-zinc-950 text-white shadow-xl hover:bg-zinc-900" aria-label="Close daily briefing"><X className="h-5 w-5" /></button><DailyBriefing /></div>}
    <button type="button" onClick={() => setOpen((value) => !value)} className="atlas-topbar-menu-trigger grid h-8 w-8 place-items-center rounded-full text-zinc-400 transition-colors hover:text-white" aria-label="Open Miles menu" aria-expanded={open} aria-haspopup="menu"><AtlasIcon className="h-4 w-4" /></button>
    {open && <div role="menu" className="atlas-topbar-menu-card fixed left-4 top-16 z-[90] w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-zinc-700 bg-zinc-950 p-4 shadow-2xl md:absolute md:left-0 md:top-[calc(100%+.7rem)]"><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2 font-bold text-white"><AtlasIcon className="h-5 w-5" />Miles AI</div><button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-full text-zinc-500 hover:text-white" aria-label="Close Miles menu"><X className="h-4 w-4" /></button></div><div className="grid gap-2"><button type="button" role="menuitem" onClick={() => { setOpen(false); router.push('/atlas?voice=1'); }} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-left font-semibold text-white hover:border-zinc-600"><Mic className="atlas-theme-icon h-5 w-5" /> Talk to Miles</button><button type="button" role="menuitem" onClick={openBriefing} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-left font-semibold text-white hover:border-zinc-600"><BookOpenText className="atlas-theme-icon h-5 w-5" /> View Briefing</button></div></div>}
    <SubscriptionPlanDialog open={upgradeOpen} currentPlan={workspacePlan} feature="Daily Briefing" requiredPlan="ADVANCED" canManage={canManagePlan} onClose={() => setUpgradeOpen(false)} onPlanChanged={() => { setUpgradeOpen(false); setBriefingOpen(true); }} />
  </div>;
}
