'use client';

import Link from 'next/link';
import { ArrowRight, Building2 } from 'lucide-react';

type AgencyBillingProfileNoticeProps = {
  missingFields: string[];
  className?: string;
};

export function AgencyBillingProfileNotice({
  missingFields,
  className = '',
}: AgencyBillingProfileNoticeProps) {
  if (missingFields.length === 0) return null;

  const fields = missingFields
    .map((field) => field.replace(/^agency\s+/i, ''))
    .join(', ');

  return (
    <div className={`agency-billing-profile-notice flex flex-col gap-3 border border-amber-900/45 bg-amber-950/15 p-4 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div className="flex gap-3">
        <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <div>
          <p className="text-xs font-semibold text-amber-200">Complete your agency invoice details</p>
          <p className="mt-1 text-[11px] leading-relaxed text-amber-100/70">
            Add your {fields} in Settings before creating or automatically sending an invoice.
          </p>
        </div>
      </div>
      <Link
        href="/settings#agency-invoice-identity"
        prefetch={false}
        className="inline-flex shrink-0 items-center justify-center gap-1.5 border border-amber-700/60 bg-amber-950/30 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-amber-100 transition-colors hover:bg-amber-900/35"
      >
        Add agency details <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
