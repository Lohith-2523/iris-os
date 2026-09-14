import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  sendDailyWaitlistReport: vi.fn(),
  sendDueWaitlistInvitations: vi.fn(),
}));

vi.mock('@/lib/waitlist-daily-report', () => ({
  sendDailyWaitlistReport: mocks.sendDailyWaitlistReport,
}));

vi.mock('@/lib/auth-access', () => ({
  sendDueWaitlistInvitations: mocks.sendDueWaitlistInvitations,
}));

import { GET } from './route';

function cronRequest(secret = 'cron-secret') {
  return new NextRequest('http://localhost:3000/api/cron/waitlist-daily', {
    headers: { authorization: `Bearer ${secret}` },
  });
}

describe('GET /api/cron/waitlist-daily', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'cron-secret';
    mocks.sendDailyWaitlistReport.mockResolvedValue({ sent: true, entryCount: 4 });
    mocks.sendDueWaitlistInvitations.mockResolvedValue({ processed: 2, sent: 2, failed: 0 });
  });

  it('runs the report and invitation deliveries in one daily invocation', async () => {
    const response = await GET(cronRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.sendDailyWaitlistReport).toHaveBeenCalledTimes(1);
    expect(mocks.sendDueWaitlistInvitations).toHaveBeenCalledTimes(1);
    expect(body).toEqual({
      report: { sent: true, entryCount: 4 },
      invitations: { processed: 2, sent: 2, failed: 0 },
    });
  });

  it('rejects requests without the cron secret', async () => {
    const response = await GET(cronRequest('wrong-secret'));

    expect(response.status).toBe(401);
    expect(mocks.sendDailyWaitlistReport).not.toHaveBeenCalled();
    expect(mocks.sendDueWaitlistInvitations).not.toHaveBeenCalled();
  });

  it('waits for both tasks and reports a partial failure', async () => {
    mocks.sendDailyWaitlistReport.mockRejectedValue(new Error('report failed'));

    const response = await GET(cronRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(mocks.sendDueWaitlistInvitations).toHaveBeenCalledTimes(1);
    expect(body.report).toBeNull();
    expect(body.invitations).toEqual({ processed: 2, sent: 2, failed: 0 });
  });
});
