import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestUser, isOrganizationAdmin } from '@/lib/org';
import { decryptIntegrationCredentials, encryptIntegrationCredentials } from '@/lib/integration-secrets';

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
            { attendees: { has: user.email } }
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

    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Handle Google Calendar Sync Simulation/Real actions
    if (action === 'sync') {
      const existingConnection = await prisma.integrationConnection.findFirst({
        where: { orgId: user.orgId, provider: 'GOOGLE' },
      });

      if (!existingConnection) {
        return NextResponse.json({ success: false, message: 'Google account is not connected.' }, { status: 400 });
      }

      let credentials: { accessToken?: string; refreshToken?: string } = {};
      if (existingConnection.credentialCiphertext) {
        credentials = decryptIntegrationCredentials(existingConnection.credentialCiphertext);
      }

      let accessToken = credentials.accessToken;
      const refreshToken = credentials.refreshToken;

      if (!accessToken) {
        return NextResponse.json({ success: false, message: 'No access token available. Please reconnect Google Calendar.' }, { status: 400 });
      }

      // Check if access token is valid
      const testRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=1`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (testRes.status === 401 && refreshToken) {
        console.log('Access token expired. Refreshing token...');
        const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
            client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          }),
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          accessToken = refreshData.access_token;
          
          credentials.accessToken = accessToken;
          if (refreshData.refresh_token) credentials.refreshToken = refreshData.refresh_token;

          await prisma.integrationConnection.update({
            where: { id: existingConnection.id },
            data: {
              lastSync: new Date(),
              credentialCiphertext: encryptIntegrationCredentials(credentials),
            },
          });
          console.log('Successfully refreshed Google access token.');
        } else {
          const errBody = await refreshRes.text();
          console.error('Failed to refresh Google token:', errBody);
          await prisma.integrationConnection.update({
            where: { id: existingConnection.id },
            data: { status: 'ERROR' },
          });
          return NextResponse.json({ success: false, message: 'Google session expired. Please reconnect.' }, { status: 401 });
        }
      } else if (!testRes.ok) {
        const errBody = await testRes.text();
        console.error('Google token test failed:', errBody);
        return NextResponse.json({ success: false, message: 'Failed to access Google Calendar API.' }, { status: 400 });
      }

      // Sync the calendar events
      if (!accessToken) return NextResponse.json({ success: false, message: 'Google access token is unavailable.' }, { status: 401 });
      await syncGoogleCalendarEvents(accessToken, user.orgId, user.id);

      // Fetch the newly synced events to return them
      const updatedEvents = await prisma.calendarEvent.findMany({
        where: { orgId: user.orgId },
        orderBy: { startTime: 'asc' },
      });

      return NextResponse.json({ success: true, message: 'Google Calendar successfully synchronized.', events: updatedEvents });
    }

    if (action === 'disconnect') {
      // Disconnect by deleting the connection record
      const existingConnection = await prisma.integrationConnection.findFirst({
        where: { orgId: user.orgId, provider: 'GOOGLE' },
      });
      if (existingConnection) {
        await prisma.integrationConnection.delete({
          where: { id: existingConnection.id },
        });
      }
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
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
    if (!isOrganizationAdmin(user) && event.creatorId !== user.id && !rsvpStatus) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
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
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
    if (!isOrganizationAdmin(user) && event.creatorId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

async function syncGoogleCalendarEvents(accessToken: string, orgId: string, creatorId: string) {
  try {
    // Remove previous Google-synced events
    await prisma.calendarEvent.deleteMany({
      where: { orgId, isGoogleEvent: true },
    });

    // Fetch events from Google Calendar API
    const now = new Date();
    const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago
    const timeMax = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days ahead

    const calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&maxResults=50&singleEvents=true&orderBy=startTime`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!calRes.ok) {
      const errBody = await calRes.text();
      console.error('Google Calendar API error:', errBody);
      return;
    }

    const calData = await calRes.json();
    const items = calData.items || [];

    // Color mapping from Google's colorId to hex
    const googleColors: Record<string, string> = {
      '1': '#7986cb', // Lavender
      '2': '#33b679', // Sage
      '3': '#8e24aa', // Grape
      '4': '#e67c73', // Flamingo
      '5': '#f6bf26', // Banana
      '6': '#f4511e', // Tangerine
      '7': '#039be5', // Peacock
      '8': '#616161', // Graphite
      '9': '#3f51b5', // Blueberry
      '10': '#0b8043', // Basil
      '11': '#d50000', // Tomato
    };

    for (const item of items) {
      // Skip all-day events without dateTime
      const startDateTime = item.start?.dateTime || item.start?.date;
      const endDateTime = item.end?.dateTime || item.end?.date;

      if (!startDateTime || !endDateTime) continue;

      const attendees = (item.attendees || []).map((a: any) => a.email).filter(Boolean);
      const attendeeStatus: Record<string, string> = {};
      (item.attendees || []).forEach((a: any) => {
        if (a.email) {
          const status = a.responseStatus === 'accepted' ? 'ACCEPTED'
            : a.responseStatus === 'declined' ? 'DECLINED'
            : 'PENDING';
          attendeeStatus[a.email] = status;
        }
      });

      const color = item.colorId ? (googleColors[item.colorId] || '#4285f4') : '#4285f4';

      await prisma.calendarEvent.create({
        data: {
          title: item.summary || 'Untitled Event',
          description: item.description || null,
          location: item.location || null,
          meetLink: item.hangoutLink || null,
          startTime: new Date(startDateTime),
          endTime: new Date(endDateTime),
          isRecurring: !!item.recurringEventId,
          recurrence: item.recurringEventId ? 'WEEKLY' : 'NONE',
          color,
          orgId,
          creatorId,
          attendees,
          attendeeStatus,
          googleEventId: item.id || null,
          isGoogleEvent: true,
        },
      });
    }

    console.log(`Synced ${items.length} Google Calendar events for org ${orgId}`);
  } catch (error) {
    console.error('Error syncing Google Calendar events:', error);
  }
}
