export type UserSignupRange = { start: string; end: string };

export function signupDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function defaultUserSignupRange(createdAtValues: string[], today = new Date()): UserSignupRange {
  const end = signupDateKey(today);
  const signupDates = createdAtValues.map(signupDateKey).filter(Boolean).sort();
  return { start: signupDates[0] ?? end, end };
}

export function isUserInSignupRange(createdAt: string, range: UserSignupRange) {
  const signupDate = signupDateKey(createdAt);
  return Boolean(signupDate && range.start && range.end && signupDate >= range.start && signupDate <= range.end);
}

export function userSignupRangeLabel(range: UserSignupRange) {
  const formatter = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  return `${formatter.format(new Date(`${range.start}T00:00:00.000Z`))} – ${formatter.format(new Date(`${range.end}T00:00:00.000Z`))}`;
}
