import { redirect } from 'next/navigation';
import DashboardClient from './dashboard-client';
import { canRenderRequestRoute, getRequestSecurityContext } from '@/server/security/request-security-context';
import { getDashboardReadModel } from '@/server/read-models/workspace-pages';

function currentFiscalQuarter() {
  const now = new Date();
  const month = now.getUTCMonth();
  const fiscalMonth = (month + 9) % 12;
  const quarterStartMonth = (month - (fiscalMonth % 3) + 12) % 12;
  const startYear = quarterStartMonth > month ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
  const start = new Date(Date.UTC(startYear, quarterStartMonth, 1));
  const end = new Date(Date.UTC(startYear, quarterStartMonth + 3, 0));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

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
  const requestedStart = validDate(params.start) || fallback.start;
  const requestedEnd = validDate(params.end) || fallback.end;
  const range = requestedStart <= requestedEnd
    ? { start: requestedStart, end: requestedEnd }
    : { start: requestedEnd, end: requestedStart };
  return <DashboardClient initialData={await getDashboardReadModel(ctx, range)} range={range} />;
}
