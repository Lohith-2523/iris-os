export type WorkspaceCacheTag =
  | 'workspace'
  | 'organization'
  | 'dashboard'
  | 'finance'
  | 'clients'
  | 'team'
  | 'reporting'
  | 'operations'
  | 'tasks'
  | 'projects'
  | 'transactions'
  | 'subscriptions'
  | 'retainers'
  | 'invoices'
  | 'leads'
  | 'calendar'
  | 'meta'
  | 'integrations'
  | 'reports'
  | 'strategies'
  | 'atlas';

export type WorkspacePatchKind =
  | 'clients'
  | 'tasks'
  | 'projects'
  | 'transactions'
  | 'subscriptions'
  | 'retainers'
  | 'invoices'
  | 'leads'
  | 'calendar'
  | 'reports'
  | 'strategies';

export type WorkspaceMutationPlan = {
  invalidateTags: WorkspaceCacheTag[];
  patchKind?: WorkspacePatchKind;
  skip?: boolean;
};

const ALL_DATA_TAGS: WorkspaceCacheTag[] = [
  'workspace',
  'organization',
  'dashboard',
  'finance',
  'clients',
  'team',
  'reporting',
  'operations',
  'tasks',
  'projects',
  'transactions',
  'subscriptions',
  'retainers',
  'invoices',
  'leads',
  'calendar',
  'meta',
  'integrations',
  'reports',
  'strategies',
];

function pathnameAndSearch(url: string) {
  return new URL(url, 'http://workspace.local');
}

export function workspaceReadTags(url: string): WorkspaceCacheTag[] {
  const parsed = pathnameAndSearch(url);
  const { pathname, searchParams } = parsed;

  if (pathname === '/api/data') {
    const domain = searchParams.get('domain');
    if (domain === 'dashboard') return ['dashboard'];
    if (domain === 'finance') return ['finance'];
    if (domain === 'clients') return ['clients'];
    if (domain === 'team') return ['team'];
    if (domain === 'reporting') return ['reporting'];
    if (domain === 'operations') return ['operations'];
    if (domain === 'projects') return ['projects'];
  }
  if (pathname === '/api/workspace') return ['workspace'];
  if (pathname === '/api/organization') return ['organization', 'workspace'];
  if (pathname === '/api/tasks') return ['tasks'];
  if (pathname === '/api/projects') return ['projects'];
  if (pathname === '/api/transactions') return ['transactions'];
  if (pathname === '/api/subscriptions') return ['subscriptions'];
  if (pathname === '/api/retainers') return ['retainers'];
  if (pathname === '/api/invoices') return ['invoices'];
  if (pathname === '/api/agency-leads') return ['leads'];
  if (pathname === '/api/calendar') return ['calendar'];
  if (pathname === '/api/meta-portal') return ['meta'];
  if (pathname === '/api/integrations') return ['integrations'];
  if (pathname === '/api/reports') return ['reports', 'reporting'];
  if (pathname === '/api/strategies') return ['strategies'];
  if (pathname.startsWith('/api/atlas-ai')) return ['atlas'];
  return [];
}

function isThemeOnlyWorkspaceMutation(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
  const root = body as Record<string, unknown>;
  if (Object.keys(root).length !== 1 || !root.user || typeof root.user !== 'object' || Array.isArray(root.user)) {
    return false;
  }
  const user = root.user as Record<string, unknown>;
  if (Object.keys(user).length !== 1 || !user.preferences || typeof user.preferences !== 'object' || Array.isArray(user.preferences)) {
    return false;
  }
  const preferences = user.preferences as Record<string, unknown>;
  return Object.keys(preferences).length === 1 && Object.hasOwn(preferences, 'theme');
}

export function workspaceMutationPlan(
  url: string,
  method: string,
  body: unknown,
): WorkspaceMutationPlan {
  const { pathname } = pathnameAndSearch(url);
  const normalizedMethod = method.toUpperCase();

  if (normalizedMethod === 'GET' || normalizedMethod === 'HEAD' || normalizedMethod === 'OPTIONS') {
    return { invalidateTags: [], skip: true };
  }
  if (pathname.startsWith('/api/auth/')) {
    return { invalidateTags: [], skip: true };
  }
  if (pathname.startsWith('/api/atlas-ai')) {
    // Ask Atlas writes the session and its messages in the same request. Refresh
    // the history list and any open conversation immediately after that write.
    return { invalidateTags: ['atlas'] };
  }
  if (pathname === '/api/workspace' && normalizedMethod === 'PATCH' && isThemeOnlyWorkspaceMutation(body)) {
    return { invalidateTags: ['workspace'] };
  }

  if (pathname === '/api/transactions') {
    return {
      invalidateTags: ['transactions', 'invoices', 'finance', 'dashboard', 'clients', 'leads'],
      patchKind: 'transactions',
    };
  }
  if (pathname === '/api/subscriptions') {
    return {
      invalidateTags: ['subscriptions', 'finance', 'dashboard'],
      patchKind: 'subscriptions',
    };
  }
  if (pathname === '/api/retainers') {
    return {
      invalidateTags: ['retainers', 'finance', 'dashboard', 'clients', 'leads'],
      patchKind: 'retainers',
    };
  }
  if (pathname === '/api/invoices') {
    return {
      invalidateTags: ['invoices', 'finance', 'dashboard', 'clients', 'projects'],
      patchKind: 'invoices',
    };
  }
  if (pathname === '/api/tasks') {
    return {
      invalidateTags: ['tasks', 'projects', 'team', 'dashboard', 'operations'],
      patchKind: 'tasks',
    };
  }
  if (pathname === '/api/projects') {
    return {
      invalidateTags: ['projects', 'tasks', 'clients', 'invoices', 'finance', 'team', 'dashboard', 'operations'],
      patchKind: 'projects',
    };
  }
  if (pathname === '/api/clients') {
    return {
      invalidateTags: ['clients', 'projects', 'tasks', 'retainers', 'invoices', 'finance', 'dashboard', 'leads'],
      patchKind: 'clients',
    };
  }
  if (pathname === '/api/agency-leads') {
    return { invalidateTags: ['leads', 'meta', 'integrations', 'dashboard', 'atlas', 'organization'], patchKind: 'leads' };
  }
  if (pathname === '/api/calendar') {
    return {
      invalidateTags: ['calendar', 'dashboard', 'integrations'],
      patchKind: 'calendar',
    };
  }
  if (pathname === '/api/reports') {
    return {
      invalidateTags: ['reports', 'reporting', 'dashboard'],
      patchKind: 'reports',
    };
  }
  if (pathname === '/api/strategies') {
    return { invalidateTags: ['strategies'], patchKind: 'strategies' };
  }
  if (pathname === '/api/member' || pathname === '/api/invite') {
    return { invalidateTags: ['team', 'projects', 'tasks', 'workspace'] };
  }
  if (pathname === '/api/meta-portal') {
    return { invalidateTags: ['meta', 'integrations', 'dashboard', 'clients'] };
  }
  if (pathname === '/api/integrations' || pathname.startsWith('/api/meta-ads/')) {
    return { invalidateTags: ['integrations', 'meta', 'calendar'] };
  }
  if (pathname === '/api/workspace') {
    return { invalidateTags: ['workspace', 'organization', 'dashboard'] };
  }
  if (pathname === '/api/organization') {
    return { invalidateTags: ALL_DATA_TAGS };
  }
  if (pathname.startsWith('/api/onboarding/')) {
    return { invalidateTags: ['workspace', 'organization', 'dashboard'] };
  }

  const matchingTags = workspaceReadTags(url);
  return {
    invalidateTags: matchingTags.length > 0 ? matchingTags : ['workspace'],
  };
}
