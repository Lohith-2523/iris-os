import { describe, expect, it } from 'vitest';
import { buildDailyBriefing, dailyBriefingBusinessDate, dailyBriefingGreeting, normalizeBriefingTimeZone } from '@/lib/daily-briefing';

describe('daily briefing business day', () => {
  it('keeps pre-4 AM activity in the previous business day', () => {
    expect(dailyBriefingBusinessDate(new Date('2026-07-31T22:00:00.000Z'), 'Asia/Kolkata')).toBe('2026-07-31');
  });

  it('starts a new briefing from 4 AM in the user timezone', () => {
    expect(dailyBriefingBusinessDate(new Date('2026-07-31T23:00:00.000Z'), 'Asia/Kolkata')).toBe('2026-08-01');
  });

  it('keeps 3:59 AM in the prior briefing day and starts a new day at 4:00 AM', () => {
    expect(dailyBriefingBusinessDate(new Date('2026-07-31T22:29:00.000Z'), 'Asia/Kolkata')).toBe('2026-07-31');
    expect(dailyBriefingBusinessDate(new Date('2026-07-31T22:30:00.000Z'), 'Asia/Kolkata')).toBe('2026-08-01');
  });

  it('falls back safely for invalid timezones', () => {
    expect(normalizeBriefingTimeZone('not/a-timezone')).toBe('Asia/Kolkata');
  });

  it('uses the local login time for the greeting', () => {
    expect(dailyBriefingGreeting('Asha Rao', new Date('2026-08-01T05:30:00.000Z'), 'Asia/Kolkata')).toBe('Good morning, Asha.');
    expect(dailyBriefingGreeting('Asha Rao', new Date('2026-08-01T08:30:00.000Z'), 'Asia/Kolkata')).toBe('Good afternoon, Asha.');
    expect(dailyBriefingGreeting('Asha Rao', new Date('2026-08-01T10:30:00.000Z'), 'Asia/Kolkata')).toBe('Good evening, Asha.');
  });
});

describe('daily briefing payload', () => {
  it('creates the complete action-first briefing from workspace facts', () => {
    const payload = buildDailyBriefing({
      userName: 'Asha Rao',
      currency: 'INR',
      timeZone: 'Asia/Kolkata',
      now: new Date('2026-07-31T04:30:00.000Z'),
      tasks: [{ title: 'Approve launch copy', status: 'BLOCKED', deadline: null, projectName: 'Aether' }],
      transactions: [{ amount: 125000, date: new Date('2026-07-20T04:30:00.000Z') }],
      invoices: [{ amount: 50000, paidAmount: 10000, dueDate: new Date('2026-07-25T04:30:00.000Z'), status: 'PARTIALLY_PAID', invoiceNumber: 'INV-104' }],
      meetings: [{ title: 'Client review', startTime: new Date('2026-07-31T08:30:00.000Z'), attendees: ['client@example.com'] }],
      projects: [{ name: 'Aether', status: 'IN_PROGRESS', progress: 54, delayedStages: ['Creative review'], delayedTasks: ['Publish campaign'] }],
      leads: [{ fullName: 'Mira Kapoor', status: 'warm', estimatedClientValue: 80000 }],
      clients: [{ name: 'Northstar', churnRiskScore: 72, renewalDate: new Date('2026-08-15T04:30:00.000Z') }],
    });

    expect(payload.greeting).toBe('Good morning, Asha.');
    expect(payload.version).toBe(2);
    expect(payload.items).toHaveLength(8);
    expect(payload.items.map((item) => item.id)).toEqual([
      'priority-tasks',
      'revenue',
      'meetings',
      'receivables',
      'delivery-delays',
      'pipeline',
      'renewals-due',
      'blocked-tasks',
    ]);
    expect(payload.items[4].metric).toBe('2 delayed');
    expect(payload.items[3].metric).toContain('40,000');
    expect(payload.items[7].metric).toBe('1 blocked');
  });
});
