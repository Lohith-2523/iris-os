import { redirect } from 'next/navigation';
import ReportingClient from './reporting-client';
import { canRenderRequestRoute, getRequestSecurityContext } from '@/server/security/request-security-context';
import { getReportingInitialReadModel } from '@/server/domains/reporting-read-service';

export default async function ReportingPage() {
  const ctx = await getRequestSecurityContext();
  if (!ctx) redirect('/login');
  if (!canRenderRequestRoute(ctx, '/reporting')) return null;
  return <ReportingClient initialData={await getReportingInitialReadModel(ctx)} />;
}
