import { redirect } from 'next/navigation';
import FinanceClient from './finance-client';
import { canRenderRequestRoute, getRequestSecurityContext } from '@/server/security/request-security-context';
import { getFinanceReadModel } from '@/server/read-models/workspace-pages';
import { allTimeFinancialRange, currentFiscalQuarter } from '@/lib/finance/fiscal-quarter';

function validDate(value: string | string[] | undefined) {
  const text = Array.isArray(value) ? value[0] : value;
  if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const parsed = new Date(`${text}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === text ? text : null;
}

export default async function FinancePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await getRequestSecurityContext();
  if (!ctx) redirect('/login');
  if (!canRenderRequestRoute(ctx, '/finance')) return null;
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
  return <FinanceClient initialData={await getFinanceReadModel(ctx, isAllTime ? undefined : selectedRange)} range={range} />;
}
