import 'server-only';

import { randomUUID } from 'crypto';
import { prisma } from '@/lib/db';
import { decryptIntegrationCredentials, encryptIntegrationCredentials } from '@/lib/integration-secrets';
import { googleCalendarOwnerScope } from '@/lib/google-calendar-scope';

type GoogleCredentials = {
  accessToken?: string | null;
  refreshToken?: string | null;
};

type GoogleCalendarListEntry = {
  id?: string;
  accessRole?: string;
};

type GoogleCalendarEvent = {
  id?: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  hangoutLink?: string;
  htmlLink?: string;
  colorId?: string;
  recurringEventId?: string;
  recurrence?: string[];
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: Array<{ email?: string; responseStatus?: string }>;
  conferenceData?: {
    entryPoints?: Array<{ entryPointType?: string; uri?: string }>;
    createRequest?: { status?: { statusCode?: string } };
  };
};

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

const GOOGLE_EVENT_COLORS: Record<string, string> = {
  '1': '#7986cb',
  '2': '#33b679',
  '3': '#8e24aa',
  '4': '#e67c73',
  '5': '#f6bf26',
  '6': '#f4511e',
  '7': '#039be5',
  '8': '#616161',
  '9': '#3f51b5',
  '10': '#0b8043',
  '11': '#d50000',
};

export class GoogleCalendarIntegrationError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
    this.name = 'GoogleCalendarIntegrationError';
  }
}

function meetingLink(event: GoogleCalendarEvent) {
  return event.hangoutLink
    || event.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === 'video')?.uri
    || null;
}

function attendeeStatus(event: GoogleCalendarEvent) {
  const statuses: Record<string, string> = {};
  for (const attendee of event.attendees || []) {
    if (!attendee.email) continue;
    statuses[attendee.email] = attendee.responseStatus === 'accepted'
      ? 'ACCEPTED'
      : attendee.responseStatus === 'declined'
        ? 'DECLINED'
        : attendee.responseStatus === 'tentative'
          ? 'TENTATIVE'
          : 'PENDING';
  }
  return statuses;
}

async function createGoogleCalendarClient(orgId: string, userId: string) {
  const connection = await prisma.googleCalendarConnection.findUnique({
    where: { userId },
  });

  if (
    !connection ||
    connection.orgId !== orgId ||
    connection.status === 'DISCONNECTED' ||
    !connection.credentialCiphertext
  ) {
    throw new GoogleCalendarIntegrationError(
      'Connect your Google account before using Google Calendar.',
      400,
    );
  }

  const activeConnection = connection;
  const credentials = decryptIntegrationCredentials<GoogleCredentials>(activeConnection.credentialCiphertext!);
  let accessToken = credentials.accessToken || null;

  async function refreshAccessToken() {
    if (!credentials.refreshToken) {
      throw new GoogleCalendarIntegrationError('Google authorization has expired. Reconnect your Google account.', 401);
    }

    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new GoogleCalendarIntegrationError('Google OAuth server credentials are not configured.', 500);
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: credentials.refreshToken,
        grant_type: 'refresh_token',
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      await prisma.googleCalendarConnection.update({
        where: { id: activeConnection.id },
        data: { status: 'ERROR' },
      });
      throw new GoogleCalendarIntegrationError('Google authorization has expired. Reconnect your Google account.', 401);
    }

    const payload = await response.json() as { access_token?: string; refresh_token?: string };
    if (!payload.access_token) {
      throw new GoogleCalendarIntegrationError('Google did not return a usable access token.', 502);
    }

    accessToken = payload.access_token;
    credentials.accessToken = payload.access_token;
    if (payload.refresh_token) credentials.refreshToken = payload.refresh_token;

    await prisma.googleCalendarConnection.update({
      where: { id: activeConnection.id },
      data: {
        status: 'CONNECTED',
        credentialCiphertext: encryptIntegrationCredentials(credentials),
      },
    });
  }

  async function request(path: string, init: RequestInit = {}) {
    if (!accessToken) await refreshAccessToken();

    const send = () => fetch(`${GOOGLE_CALENDAR_API}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...init.headers,
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    });

    let response = await send();
    if (response.status === 401) {
      await refreshAccessToken();
      response = await send();
    }
    return response;
  }

  async function json<T>(path: string, init?: RequestInit) {
    const response = await request(path, init);
    if (!response.ok) {
      const details = await response.text();
      console.error('Google Calendar API request failed:', response.status, details);
      throw new GoogleCalendarIntegrationError(
        response.status === 403
          ? 'Google Calendar permission is missing. Reconnect Google and approve calendar event access.'
          : 'Google Calendar could not complete the request.',
        response.status,
      );
    }
    return response.json() as Promise<T>;
  }

  return { json, connection: activeConnection };
}

async function listCalendars(
  json: <T>(path: string, init?: RequestInit) => Promise<T>,
) {
  const calendars: GoogleCalendarListEntry[] = [];
  let pageToken: string | undefined;

  do {
    const query = new URLSearchParams({ maxResults: '250', showHidden: 'true' });
    if (pageToken) query.set('pageToken', pageToken);
    const page = await json<{ items?: GoogleCalendarListEntry[]; nextPageToken?: string }>(
      `/users/me/calendarList?${query}`,
    );
    calendars.push(...(page.items || []));
    pageToken = page.nextPageToken;
  } while (pageToken);

  return calendars.filter((calendar) =>
    calendar.id && ['reader', 'writer', 'owner'].includes(calendar.accessRole || ''),
  );
}

async function listCalendarEvents(
  json: <T>(path: string, init?: RequestInit) => Promise<T>,
  calendarId: string,
) {
  const events: GoogleCalendarEvent[] = [];
  let pageToken: string | undefined;

  do {
    const query = new URLSearchParams({
      timeMin: new Date().toISOString(),
      maxResults: '2500',
      singleEvents: 'true',
      orderBy: 'startTime',
      showDeleted: 'false',
    });
    if (pageToken) query.set('pageToken', pageToken);
    const page = await json<{ items?: GoogleCalendarEvent[]; nextPageToken?: string }>(
      `/calendars/${encodeURIComponent(calendarId)}/events?${query}`,
    );
    events.push(...(page.items || []));
    pageToken = page.nextPageToken;
  } while (pageToken);

  return events;
}

export async function syncGoogleCalendarEvents(orgId: string, creatorId: string) {
  const { json, connection } = await createGoogleCalendarClient(orgId, creatorId);
  const calendars = await listCalendars(json);
  const synchronizedEvents: Array<GoogleCalendarEvent & { calendarId: string }> = [];

  for (const calendar of calendars) {
    if (!calendar.id) continue;
    const events = await listCalendarEvents(json, calendar.id);
    synchronizedEvents.push(...events.map((event) => ({ ...event, calendarId: calendar.id! })));
  }

  const records = synchronizedEvents.flatMap((event) => {
    const start = event.start?.dateTime || event.start?.date;
    const end = event.end?.dateTime || event.end?.date;
    if (!event.id || !start || !end || event.status === 'cancelled') return [];

    return [{
      title: event.summary || 'Untitled Event',
      description: event.description || null,
      location: event.location || null,
      meetLink: meetingLink(event),
      startTime: new Date(start),
      endTime: new Date(end),
      isRecurring: Boolean(event.recurringEventId || event.recurrence?.length),
      recurrence: event.recurringEventId || event.recurrence?.length ? 'RECURRING' : 'NONE',
      color: event.colorId ? (GOOGLE_EVENT_COLORS[event.colorId] || '#4285f4') : '#4285f4',
      orgId,
      creatorId,
      attendees: (event.attendees || []).flatMap((attendee) => attendee.email ? [attendee.email] : []),
      attendeeStatus: attendeeStatus(event),
      googleEventId: `${event.calendarId}::${event.id}`,
      isGoogleEvent: true,
    }];
  });

  const createOperations = [];
  for (let offset = 0; offset < records.length; offset += 500) {
    createOperations.push(prisma.calendarEvent.createMany({ data: records.slice(offset, offset + 500) }));
  }

  await prisma.$transaction([
    prisma.calendarEvent.deleteMany({
      where: googleCalendarOwnerScope(orgId, creatorId),
    }),
    ...createOperations,
    prisma.googleCalendarConnection.update({
      where: { id: connection.id },
      data: {
        status: 'CONNECTED',
        lastSync: new Date(),
        syncLogs: JSON.stringify({
          calendars: calendars.length,
          events: records.length,
          synchronizedAt: new Date().toISOString(),
        }),
      },
    }),
  ]);

  return { calendars: calendars.length, events: records.length };
}

type CreateGoogleEventInput = {
  orgId: string;
  userId: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startTime: Date;
  endTime: Date;
  timeZone: string;
  attendees: string[];
  isRecurring: boolean;
  recurrence?: string | null;
  createMeet: boolean;
};

export async function createGoogleCalendarEvent(input: CreateGoogleEventInput) {
  const { json } = await createGoogleCalendarClient(input.orgId, input.userId);
  const requestId = randomUUID();
  const recurrence = input.isRecurring && ['DAILY', 'WEEKLY'].includes(input.recurrence || '')
    ? [`RRULE:FREQ=${input.recurrence}`]
    : undefined;

  let event = await json<GoogleCalendarEvent>(
    '/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary: input.title,
        description: input.description || undefined,
        location: input.location || undefined,
        start: { dateTime: input.startTime.toISOString(), timeZone: input.timeZone },
        end: { dateTime: input.endTime.toISOString(), timeZone: input.timeZone },
        attendees: input.attendees.map((email) => ({ email })),
        recurrence,
        conferenceData: input.createMeet
          ? {
              createRequest: {
                requestId,
                conferenceSolutionKey: { type: 'hangoutsMeet' },
              },
            }
          : undefined,
      }),
    },
  );

  if (input.createMeet && !meetingLink(event) && event.id) {
    const eventId = event.id;
    for (let attempt = 0; attempt < 3 && !meetingLink(event); attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      event = await json<GoogleCalendarEvent>(
        `/calendars/primary/events/${encodeURIComponent(eventId)}`,
      );
    }
  }

  const meetLink = meetingLink(event);
  if (input.createMeet && !meetLink) {
    throw new GoogleCalendarIntegrationError('Google created the event but did not finish provisioning its Meet link.', 502);
  }

  return {
    googleEventId: event.id ? `primary::${event.id}` : null,
    meetLink,
    attendees: (event.attendees || []).flatMap((attendee) => attendee.email ? [attendee.email] : []),
    attendeeStatus: attendeeStatus(event),
  };
}
