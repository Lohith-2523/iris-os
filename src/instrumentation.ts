import type { Instrumentation } from 'next';

export const onRequestError: Instrumentation.onRequestError = async (_error, _request, context) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { recordBackendIncident } = await import('@/server/admin/incidents');
  await recordBackendIncident(context.routePath, `Unhandled ${context.routeType} error`);
};
