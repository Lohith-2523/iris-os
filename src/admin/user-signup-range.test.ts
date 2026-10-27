import { describe, expect, it } from 'vitest';
import { defaultUserSignupRange, isUserInSignupRange, signupDateKey, userSignupRangeLabel } from './user-signup-range';

describe('superadmin user signup date range', () => {
  it('defaults from the earliest signup through today', () => {
    expect(defaultUserSignupRange([
      '2026-10-12T12:30:00.000Z',
      '2026-08-04T12:30:00.000Z',
    ], new Date('2026-10-27T12:00:00.000Z'))).toEqual({ start: '2026-08-04', end: '2026-10-27' });
  });

  it('includes signups on both selected boundary dates', () => {
    const range = { start: '2026-10-01', end: '2026-10-15' };
    expect(isUserInSignupRange(new Date(2026, 9, 1, 0, 0).toISOString(), range)).toBe(true);
    expect(isUserInSignupRange(new Date(2026, 9, 15, 23, 59).toISOString(), range)).toBe(true);
    expect(isUserInSignupRange(new Date(2026, 9, 16, 0, 0).toISOString(), range)).toBe(false);
  });

  it('uses local calendar dates consistently and formats the selected range', () => {
    const date = new Date(2026, 9, 7, 12);
    expect(signupDateKey(date)).toBe('2026-10-07');
    expect(userSignupRangeLabel({ start: '2026-10-01', end: '2026-10-15' })).toBe('Oct 1, 2026 – Oct 15, 2026');
  });
});
