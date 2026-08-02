// @vitest-environment node

import { describe, expect, it } from 'vitest';
import {
  decryptVerifiedOpenPgpText,
  encryptSignedOpenPgpText,
  generateOpenPgpDeviceKeyPair,
} from './openpgp-operations';

describe('OpenPGP secure messaging operations', () => {
  it('encrypts to sender and recipient devices and verifies the sender signature', async () => {
    const [sender, recipient] = await Promise.all([
      generateOpenPgpDeviceKeyPair(),
      generateOpenPgpDeviceKeyPair(),
    ]);
    const encryptedEnvelope = await encryptSignedOpenPgpText({
      plaintext: 'A signed client update',
      recipientPublicKeysArmored: [sender.publicKeyArmored, recipient.publicKeyArmored],
      senderPrivateKeyArmored: sender.privateKeyArmored,
    });
    await expect(decryptVerifiedOpenPgpText({
      encryptedEnvelope,
      recipientPrivateKeyArmored: recipient.privateKeyArmored,
      senderPublicKeyArmored: sender.publicKeyArmored,
    })).resolves.toBe('A signed client update');
    await expect(decryptVerifiedOpenPgpText({
      encryptedEnvelope,
      recipientPrivateKeyArmored: sender.privateKeyArmored,
      senderPublicKeyArmored: sender.publicKeyArmored,
    })).resolves.toBe('A signed client update');
  }, 30_000);

  it('rejects decryption by a device that was not an intended recipient', async () => {
    const [sender, recipient, outsider] = await Promise.all([
      generateOpenPgpDeviceKeyPair(),
      generateOpenPgpDeviceKeyPair(),
      generateOpenPgpDeviceKeyPair(),
    ]);
    const encryptedEnvelope = await encryptSignedOpenPgpText({
      plaintext: 'Owners and clients only',
      recipientPublicKeysArmored: [sender.publicKeyArmored, recipient.publicKeyArmored],
      senderPrivateKeyArmored: sender.privateKeyArmored,
    });
    await expect(decryptVerifiedOpenPgpText({
      encryptedEnvelope,
      recipientPrivateKeyArmored: outsider.privateKeyArmored,
      senderPublicKeyArmored: sender.publicKeyArmored,
    })).rejects.toThrow();
  }, 30_000);

  it('rejects a valid ciphertext when verified against the wrong sender', async () => {
    const [sender, recipient, impostor] = await Promise.all([
      generateOpenPgpDeviceKeyPair(),
      generateOpenPgpDeviceKeyPair(),
      generateOpenPgpDeviceKeyPair(),
    ]);
    const encryptedEnvelope = await encryptSignedOpenPgpText({
      plaintext: 'Authenticated sender',
      recipientPublicKeysArmored: [recipient.publicKeyArmored],
      senderPrivateKeyArmored: sender.privateKeyArmored,
    });
    await expect(decryptVerifiedOpenPgpText({
      encryptedEnvelope,
      recipientPrivateKeyArmored: recipient.privateKeyArmored,
      senderPublicKeyArmored: impostor.publicKeyArmored,
    })).rejects.toThrow();
  }, 30_000);
});
