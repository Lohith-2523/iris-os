// @vitest-environment node

import { describe, expect, it } from 'vitest';
import * as openpgp from 'openpgp';
import {
  decryptVerifiedOpenPgpTextWithKeys,
  encryptSignedOpenPgpTextWithKeys,
  generateOpenPgpDeviceKeyPair,
} from '@/lib/messaging/openpgp-operations';

describe('account messaging keyring', () => {
  it('decrypts ciphertext addressed to a historical key after another account key becomes primary', async () => {
    const [senderPair, historicalPair] = await Promise.all([
      generateOpenPgpDeviceKeyPair(),
      generateOpenPgpDeviceKeyPair(),
    ]);
    const [senderPrivateKey, senderPublicKey, historicalPrivateKey, historicalPublicKey] = await Promise.all([
      openpgp.readPrivateKey({ armoredKey: senderPair.privateKeyArmored }),
      openpgp.readKey({ armoredKey: senderPair.publicKeyArmored }),
      openpgp.readPrivateKey({ armoredKey: historicalPair.privateKeyArmored }),
      openpgp.readKey({ armoredKey: historicalPair.publicKeyArmored }),
    ]);
    const encrypted = await encryptSignedOpenPgpTextWithKeys({
      plaintext: 'available in every browser',
      recipientPublicKeys: [historicalPublicKey],
      senderPrivateKey,
    });

    await expect(decryptVerifiedOpenPgpTextWithKeys({
      message: await openpgp.readMessage({ armoredMessage: encrypted }),
      recipientPrivateKey: [senderPrivateKey, historicalPrivateKey],
      senderPublicKey,
    })).resolves.toBe('available in every browser');
  }, 20_000);
});
