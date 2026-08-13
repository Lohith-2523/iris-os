import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: {} }));

import { recipientSignatureNotification } from './signing';

describe('recipient signature notifications', () => {
  it('directs the agency user to countersign a client-signed contract', () => {
    expect(recipientSignatureNotification({
      kind: 'CONTRACT',
      title: 'Growth Services Agreement',
      documentNumber: 'CTR-2026-014',
      recipientSignerName: 'Avery Morgan',
    })).toEqual({
      type: 'APPROVAL',
      title: 'Client signed contract',
      body: 'Avery Morgan signed Growth Services Agreement (CTR-2026-014). Countersign it to finalize the document.',
      href: '/documents',
      actionLabel: 'Countersign now',
    });
  });
});
