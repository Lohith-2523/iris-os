import { redirect } from 'next/navigation';
import DashboardClient from './dashboard-client';
import { canRenderRequestRoute, getRequestSecurityContext } from '@/server/security/request-security-context';
import { getDashboardReadModel } from '@/server/read-models/workspace-pages';
import { allTimeFinancialRange, currentFiscalQuarter } from '@/lib/finance/fiscal-quarter';

function validDate(value: string | string[] | undefined) {
  const text = Array.isArray(value) ? value[0] : value;
  if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const parsed = new Date(`${text}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === text ? text : null;
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await getRequestSecurityContext();
  if (!ctx) redirect('/login');
  if (!canRenderRequestRoute(ctx, '/dashboard')) return null;
  const params = await searchParams;
  const fallback = currentFiscalQuarter();
  const requestedMode = Array.isArray(params.range) ? params.range[0] : params.range;
  const isAllTime = requestedMode === 'all-time';
  const requestedStart = validDate(params.start) || fallback.start;
  const requestedEnd = validDate(params.end) || fallback.end;
  const selectedRange = requestedStart <= requestedEnd
    ? { start: requestedStart, end: requestedEnd }
    : { start: requestedEnd, end: requestedStart };
  const range = isAllTime ? allTimeFinancialRange(selectedRange) : selectedRange;
  return <DashboardClient initialData={await getDashboardReadModel(ctx, isAllTime ? undefined : selectedRange, isAllTime ? 'All Time' : 'Six Months')} range={range} />;
}
