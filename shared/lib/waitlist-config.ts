// Retained for compatibility with legacy waitlist jobs and access records.
// Authentication and workspace signup no longer consult this flag.
export const WAITLIST_ENABLED = false;

// Historical release timestamp used only by legacy access-token records.
export const WAITLIST_ACCESS_OPENS_AT = new Date('2026-10-14T00:00:00.000+05:30');

export function isWaitlistGateActive(now = new Date()) {
  return WAITLIST_ENABLED && now < WAITLIST_ACCESS_OPENS_AT;
}
