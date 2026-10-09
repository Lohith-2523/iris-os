import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestUser, isOrganizationAdmin } from '@/lib/org';
import {
  createGoogleCalendarEvent,
  GoogleCalendarIntegrationError,
  syncGoogleCalendarEvents,
} from '@/lib/google-calendar';
import {
  googleCalendarOwnerScope,
  visibleCalendarEventScope,
} from '@/lib/google-calendar-scope';
import { ascendingCursorWhere, cursorHeaders, finishCursorPage, readCursorPage } from '@/lib/cursor-pagination';

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Oops! Please sign in to continue.' }, { status: 401 });

    const pageRequest = readCursorPage(request);
    const events = await prisma.calendarEvent.findMany({
      where: { AND: [visibleCalendarEventScope(user), ascendingCursorWhere(pageRequest.cursor, 'startTime')] },
      orderBy: [{ startTime: 'asc' }, { id: 'asc' }],
      take: pageRequest.take,
    });

    const page = finishCursorPage(events, pageRequest.limit, (event) => event.startTime);
    return NextResponse.json({
      events: page.items,
      pagination: { nextCursor: page.nextCursor, hasMore: page.hasMore, limit: pageRequest.limit },
    }, { headers: cursorHeaders(page, pageRequest.limit) });
  } catch (error: any) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json({ error: 'Oops! Something went wrong. Please try again.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      action,
      title,
      description,
      location,
      meetLink,
      startTime,
      endTime,
      timeZone,
      isRecurring,
      recurrence,
      color,
      attendees,
      isGoogleEvent,
      createGoogleMeet,
    } = body;

    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Oops! Please sign in to continue.' }, { status: 401 });

    if (action === 'sync') {
      const result = await syncGoogleCalendarEvents(user.orgId, user.id);

      const updatedEvents = await prisma.calendarEvent.findMany({
        where: visibleCalendarEventScope(user),
        orderBy: { startTime: 'asc' },
        take: 100,
      });

      return NextResponse.json({
        success: true,
        message: `Synchronized ${result.events} events from ${result.calendars} Google calendars.`,
        events: updatedEvents,
      });
    }

    if (action === 'disconnect') {
      await prisma.$transaction([
        prisma.googleCalendarConnection.deleteMany({
          where: { orgId: user.orgId, userId: user.id },
        }),
        prisma.calendarEvent.deleteMany({
          where: googleCalendarOwnerScope(user.orgId, user.id),
        }),
      ]);
      return NextResponse.json({
        success: true,
        message: 'Google Calendar disconnected.',
        disconnectedCreatorId: user.id,
      });
    }

    // Normal creation validation (time range check)
    if (!title || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing required event parameters' }, { status: 400 });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      return NextResponse.json({ error: 'Start time must be before end time' }, { status: 400 });
    }

    // Conflict detection warning
    const conflict = await prisma.calendarEvent.findFirst({
      where: {
        orgId: user.orgId,
        startTime: { lt: end },
        endTime: { gt: start },
      },
    });

    // Create the event
    const initialStatus: Record<string, string> = {
      [user.email]: 'ACCEPTED'
    };
    if (Array.isArray(attendees)) {
      attendees.forEach((guest: string) => {
        if (guest !== user.email) {
          initialStatus[guest] = 'PENDING';
        }
      });
    }

    const googleEvent = createGoogleMeet
      ? await createGoogleCalendarEvent({
          orgId: user.orgId,
          userId: user.id,
          title,
          description,
          location,
          startTime: start,
          endTime: end,
          timeZone: typeof timeZone === 'string' && timeZone ? timeZone : 'UTC',
          attendees: Array.isArray(attendees) ? attendees : [],
          isRecurring: Boolean(isRecurring),
          recurrence,
          createMeet: true,
        })
      : null;

    const event = await prisma.calendarEvent.create({
      data: {
        title,
        description,
        location,
        meetLink: googleEvent?.meetLink || meetLink || null,
        startTime: start,
        endTime: end,
        isRecurring: !!isRecurring,
        recurrence: recurrence || 'NONE',
        color: color || '#3b82f6',
        orgId: user.orgId,
        creatorId: user.id,
        attendees: googleEvent?.attendees || (Array.isArray(attendees) ? attendees : []),
        attendeeStatus: googleEvent?.attendeeStatus || initialStatus,
        googleEventId: googleEvent?.googleEventId || null,
        isGoogleEvent: Boolean(googleEvent || isGoogleEvent),
      },
    });

    return NextResponse.json({ 
      event, 
      warning: conflict ? `Conflict detected with existing event: "${conflict.title}"` : null 
    });
  } catch (error: any) {
    console.error('Error creating calendar event:', error);
    if (error instanceof GoogleCalendarIntegrationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Oops! Something went wrong. Please try again.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      title,
      description,
      location,
      meetLink,
      startTime,
      endTime,
      isRecurring,
      recurrence,
      color,
      attendees,
      attendeeStatus,
      rsvpStatus,
    } = body;

    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Oops! Please sign in to continue.' }, { status: 401 });

    const event = await prisma.calendarEvent.findUnique({
      where: { id },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Verify same organization
    if (event.orgId !== user.orgId) {
      return NextResponse.json({ error: 'Oops! You do not have enough permissions for this event.' }, { status: 403 });
    }
    if (!isOrganizationAdmin(user) && event.creatorId !== user.id && !rsvpStatus) {
      return NextResponse.json({ error: 'Oops! You do not have enough permissions.' }, { status: 403 });
    }

    // RSVP update shortcut
    if (rsvpStatus) {
      const rsvpEmail = user.email;
      const currentStatus = (event.attendeeStatus as Record<string, string>) || {};
      const updatedStatus = {
        ...currentStatus,
        [rsvpEmail]: rsvpStatus,
      };

      const updatedEvent = await prisma.calendarEvent.update({
        where: { id },
        data: {
          attendeeStatus: updatedStatus,
        },
      });

      return NextResponse.json({ event: updatedEvent });
    }

    // Normal update
    const start = startTime ? new Date(startTime) : event.startTime;
    const end = endTime ? new Date(endTime) : event.endTime;

    if (start >= end) {
      return NextResponse.json({ error: 'Start time must be before end time' }, { status: 400 });
    }

    // Conflict detection warning (excluding current event)
    const conflict = await prisma.calendarEvent.findFirst({
      where: {
        orgId: user.orgId,
        id: { not: id },
        startTime: { lt: end },
        endTime: { gt: start },
      },
    });

    // Merge attendeeStatus if guest list changed
    const currentStatus = (event.attendeeStatus as Record<string, string>) || {};
    const newStatus: Record<string, string> = { ...currentStatus };
    if (Array.isArray(attendees)) {
      // Add new ones
      attendees.forEach((guest: string) => {
        if (!newStatus[guest]) {
          newStatus[guest] = 'PENDING';
        }
      });
      // Clean up removed guests
      Object.keys(newStatus).forEach((guest) => {
        if (!attendees.includes(guest)) {
          delete newStatus[guest];
        }
      });
    }

    const updatedEvent = await prisma.calendarEvent.update({
      where: { id },
      data: {
        title: title !== undefined ? title : event.title,
        description: description !== undefined ? description : event.description,
        location: location !== undefined ? location : event.location,
        meetLink: meetLink !== undefined ? meetLink : event.meetLink,
        startTime: start,
        endTime: end,
        isRecurring: isRecurring !== undefined ? !!isRecurring : event.isRecurring,
        recurrence: recurrence !== undefined ? recurrence : event.recurrence,
        color: color !== undefined ? color : event.color,
        attendees: attendees !== undefined ? attendees : event.attendees,
        attendeeStatus: attendeeStatus !== undefined ? attendeeStatus : newStatus,
      },
    });

    return NextResponse.json({
      event: updatedEvent,
      warning: conflict ? `Conflict detected with existing event: "${conflict.title}"` : null
    });
  } catch (error: any) {
    console.error('Error updating calendar event:', error);
    return NextResponse.json({ error: 'Oops! Something went wrong. Please try again.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing event ID' }, { status: 400 });
    }

    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Oops! Please sign in to continue.' }, { status: 401 });

    const event = await prisma.calendarEvent.findUnique({
      where: { id },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Verify same organization
    if (event.orgId !== user.orgId) {
      return NextResponse.json({ error: 'Oops! You do not have enough permissions for this event.' }, { status: 403 });
    }
    if (!isOrganizationAdmin(user) && event.creatorId !== user.id) {
      return NextResponse.json({ error: 'Oops! You do not have enough permissions.' }, { status: 403 });
    }

    await prisma.calendarEvent.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Event deleted successfully.' });
  } catch (error: any) {
    console.error('Error deleting calendar event:', error);
    return NextResponse.json({ error: 'Oops! Something went wrong. Please try again.' }, { status: 500 });
  }
}
