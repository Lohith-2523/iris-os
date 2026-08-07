'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { BookOpenText, X } from 'lucide-react';
import { AtlasIcon } from '@/components/ui/atlas-icon';
import { DailyBriefing } from '@/components/daily-briefing/daily-briefing';
import { SubscriptionPlanDialog } from '@/components/billing/subscription-plan-dialog';
import { planIncludes } from '@/lib/plan-entitlements';

export function AtlasFloatingLauncher({ workspacePlan, canManagePlan }: { workspacePlan?: string; canManagePlan?: boolean }) {
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

  if (pathname === '/atlas') return null;
  return <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-3">
    {briefingOpen && <div className="fixed inset-0 z-[120] overflow-y-auto bg-[#0c0c0e] p-4 sm:p-6 lg:p-8"><button type="button" onClick={() => setBriefingOpen(false)} className="fixed right-5 top-5 z-[130] grid h-11 w-11 place-items-center rounded-full border border-zinc-600 bg-zinc-950 text-white shadow-xl hover:bg-zinc-900" aria-label="Close daily briefing"><X className="h-5 w-5" /></button><DailyBriefing /></div>}
    {open && <div className="w-72 rounded-2xl border border-zinc-700 bg-zinc-950 p-4 shadow-2xl"><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2 font-bold text-white"><AtlasIcon className="h-5 w-5 text-white" />Atlas AI</div><button onClick={() => setOpen(false)} aria-label="Close Atlas menu"><X className="h-5 w-5" /></button></div><div className="grid gap-2"><button onClick={() => router.push('/atlas')} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-left font-semibold text-white hover:border-zinc-600"><AtlasIcon className="h-5 w-5 text-white" /> Ask Atlas</button><button onClick={openBriefing} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-left font-semibold text-white hover:border-zinc-600"><BookOpenText className="h-5 w-5" /> View Briefing</button></div></div>}
    <button onClick={() => setOpen((value) => !value)} className="grid h-16 w-16 place-items-center rounded-full border border-zinc-600 bg-zinc-950 shadow-[0_12px_40px_rgba(0,0,0,.55)] hover:scale-105" aria-label="Open Atlas AI"><AtlasIcon className="h-8 w-8" /></button>
    <SubscriptionPlanDialog open={upgradeOpen} currentPlan={workspacePlan} feature="Daily Briefing" requiredPlan="ADVANCED" canManage={canManagePlan} onClose={() => setUpgradeOpen(false)} onPlanChanged={() => { setUpgradeOpen(false); setBriefingOpen(true); }} />
  </div>;
}
