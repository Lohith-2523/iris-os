import { normalizePlan, type AtlasProvider, type PlanId } from '@/lib/plan-entitlements';

export type CreditAnalyticsUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  organization: { name: string; plan: string };
};

export type CreditUsageAggregate = {
  userId: string;
  provider: string;
  inputCredits: number;
  outputCredits: number;
  totalCredits: number;
  requests: number;
};

const PLANS: PlanId[] = ['BASIC', 'PRO', 'ADVANCED'];
const PROVIDERS: AtlasProvider[] = ['GEMINI', 'GPT', 'CLAUDE'];

export function buildAdminCreditAnalytics(users: CreditAnalyticsUser[], usage: CreditUsageAggregate[]) {
  const usageByUser = new Map<string, { input: number; output: number; total: number; requests: number; providers: Record<AtlasProvider, number> }>();
  for (const row of usage) {
    const current = usageByUser.get(row.userId) ?? { input: 0, output: 0, total: 0, requests: 0, providers: { GEMINI: 0, GPT: 0, CLAUDE: 0 } };
    current.input += row.inputCredits;
    current.output += row.outputCredits;
    current.total += row.totalCredits;
    current.requests += row.requests;
    const provider = PROVIDERS.includes(row.provider as AtlasProvider) ? row.provider as AtlasProvider : null;
    if (provider) current.providers[provider] += row.totalCredits;
    usageByUser.set(row.userId, current);
  }

  const userRows = users.map((user) => {
    const credits = usageByUser.get(user.id) ?? { input: 0, output: 0, total: 0, requests: 0, providers: { GEMINI: 0, GPT: 0, CLAUDE: 0 } };
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organization: user.organization.name,
      plan: normalizePlan(user.organization.plan),
      ...credits,
    };
  }).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  const total = userRows.reduce((sum, user) => sum + user.total, 0);
  const input = userRows.reduce((sum, user) => sum + user.input, 0);
  const output = userRows.reduce((sum, user) => sum + user.output, 0);
  const requests = userRows.reduce((sum, user) => sum + user.requests, 0);
  const activeUsers = userRows.filter((user) => user.total > 0).length;
  const topUser = userRows.find((user) => user.total > 0) ?? null;

  const plans = PLANS.map((plan) => {
    const members = userRows.filter((user) => user.plan === plan);
    const activeMembers = members.filter((user) => user.total > 0);
    const credits = members.reduce((sum, user) => sum + user.total, 0);
    const mostSpent = activeMembers.reduce((maximum, user) => Math.max(maximum, user.total), 0);
    return {
      plan,
      users: members.length,
      activeUsers: activeMembers.length,
      total: credits,
      averagePerUser: members.length ? Math.round(credits / members.length) : 0,
      averagePerActiveUser: activeMembers.length ? Math.round(credits / activeMembers.length) : 0,
      mostSpent,
      share: total ? credits / total : 0,
    };
  });

  const providers = PROVIDERS.map((provider) => {
    const credits = userRows.reduce((sum, user) => sum + user.providers[provider], 0);
    return { provider, total: credits, share: total ? credits / total : 0 };
  });

  const roleNames = Array.from(new Set(userRows.map((user) => user.role))).sort();
  const roles = roleNames.map((role) => {
    const members = userRows.filter((user) => user.role === role);
    const credits = members.reduce((sum, user) => sum + user.total, 0);
    return { role, users: members.length, total: credits, averagePerUser: members.length ? Math.round(credits / members.length) : 0 };
  }).sort((a, b) => b.total - a.total);

  return {
    totals: {
      total,
      input,
      output,
      requests,
      users: userRows.length,
      activeUsers,
      averagePerUser: userRows.length ? Math.round(total / userRows.length) : 0,
      averagePerActiveUser: activeUsers ? Math.round(total / activeUsers) : 0,
    },
    topUser,
    plans,
    providers,
    roles,
    users: userRows,
  };
}
