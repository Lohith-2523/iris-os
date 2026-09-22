import { describe, expect, it } from 'vitest';
import {
  googleCalendarOwnerScope,
  visibleCalendarEventScope,
} from './google-calendar-scope';

describe('Google Calendar ownership scopes', () => {
  it('limits synchronized-event replacement to one user', () => {
    expect(googleCalendarOwnerScope('org-1', 'user-1')).toEqual({
      orgId: 'org-1',
      creatorId: 'user-1',
      isGoogleEvent: true,
    });
  });

  it('limits member and client visibility to owned or invited events', () => {
    expect(visibleCalendarEventScope({
      id: 'member-1',
      orgId: 'org-1',
      email: 'member@example.com',
      role: 'member',
    })).toEqual({
      orgId: 'org-1',
      OR: [
        { creatorId: 'member-1' },
        { attendees: { has: 'member@example.com' } },
      ],
    });
  });

  it('preserves organization-wide visibility for admins', () => {
    expect(visibleCalendarEventScope({
      id: 'admin-1',
      orgId: 'org-1',
      email: 'admin@example.com',
      role: 'admin',
    })).toEqual({ orgId: 'org-1' });
  });
});
