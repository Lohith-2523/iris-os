import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrganization } from '@/lib/org';
import { deobfuscateEmail } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // If the user denied access
    if (error) {
      console.warn('Google OAuth denied:', error);
      return NextResponse.redirect(new URL('/dashboard?google_connected=denied', request.url));
    }

    if (!code || state !== 'google_onboarding') {
      return NextResponse.redirect(new URL('/dashboard?google_connected=error', request.url));
    }

    // Determine origin for redirect URI
    const origin = request.headers.get('x-forwarded-host')
      ? `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('x-forwarded-host')}`
      : request.nextUrl.origin;

    const redirectUri = `${origin}/api/google/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error('Google token exchange failed:', errBody);
      return NextResponse.redirect(new URL('/dashboard?google_connected=error', request.url));
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    // Get organization
    const org = await getOrganization(request);
    if (!org) {
      console.error('Organization not found during Google callback');
      return NextResponse.redirect(new URL('/dashboard?google_connected=error', request.url));
    }

    // Get user info from Google
    let googleUserInfo: any = {};
    try {
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (userInfoRes.ok) {
        googleUserInfo = await userInfoRes.json();
      }
    } catch (e) {
      console.warn('Failed to fetch Google user info:', e);
    }

    // Store the connection in database
    const syncLogs = JSON.stringify({
      accessToken,
      refreshToken: refreshToken || null,
      email: googleUserInfo.email || 'unknown',
      name: googleUserInfo.name || 'unknown',
      connectedAt: new Date().toISOString(),
    });

    const existingConnection = await prisma.integrationConnection.findFirst({
      where: { orgId: org.id, provider: 'GOOGLE' },
    });

    if (existingConnection) {
      await prisma.integrationConnection.update({
        where: { id: existingConnection.id },
        data: {
          status: 'CONNECTED',
          lastSync: new Date(),
          syncLogs,
        },
      });
    } else {
      await prisma.integrationConnection.create({
        data: {
          orgId: org.id,
          provider: 'GOOGLE',
          status: 'CONNECTED',
          lastSync: new Date(),
          syncLogs,
        },
      });
    }

    // Fetch Google Calendar events
    const calendarUserId = await resolveUserId(request, org.id);

    if (calendarUserId) {
      await syncGoogleCalendarEvents(accessToken, org.id, calendarUserId);
    }

    return NextResponse.redirect(new URL('/dashboard?google_connected=true', request.url));
  } catch (error: any) {
    console.error('Error in Google OAuth callback:', error);
    return NextResponse.redirect(new URL('/dashboard?google_connected=error', request.url));
  }
}

async function resolveUserId(request: NextRequest, orgId: string): Promise<string | null> {
  const rawEmail = request.cookies.get('currentUserEmail')?.value;
  if (rawEmail) {
    const email = deobfuscateEmail(rawEmail);
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) return user.id;
  }

  // Fallback: first admin user in the organization
  const fallbackUser = await prisma.user.findFirst({
    where: { orgId, role: 'ADMIN' },
    orderBy: { createdAt: 'asc' },
  });
  return fallbackUser?.id || null;
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
