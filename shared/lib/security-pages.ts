export const SECURITY_ALLOWED_PAGES = [
  'dashboard', 'finance', 'agency-leads', 'clients', 'projects', 'tasks', 'team',
  'calendar', 'messages', 'reporting', 'analytics', 'invoices', 'atlas', 'strategy', 'settings',
] as const;

export type SecurityAllowedPage = (typeof SECURITY_ALLOWED_PAGES)[number];

export const SECURITY_PAGE_OPTIONS: ReadonlyArray<{ id: SecurityAllowedPage; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'agency-leads', label: 'Agency Leads' },
  { id: 'clients', label: 'Clients' },
  { id: 'projects', label: 'Projects' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'team', label: 'Team' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'messages', label: 'Messages' },
  { id: 'finance', label: 'Finance' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'reporting', label: 'Reporting' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'atlas', label: 'Miles AI' },
  { id: 'settings', label: 'Settings' },
];

const allowedPageSet = new Set<string>(SECURITY_ALLOWED_PAGES);

export function normalizeSecurityPages(value: unknown): SecurityAllowedPage[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((page): page is SecurityAllowedPage => typeof page === 'string' && allowedPageSet.has(page)))];
}

export function securityPageLabel(page: string) {
  return SECURITY_PAGE_OPTIONS.find((option) => option.id === page)?.label || page;
}
