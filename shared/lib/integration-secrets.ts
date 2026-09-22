import 'server-only';

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

function encryptionKey() {
  const secret = process.env.INTEGRATION_ENCRYPTION_KEY || process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('INTEGRATION_ENCRYPTION_KEY or AUTH_SECRET must contain at least 32 characters.');
  }
  return createHash('sha256').update(secret).digest();
}

export function encryptIntegrationCredentials(value: Record<string, unknown>) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((part) => part.toString('base64url')).join('.');
}

export function decryptIntegrationCredentials<T extends Record<string, unknown>>(payload: string): T {
  const [ivEncoded, tagEncoded, ciphertextEncoded] = payload.split('.');
  if (!ivEncoded || !tagEncoded || !ciphertextEncoded) throw new Error('Invalid encrypted credential payload.');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivEncoded, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagEncoded, 'base64url'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextEncoded, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
  return JSON.parse(plaintext) as T;
}
