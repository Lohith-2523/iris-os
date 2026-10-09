import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { decryptMessagingPrivateKey, encryptMessagingPrivateKey } from './account-key-secrets';

const LEGACY_SECRET = 'legacy-auth-secret-that-is-at-least-32-characters';
const CURRENT_SECRET = 'current-messaging-secret-at-least-32-characters';

describe('messaging account key secrets', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('decrypts records written before the dedicated messaging secret was added', () => {
    vi.stubEnv('MESSAGING_ENCRYPTION_KEY', '');
    vi.stubEnv('INTEGRATION_ENCRYPTION_KEY', '');
    vi.stubEnv('AUTH_SECRET', LEGACY_SECRET);
    const encrypted = encryptMessagingPrivateKey('private-key');

    vi.stubEnv('MESSAGING_ENCRYPTION_KEY', CURRENT_SECRET);

    expect(decryptMessagingPrivateKey(encrypted)).toBe('private-key');
  });

  it('fails closed when no configured secret can authenticate the ciphertext', () => {
    vi.stubEnv('MESSAGING_ENCRYPTION_KEY', CURRENT_SECRET);
    vi.stubEnv('INTEGRATION_ENCRYPTION_KEY', '');
    vi.stubEnv('AUTH_SECRET', '');
    const encrypted = encryptMessagingPrivateKey('private-key');
    vi.stubEnv('MESSAGING_ENCRYPTION_KEY', LEGACY_SECRET);

    expect(() => decryptMessagingPrivateKey(encrypted)).toThrow(/Unable to decrypt/);
  });
});
