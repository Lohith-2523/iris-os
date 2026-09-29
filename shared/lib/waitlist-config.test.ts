import { describe, expect, it } from 'vitest';
import { isWaitlistGateActive, WAITLIST_ACCESS_OPENS_AT } from './waitlist-config';

describe('waitlist release boundary', () => {
  it('keeps the gate active until October 14, 2026 in India', () => {
    expect(isWaitlistGateActive(new Date('2026-10-13T18:29:59.999Z'))).toBe(true);
    expect(WAITLIST_ACCESS_OPENS_AT.toISOString()).toBe('2026-10-13T18:30:00.000Z');
  });

  it('opens login and signup to everyone at the release boundary', () => {
    expect(isWaitlistGateActive(new Date('2026-10-13T18:30:00.000Z'))).toBe(false);
    expect(isWaitlistGateActive(new Date('2026-10-15T00:00:00.000Z'))).toBe(false);
  });
});
