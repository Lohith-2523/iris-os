import 'server-only';

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

function accountKeyEncryptionKey() {
  const secret = process.env.MESSAGING_ENCRYPTION_KEY
    || process.env.INTEGRATION_ENCRYPTION_KEY
    || process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('MESSAGING_ENCRYPTION_KEY, INTEGRATION_ENCRYPTION_KEY, or AUTH_SECRET must contain at least 32 characters.');
  }
  return createHash('sha256').update(secret).digest();
}

export function encryptMessagingPrivateKey(privateKeyArmored: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', accountKeyEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(privateKeyArmored, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((part) => part.toString('base64url')).join('.');
}

export function decryptMessagingPrivateKey(payload: string) {
  const [ivEncoded, tagEncoded, ciphertextEncoded] = payload.split('.');
  if (!ivEncoded || !tagEncoded || !ciphertextEncoded) throw new Error('Invalid encrypted messaging key payload.');
  const decipher = createDecipheriv('aes-256-gcm', accountKeyEncryptionKey(), Buffer.from(ivEncoded, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagEncoded, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextEncoded, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
