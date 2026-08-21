const ROUTE_DATA: Record<string, readonly string[]> = {
  '/dashboard': [
    '/api/data?domain=dashboard',
    '/api/data?domain=clients',
    '/api/tasks',
    '/api/meta-portal',
    '/api/calendar',
    '/api/agency-leads',
    '/api/notifications',
  ],
  '/agency-leads': ['/api/agency-leads?view=kanban', '/api/integrations', '/api/workspace'],
  '/clients': ['/api/data?domain=clients&include=contacts', '/api/data?domain=team'],
  '/clients/onboard': ['/api/organization', '/api/data?domain=team', '/api/agency-leads'],
  '/finance': ['/api/transactions', '/api/subscriptions', '/api/retainers', '/api/invoices?outstanding=true', '/api/organization'],
  '/invoices': ['/api/invoices', '/api/projects', '/api/agency-leads', '/api/organization'],
  '/proposals': ['/api/workspace', '/api/agency-leads', '/api/invoices?documentType=PROFORMA'],
  '/documents': ['/api/workspace', '/api/generated-documents?family=LEGAL'],
  '/projects': ['/api/projects', '/api/data?domain=clients', '/api/data?domain=team', '/api/workspace'],
  '/tasks': ['/api/tasks', '/api/projects', '/api/data?domain=team'],
  '/team': ['/api/data?domain=team', '/api/projects', '/api/workspace'],
  '/teams-dashboard': ['/api/tasks', '/api/calendar', '/api/data?domain=team'],
  '/calendar': ['/api/calendar', '/api/integrations'],
  '/reporting': ['/api/reports', '/api/data?domain=clients'],
  '/strategy': ['/api/strategies'],
  '/atlas': ['/api/atlas-ai/sessions'],
  '/messages': ['/api/messaging'],
  '/client-dashboard': ['/api/meta-portal', '/api/tasks', '/api/projects', '/api/deliverables'],
  '/client-leads': ['/api/meta-portal'],
  '/explorer': ['/api/data?domain=finance', '/api/transactions', '/api/data?domain=team', '/api/data?domain=client-dashboard'],
  '/analytics': ['/api/data?domain=dashboard'],
  '/settings': ['/api/integrations', '/api/organization'],
  '/settings/security': ['/api/security/users'],
};

function normalizedPathname(pathname: string) {
  const value = pathname.split('?')[0].replace(/\/$/, '') || '/';
  return value;
}

export function workspaceDataUrlsForRoute(pathname: string) {
  const normalized = normalizedPathname(pathname);
  const exact = ROUTE_DATA[normalized];
  if (exact) return [...exact];
  const parent = Object.keys(ROUTE_DATA)
    .sort((left, right) => right.length - left.length)
    .find((route) => normalized.startsWith(`${route}/`));
  return parent ? [...ROUTE_DATA[parent]] : [];
}

export function isWorkspaceDataUrlForRoute(pathname: string, url: string) {
  const requested = new URL(url, 'https://iris.local');
  return workspaceDataUrlsForRoute(pathname).some((candidate) => {
    const expected = new URL(candidate, 'https://iris.local');
    return requested.pathname === expected.pathname
      && Array.from(expected.searchParams.entries()).every(([key, value]) => requested.searchParams.get(key) === value);
  });
}
