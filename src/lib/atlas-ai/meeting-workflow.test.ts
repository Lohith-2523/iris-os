import { describe, expect, it } from 'vitest';
import {
  isMeetingRequest,
  mergeMeetingWorkflow,
  missingMeetingFields,
  zonedLocalDateTimeToUtc,
} from './meeting-workflow';

describe('Atlas meeting workflow', () => {
  it('detects explicit scheduling requests', () => {
    expect(isMeetingRequest('Schedule a meeting with the client tomorrow')).toBe(true);
    expect(isMeetingRequest('Summarize this client')).toBe(false);
  });

  it('merges and validates required meeting details', () => {
    const state = mergeMeetingWorkflow(null, {
      title: 'Client review',
      attendees: ['Person@Example.com'],
      startLocal: '2026-08-12T15:30',
      action: 'READY',
      reply: '',
    }, 'Asia/Calcutta');

    expect(state.attendees).toEqual(['person@example.com']);
    expect(state.awaitingConfirmation).toBe(true);
    expect(missingMeetingFields(state)).toEqual([]);
  });

  it('converts an Iris-local time into UTC', () => {
    expect(zonedLocalDateTimeToUtc('2026-08-12T15:30', 'Asia/Calcutta').toISOString())
      .toBe('2026-08-12T10:00:00.000Z');
  });
});
