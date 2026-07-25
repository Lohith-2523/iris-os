export type CalendarViewer = {
  email: string;
  id: string;
  orgId: string;
  role: string;
};

export function googleCalendarOwnerScope(orgId: string, userId: string) {
  return {
    orgId,
    creatorId: userId,
    isGoogleEvent: true,
  } as const;
}

export function visibleCalendarEventScope(user: CalendarViewer) {
  if (user.role.toLowerCase() === 'admin') {
    return { orgId: user.orgId };
  }

  return {
    orgId: user.orgId,
    OR: [
      { creatorId: user.id },
      { attendees: { has: user.email } },
    ],
  };
}
