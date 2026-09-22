import { z } from 'zod';

export type MeetingWorkflowState = {
  title: string;
  attendees: string[];
  startLocal: string;
  timeZone: string;
  durationMinutes: number;
  awaitingConfirmation: boolean;
};

export const EMPTY_MEETING_WORKFLOW: MeetingWorkflowState = {
  title: '',
  attendees: [],
  startLocal: '',
  timeZone: 'UTC',
  durationMinutes: 30,
  awaitingConfirmation: false,
};

export const geminiMeetingResultSchema = z.object({
  title: z.string().trim().max(200),
  attendees: z.array(z.string().trim().toLowerCase()).max(50),
  startLocal: z.string().trim().max(32),
  action: z.enum(['COLLECT', 'READY', 'CONFIRM', 'CANCEL']),
  reply: z.string().trim().max(1_000),
});

export type GeminiMeetingResult = z.infer<typeof geminiMeetingResultSchema>;

export function isMeetingRequest(query: string) {
  const normalized = query.toLowerCase();
  return /\b(meeting|meet with|google meet|calendar invite|calendar event|video call|call with)\b/.test(normalized)
    && /\b(create|schedule|book|set up|setup|arrange|organize|add|need|want)\b/.test(normalized);
}

export function validTimeZone(value: unknown) {
  const candidate = typeof value === 'string' && value.trim() ? value.trim() : 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidate }).format();
    return candidate;
  } catch {
    return 'UTC';
  }
}

function normalizedEmails(values: string[]) {
  return Array.from(new Set(
    values
      .map((email) => email.trim().toLowerCase())
      .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
  ));
}

export function mergeMeetingWorkflow(
  current: Partial<MeetingWorkflowState> | null,
  result: GeminiMeetingResult,
  fallbackTimeZone: string,
): MeetingWorkflowState {
  return {
    title: result.title || current?.title || '',
    attendees: normalizedEmails(result.attendees.length ? result.attendees : (current?.attendees || [])),
    startLocal: result.startLocal || current?.startLocal || '',
    timeZone: validTimeZone(current?.timeZone || fallbackTimeZone),
    durationMinutes: 30,
    awaitingConfirmation: result.action === 'READY'
      || (Boolean(current?.awaitingConfirmation) && result.action !== 'CANCEL'),
  };
}

export function missingMeetingFields(state: MeetingWorkflowState) {
  const missing: string[] = [];
  if (!state.title) missing.push('meeting name');
  if (state.attendees.length === 0) missing.push('attendee names or email addresses');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(state.startLocal)) missing.push('date and time');
  return missing;
}

export function zonedLocalDateTimeToUtc(localDateTime: string, timeZone: string) {
  const match = localDateTime.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) throw new Error('Meeting date and time are invalid.');

  const [, year, month, day, hour, minute] = match;
  const desired = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  let candidate = desired;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: validTimeZone(timeZone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  for (let iteration = 0; iteration < 2; iteration += 1) {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(candidate))
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, part.value]),
    );
    const represented = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
    );
    candidate += desired - represented;
  }

  const date = new Date(candidate);
  if (Number.isNaN(date.getTime())) throw new Error('Meeting date and time are invalid.');
  return date;
}

export function meetingConfirmationMessage(state: MeetingWorkflowState) {
  return [
    'I have the meeting ready:',
    '',
    `**Meeting:** ${state.title}`,
    `**Attendees:** ${state.attendees.join(', ')}`,
    `**Date and time:** ${state.startLocal.replace('T', ' ')} (${state.timeZone})`,
    '**Duration:** 30 minutes',
    '',
    'Reply **Confirm** to create the Google Calendar event and send the invitations, or tell me what to change.',
  ].join('\n');
}
