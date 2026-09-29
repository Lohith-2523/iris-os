// Keep enrollment, invitation delivery, and authentication gates in sync.
export const WAITLIST_ENABLED = true;

// The public waitlist remains the entry point until the IrisOS launch date.
// Store the India launch midnight as an absolute instant so every deployment
// evaluates the same release boundary regardless of its server timezone.
export const WAITLIST_ACCESS_OPENS_AT = new Date('2026-10-14T00:00:00.000+05:30');

export function isWaitlistGateActive(now = new Date()) {
  return WAITLIST_ENABLED && now < WAITLIST_ACCESS_OPENS_AT;
}
