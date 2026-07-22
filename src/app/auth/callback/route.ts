import { NextResponse } from 'next/server';
import { createClient } from '@/lib/server';
import { prisma } from '@/lib/db';
import { provisionAuthenticatedUser } from '@/lib/org';
import { encryptIntegrationCredentials } from '@/lib/integration-secrets';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const requestedNext = searchParams.get('next') ?? '/dashboard';
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/dashboard';
  const type = searchParams.get('type');
  const isCalendar = type === 'calendar' || next.startsWith('/calendar');

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data?.session) {
      const session = data.session;
      const email = session.user?.email;
      const providerToken = session.provider_token;
      const providerRefreshToken = session.provider_refresh_token;

      if (email) {
        if (next.startsWith('/onboarding/member')) {
          const inviteToken = new URL(next, origin).searchParams.get('token');
          const invite = inviteToken ? await prisma.memberInvite.findUnique({ where: { token: inviteToken } }) : null;
          if (invite && !invite.used && invite.expiresAt > new Date() && invite.email.toLowerCase() === email.toLowerCase()) {
            return NextResponse.redirect(`${origin}${next}`);
          }
          return NextResponse.redirect(`${origin}/login`);
        }

        const dbUser = await provisionAuthenticatedUser(session.user);
        if (dbUser) {
          const role = dbUser.role?.toLowerCase() || 'admin';

          if (isCalendar) {
            // Save the Google Connection details in database
            const credentialCiphertext = encryptIntegrationCredentials({
              accessToken: providerToken || null,
              refreshToken: providerRefreshToken || null,
            });
            const syncLogs = JSON.stringify({
              email,
              name: session.user.user_metadata?.full_name || email.split('@')[0],
              connectedAt: new Date().toISOString(),
            });

            await prisma.integrationConnection.upsert({
              where: { orgId_provider: { orgId: dbUser.orgId, provider: 'GOOGLE' } },
              update: { status: 'CONNECTED', lastSync: new Date(), syncLogs, credentialCiphertext },
              create: { orgId: dbUser.orgId, provider: 'GOOGLE', status: 'CONNECTED', lastSync: new Date(), syncLogs, credentialCiphertext },
            });

            // Sync Google Calendar events if token available
            if (providerToken) {
              await syncGoogleCalendarEvents(providerToken, dbUser.orgId, dbUser.id);
            }

            const response = NextResponse.redirect(`${origin}/calendar?google_connected=true`);
            return response;
          } else {
            // Regular Signup / Login flow
            const redirectUrl = role === 'client' ? '/client-dashboard' : role === 'member' ? '/teams-dashboard' : next;
            const response = NextResponse.redirect(`${origin}${redirectUrl}`);
            return response;
          }
        }
      }
    }
  }

  // If OAuth failed or no code, redirect to login page
  const redirectPath = isCalendar ? '/calendar?google_connected=error' : '/login';
  return NextResponse.redirect(`${origin}${redirectPath}`);
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
      console.error('Google Calendar API error in auth callback:', errBody);
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
