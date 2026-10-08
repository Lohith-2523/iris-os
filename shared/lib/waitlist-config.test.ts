import { describe, expect, it } from 'vitest';
import { isWaitlistGateActive, WAITLIST_ENABLED } from './waitlist-config';

describe('retired waitlist gate', () => {
  it('keeps public access open at every date', () => {
    expect(WAITLIST_ENABLED).toBe(false);
    expect(isWaitlistGateActive(new Date('2026-01-01T00:00:00.000Z'))).toBe(false);
    expect(isWaitlistGateActive(new Date('2030-01-01T00:00:00.000Z'))).toBe(false);
  });
});
