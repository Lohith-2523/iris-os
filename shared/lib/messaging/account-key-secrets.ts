import 'server-only';

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

function accountKeyEncryptionKeys() {
  const secrets = [
    process.env.MESSAGING_ENCRYPTION_KEY,
    process.env.INTEGRATION_ENCRYPTION_KEY,
    process.env.AUTH_SECRET,
  ].filter((secret): secret is string => Boolean(secret && secret.length >= 32));
  if (!secrets.length) {
    throw new Error('MESSAGING_ENCRYPTION_KEY, INTEGRATION_ENCRYPTION_KEY, or AUTH_SECRET must contain at least 32 characters.');
  }
  return [...new Set(secrets)].map((secret) => createHash('sha256').update(secret).digest());
}

export function encryptMessagingPrivateKey(privateKeyArmored: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', accountKeyEncryptionKeys()[0], iv);
  const ciphertext = Buffer.concat([cipher.update(privateKeyArmored, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((part) => part.toString('base64url')).join('.');
}

export function decryptMessagingPrivateKey(payload: string) {
  const [ivEncoded, tagEncoded, ciphertextEncoded] = payload.split('.');
  if (!ivEncoded || !tagEncoded || !ciphertextEncoded) throw new Error('Invalid encrypted messaging key payload.');
  const iv = Buffer.from(ivEncoded, 'base64url');
  const tag = Buffer.from(tagEncoded, 'base64url');
  const ciphertext = Buffer.from(ciphertextEncoded, 'base64url');
  for (const key of accountKeyEncryptionKeys()) {
    try {
      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    } catch {
      // Try the next configured legacy secret. This supports safe key-source rotation.
    }
  }
  throw new Error('Unable to decrypt the stored messaging key with the configured encryption secrets.');
}
