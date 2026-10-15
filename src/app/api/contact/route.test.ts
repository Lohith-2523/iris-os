import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  upsert: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  sendIrisEmail: vi.fn(),
  verifyRecaptchaToken: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: { helpRequest: { upsert: mocks.upsert, update: mocks.update, updateMany: mocks.updateMany } },
}));
vi.mock('@/lib/email/iris-email', () => ({ sendIrisEmail: mocks.sendIrisEmail }));
vi.mock('@/lib/recaptcha', () => ({
  RecaptchaConfigurationError: class extends Error {},
  verifyRecaptchaToken: mocks.verifyRecaptchaToken,
}));
vi.mock('@/lib/email/iris-templates', () => ({
  contactRequestNotificationEmail: () => ({ subject: 'Contact', html: '<p>Contact</p>', text: 'Contact' }),
}));

import { POST } from './route';

const body = {
  requestId: '7609d87b-40ad-4f78-898b-2b81e8632ed1',
  name: 'Avery Morgan',
  email: 'avery@example.com',
  company: 'North Studio',
  topic: 'SALES',
  subject: 'IrisOS for our agency',
  message: 'We would like to discuss onboarding our delivery team.',
  recaptchaToken: 'verified-token-with-enough-length',
  website: '',
};

function request(payload = body) {
  return new Request('https://irisos.app/api/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.10' },
    body: JSON.stringify(payload),
  });
}

describe('POST /api/contact', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyRecaptchaToken.mockResolvedValue(true);
    mocks.upsert.mockResolvedValue({ emailSentAt: null });
    mocks.update.mockResolvedValue({});
    mocks.updateMany.mockResolvedValue({ count: 0 });
    mocks.sendIrisEmail.mockResolvedValue({ id: 'mail-1' });
  });

  it('verifies and delivers a contact request to the public inbox', async () => {
    const response = await POST(request());

    expect(response.status).toBe(201);
    expect(mocks.verifyRecaptchaToken).toHaveBeenCalledWith({
      token: body.recaptchaToken,
      remoteIp: '203.0.113.10',
      userAgent: undefined,
    });
    expect(mocks.sendIrisEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: ['contact@irisos.app'],
      idempotencyKey: `contact:${body.requestId}`,
    }));
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: body.requestId } }));
  });

  it('rejects a request when Google verification fails', async () => {
    mocks.verifyRecaptchaToken.mockResolvedValue(false);

    const response = await POST(request());

    expect(response.status).toBe(400);
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.sendIrisEmail).not.toHaveBeenCalled();
  });

  it('does not deliver an already completed request twice', async () => {
    mocks.upsert.mockResolvedValue({ emailSentAt: new Date() });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.sendIrisEmail).not.toHaveBeenCalled();
  });
});
