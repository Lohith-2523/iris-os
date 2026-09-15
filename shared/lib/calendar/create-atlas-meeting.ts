import 'server-only';

import { prisma } from '@/lib/db';
import { createGoogleCalendarEvent } from '@/lib/google-calendar';
import {
  assertIrisEmailConfigured,
  sendIrisEmail,
} from '@/lib/email/iris-email';
import { meetingInvitationEmail } from '@/lib/email/iris-templates';

export async function createAtlasMeeting(input: {
  orgId: string;
  userId: string;
  organizerEmail: string;
  organizerName: string;
  organizationName: string;
  title: string;
  attendees: string[];
  startTime: Date;
  endTime: Date;
  timeZone: string;
}) {
  // Do not create an external calendar event unless branded email delivery is configured.
  assertIrisEmailConfigured();

  const conflict = await prisma.calendarEvent.findFirst({
    where: {
      orgId: input.orgId,
      creatorId: input.userId,
      startTime: { lt: input.endTime },
      endTime: { gt: input.startTime },
    },
    select: { title: true },
  });

  const googleEvent = await createGoogleCalendarEvent({
    orgId: input.orgId,
    userId: input.userId,
    title: input.title,
    description: 'Created by Atlas AI in Iris OS.',
    startTime: input.startTime,
    endTime: input.endTime,
    timeZone: input.timeZone,
    attendees: input.attendees,
    isRecurring: false,
    recurrence: 'NONE',
    createMeet: true,
  });

  const attendees = googleEvent.attendees.length > 0 ? googleEvent.attendees : input.attendees;
  const attendeeStatus = googleEvent.attendeeStatus || Object.fromEntries(
    attendees.map((email) => [email, 'PENDING']),
  );
  attendeeStatus[input.organizerEmail] = 'ACCEPTED';

  const event = await prisma.calendarEvent.create({
    data: {
      title: input.title,
      description: 'Created by Atlas AI in Iris OS.',
      meetLink: googleEvent.meetLink,
      startTime: input.startTime,
      endTime: input.endTime,
      isRecurring: false,
      recurrence: 'NONE',
      color: '#71717a',
      orgId: input.orgId,
      creatorId: input.userId,
      attendees,
      attendeeStatus,
      googleEventId: googleEvent.googleEventId,
      isGoogleEvent: true,
    },
  });

  const template = meetingInvitationEmail({
    meetingName: input.title,
    organizerName: input.organizerName,
    organizationName: input.organizationName,
    startTime: input.startTime,
    endTime: input.endTime,
    timeZone: input.timeZone,
    meetUrl: googleEvent.meetLink!,
  });

  const deliveries = await Promise.allSettled(
    attendees.map((email) => sendIrisEmail({
      to: [email],
      subject: template.subject,
      html: template.html,
      text: template.text,
      idempotencyKey: `meeting-${event.id}-${email}`,
      tags: [{ name: 'category', value: 'meeting_invite' }],
    })),
  );
  const failedRecipients = attendees.filter((_, index) => deliveries[index].status === 'rejected');

  return {
    event,
    conflictTitle: conflict?.title || null,
    email: {
      sent: attendees.length - failedRecipients.length,
      failedRecipients,
    },
  };
}
