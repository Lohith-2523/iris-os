import { beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';

import { GET } from './route';

function cronRequest(secret = 'cron-secret') {
  return new NextRequest('http://localhost:3000/api/cron/waitlist-daily', {
    headers: { authorization: `Bearer ${secret}` },
  });
}

describe('GET /api/cron/waitlist-daily', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'cron-secret';
  });

  it('reports that the retired waitlist job is disabled', async () => {
    const response = await GET(cronRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ skipped: true, reason: 'The waitlist has been retired.' });
  });

  it('rejects requests without the configured cron secret', async () => {
    const response = await GET(cronRequest('wrong-secret'));

    expect(response.status).toBe(401);
  });
});
