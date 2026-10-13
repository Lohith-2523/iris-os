import { beforeEach, describe, expect, it } from 'vitest';
import {
  REQUEST_RATE_LIMIT_POLICIES,
  checkRequestRateLimit,
  classifyRequestRateLimit,
  requestRateLimitPrincipal,
  resetRequestRateLimitsForTesting,
} from './request-rate-limit';

describe('request rate limiting', () => {
  beforeEach(() => resetRequestRateLimitsForTesting());

  it.each([
    ['/api/pricing', 'GET', 'LIGHT_CRITICAL'],
    ['/api/activity', 'POST', 'LIGHT_CRITICAL'],
    ['/api/clients', 'POST', 'NORMAL'],
    ['/api/workspace', 'PATCH', 'NORMAL'],
    ['/api/reports', 'POST', 'EXPENSIVE_FILE'],
    ['/api/reports/report-1/pdf', 'GET', 'EXPENSIVE_FILE'],
    ['/api/atlas-ai/transcribe', 'POST', 'EXPENSIVE_FILE'],
    ['/api/auth/signup', 'POST', 'ABUSE_SENSITIVE'],
    ['/api/create-order', 'POST', 'ABUSE_SENSITIVE'],
    ['/api/atlas-ai', 'POST', 'ABUSE_SENSITIVE'],
  ] as const)('classifies %s %s as %s', (pathname, method, category) => {
    expect(classifyRequestRateLimit(pathname, method)).toBe(category);
  });

  it('allows the expensive-operation burst and then returns a retry interval', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.10' });
    const policy = REQUEST_RATE_LIMIT_POLICIES.EXPENSIVE_FILE;
    for (let request = 0; request < policy.burst; request += 1) {
      expect(checkRequestRateLimit({ pathname: '/api/reports', method: 'POST', headers, now: 1_000 }).allowed).toBe(true);
    }
    const denied = checkRequestRateLimit({ pathname: '/api/reports', method: 'POST', headers, now: 1_000 });
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterSeconds).toBe(15);
    expect(checkRequestRateLimit({ pathname: '/api/reports', method: 'POST', headers, now: 16_000 }).allowed).toBe(true);
  });

  it('isolates signed-in normal traffic by session but keeps abuse-sensitive traffic IP-bound', () => {
    const first = new Headers({ cookie: 'sb-demo-auth-token=first', 'x-forwarded-for': '203.0.113.20' });
    const second = new Headers({ cookie: 'sb-demo-auth-token=second', 'x-forwarded-for': '203.0.113.20' });
    expect(requestRateLimitPrincipal(first, 'NORMAL')).not.toBe(requestRateLimitPrincipal(second, 'NORMAL'));
    expect(requestRateLimitPrincipal(first, 'ABUSE_SENSITIVE')).toBe(requestRateLimitPrincipal(second, 'ABUSE_SENSITIVE'));
  });
});
