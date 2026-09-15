import { normalizePlan } from '@/lib/plan-entitlements';

export function agencyViaIrisSenderName(agencyName: unknown, plan: unknown) {
  if (normalizePlan(plan) === 'BASIC') return undefined;
  const cleanName = String(agencyName || '')
    .replace(/[\r\n<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
  return cleanName ? `${cleanName} Via Iris OS` : 'Iris OS';
}
