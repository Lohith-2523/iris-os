import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { deobfuscateEmail } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const isSkippedAll = request.cookies.get('skipped_all_steps')?.value === 'true';
    if (isSkippedAll) {
      return NextResponse.json({ events: [] });
    }

    const { searchParams } = new URL(request.url);
    const rawEmail = searchParams.get('email') || request.cookies.get('currentUserEmail')?.value;
    if (!rawEmail) {
      return NextResponse.json({ events: [] });
    }
    const email = deobfuscateEmail(rawEmail);

    // 1. Fetch user to verify organization and role
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 2. Fetch events. If client: only see created events or if in attendees list.
    // If admin: see all events in organization.
    let events;
    if (user.role.toLowerCase() === 'admin') {
      events = await prisma.calendarEvent.findMany({
        where: { orgId: user.orgId },
        orderBy: { startTime: 'asc' },
      });
    } else {
      events = await prisma.calendarEvent.findMany({
        where: {
          orgId: user.orgId,
          OR: [
            { creatorId: user.id },
            { attendees: { has: email } }
          ]
        },
        orderBy: { startTime: 'asc' },
      });
    }

    return NextResponse.json({ events });
  } catch (error: any) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      action,
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
      isGoogleEvent,
    } = body;

    const rawEmail = email || request.cookies.get('currentUserEmail')?.value;
    if (!rawEmail) {
      return NextResponse.json({ error: 'User context required' }, { status: 401 });
    }
    const userEmail = deobfuscateEmail(rawEmail);
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Handle Google Calendar Sync Simulation actions
    if (action === 'sync') {
      return NextResponse.json({ success: true, message: 'No calendar data was imported because no live calendar provider is connected.', events: [] });
    }

    if (action === 'disconnect') {
      // Delete synced google events
      await prisma.calendarEvent.deleteMany({
        where: {
          orgId: user.orgId,
          isGoogleEvent: true,
        },
      });
      return NextResponse.json({ success: true, message: 'Google Calendar disconnected.' });
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

    const event = await prisma.calendarEvent.create({
      data: {
        title,
        description,
        location,
        meetLink,
        startTime: start,
        endTime: end,
        isRecurring: !!isRecurring,
        recurrence: recurrence || 'NONE',
        color: color || '#3b82f6',
        orgId: user.orgId,
        creatorId: user.id,
        attendees: Array.isArray(attendees) ? attendees : [],
        attendeeStatus: initialStatus,
        isGoogleEvent: !!isGoogleEvent,
      },
    });

    return NextResponse.json({ 
      event, 
      warning: conflict ? `Conflict detected with existing event: "${conflict.title}"` : null 
    });
  } catch (error: any) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
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
      rsvpEmail,
      rsvpStatus,
    } = body;

    const rawEmail = email || request.cookies.get('currentUserEmail')?.value;
    if (!rawEmail) {
      return NextResponse.json({ error: 'User context required' }, { status: 401 });
    }
    const userEmail = deobfuscateEmail(rawEmail);
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const event = await prisma.calendarEvent.findUnique({
      where: { id },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Verify same organization
    if (event.orgId !== user.orgId) {
      return NextResponse.json({ error: 'Unauthorized access to event' }, { status: 403 });
    }

    // RSVP update shortcut
    if (rsvpEmail && rsvpStatus) {
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
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const rawEmail = searchParams.get('email') || request.cookies.get('currentUserEmail')?.value;
    if (!rawEmail) {
      return NextResponse.json({ error: 'User context required' }, { status: 401 });
    }
    const email = deobfuscateEmail(rawEmail);

    if (!id) {
      return NextResponse.json({ error: 'Missing event ID' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const event = await prisma.calendarEvent.findUnique({
      where: { id },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Verify same organization
    if (event.orgId !== user.orgId) {
      return NextResponse.json({ error: 'Unauthorized access to event' }, { status: 403 });
    }

    await prisma.calendarEvent.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Event deleted successfully.' });
  } catch (error: any) {
    console.error('Error deleting calendar event:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
