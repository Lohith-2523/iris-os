import { describe, expect, it } from 'vitest';
import { hasSuperadminAccess, isIrisAdminEmail } from './policy';

describe('superadmin policy', () => {
  it('allows only the exact IrisOS domain', () => {
    expect(isIrisAdminEmail('ops@irisos.app')).toBe(true);
    expect(isIrisAdminEmail('ops@sub.irisos.app')).toBe(false);
    expect(isIrisAdminEmail('ops@irisos.app.example.com')).toBe(false);
  });

  it('always allows the verified owner', () => {
    expect(hasSuperadminAccess('cto.admin@irisos.app', true, null)).toBe(true);
    expect(hasSuperadminAccess('cto.admin@irisos.app', false, null)).toBe(false);
  });

  it('requires a live invitation for other addresses', () => {
    const now = new Date('2026-09-15T12:00:00Z');
    expect(hasSuperadminAccess('ops@irisos.app', true, {
      acceptedAt: null,
      expiresAt: new Date('2026-09-16T12:00:00Z'),
      revokedAt: null,
    }, now)).toBe(true);
    expect(hasSuperadminAccess('ops@irisos.app', true, {
      acceptedAt: null,
      expiresAt: new Date('2026-09-14T12:00:00Z'),
      revokedAt: null,
    }, now)).toBe(false);
  });
});
