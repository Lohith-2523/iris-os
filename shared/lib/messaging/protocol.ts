'use client';

import * as openpgp from 'openpgp';
import {
  decryptVerifiedOpenPgpBinaryWithKeys,
  decryptVerifiedOpenPgpTextWithKeys,
  encryptSignedOpenPgpBinaryWithKeys,
  encryptSignedOpenPgpTextWithKeys,
  generateOpenPgpDeviceKeyPair,
} from '@/lib/messaging/openpgp-operations';

export type EncryptedOutgoingMessage = {
  encryptedEnvelope: string;
  senderDeviceId: string;
  protocolVersion: number;
};

export type IrisMessagingProtocol = {
  name: 'OPENPGP_SIGNED_E2EE';
  prepare(options?: { userId?: string; force?: boolean }): Promise<void>;
  encrypt(input: { conversationId: string; recipientUserId: string; plaintext: string }): Promise<EncryptedOutgoingMessage>;
  decrypt(input: { conversationId: string; senderUserId: string; senderDeviceId: string; encryptedEnvelope: string; protocolVersion: number }): Promise<string>;
  encryptAttachment(input: { recipientUserId: string; plaintext: Uint8Array }): Promise<EncryptedOutgoingMessage & { ciphertext: string }>;
  decryptAttachment(input: { senderUserId: string; senderDeviceId: string; ciphertext: string }): Promise<Uint8Array>;
};

type StoredDeviceIdentity = {
  id: string;
  ownerUserId: string;
  wrappingKey: CryptoKey;
  privateKeyCiphertext: ArrayBuffer;
  privateKeyIv: Uint8Array<ArrayBuffer>;
  publicKeyArmored: string;
  fingerprint: string;
  serverDeviceId?: string;
};

type PublicDevice = { id: string; identityPublicKey: string; publicKeyFingerprint: string; revokedAt?: string | null };
type AccountKeyPayload = {
  id: string;
  deviceId: string;
  identityPublicKey: string;
  identityPrivateKey: string;
  publicKeyFingerprint: string;
  isPrimary: boolean;
};
type PreparedAccountKey = AccountKeyPayload & { privateKey: openpgp.PrivateKey };
type PreparedAccountIdentity = { ownerUserId: string; keys: PreparedAccountKey[]; primary: PreparedAccountKey };

const DATABASE_NAME = 'iris-secure-messaging';
const DATABASE_VERSION = 1;
const DEVICE_STORE = 'device-identities';
const PREPARATION_TTL_MS = 60_000;
const DEVICE_DIRECTORY_TTL_MS = 30_000;
let preparedIdentity: PreparedAccountIdentity | null = null;
let preparation: Promise<void> | null = null;
let preparedAt = 0;
const deviceDirectoryCache = new Map<string, { expiresAt: number; request: Promise<PublicDevice[]> }>();
const publicKeyCache = new Map<string, Promise<openpgp.PublicKey>>();

function identityStorageId(userId: string) {
  return `primary:${userId}`;
}

function openIdentityDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(DEVICE_STORE)) database.createObjectStore(DEVICE_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Unable to open the legacy secure device store.'));
  });
}

async function readStoredIdentity(id: string) {
  const database = await openIdentityDatabase();
  try {
    return await new Promise<StoredDeviceIdentity | null>((resolve, reject) => {
      const request = database.transaction(DEVICE_STORE, 'readonly').objectStore(DEVICE_STORE).get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('Unable to read the legacy secure device identity.'));
    });
  } finally {
    database.close();
  }
}

async function claimLegacyIdentity(userId: string) {
  const database = await openIdentityDatabase();
  try {
    return await new Promise<StoredDeviceIdentity | null>((resolve, reject) => {
      const transaction = database.transaction(DEVICE_STORE, 'readwrite');
      const store = transaction.objectStore(DEVICE_STORE);
      const request = store.get('primary');
      request.onerror = () => reject(request.error || new Error('Unable to migrate the secure device identity.'));
      request.onsuccess = () => {
        const legacy = request.result as Omit<StoredDeviceIdentity, 'ownerUserId'> | undefined;
        if (!legacy) return resolve(null);
        const identity = { ...legacy, id: identityStorageId(userId), ownerUserId: userId } as StoredDeviceIdentity;
        store.put(identity);
        store.delete('primary');
        transaction.oncomplete = () => resolve(identity);
        transaction.onerror = () => reject(transaction.error || new Error('Unable to migrate the secure device identity.'));
      };
    });
  } finally {
    database.close();
  }
}

async function writeStoredIdentity(identity: StoredDeviceIdentity) {
  const database = await openIdentityDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const request = database.transaction(DEVICE_STORE, 'readwrite').objectStore(DEVICE_STORE).put(identity);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error('Unable to update the legacy secure device identity.'));
    });
  } finally {
    database.close();
  }
}

async function privateKeyArmoredFor(identity: StoredDeviceIdentity) {
  const armored = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: identity.privateKeyIv },
    identity.wrappingKey,
    identity.privateKeyCiphertext,
  );
  return new TextDecoder().decode(armored);
}

async function responsePayload(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      throw new Error('The messaging service returned an invalid JSON response.');
    }
  }
  await response.text().catch(() => '');
  if (response.status === 401) throw new Error('Your session expired. Sign in again to open secure messages.');
  throw new Error(response.ok ? 'The messaging service returned an invalid response.' : 'Unable to reach the messaging service.');
}

async function publicKeyFor(device: PublicDevice) {
  const cacheKey = `${device.id}:${device.publicKeyFingerprint}`;
  let key = publicKeyCache.get(cacheKey);
  if (!key) {
    key = openpgp.readKey({ armoredKey: device.identityPublicKey });
    publicKeyCache.set(cacheKey, key);
  }
  return key;
}

async function fetchDevices(userId: string, force = false) {
  const cached = deviceDirectoryCache.get(userId);
  if (!force && cached && cached.expiresAt > Date.now()) return cached.request;
  const request = fetch(`/api/messaging/devices?userId=${encodeURIComponent(userId)}`, { cache: 'no-store' })
    .then(async (response) => {
      const payload = await responsePayload(response);
      if (!response.ok) throw new Error(payload.error || 'Unable to retrieve secure messaging keys.');
      return (payload.devices || []) as PublicDevice[];
    })
    .catch((error) => {
      deviceDirectoryCache.delete(userId);
      throw error;
    });
  deviceDirectoryCache.set(userId, { expiresAt: Date.now() + DEVICE_DIRECTORY_TTL_MS, request });
  return request;
}

async function fetchAccountKeys() {
  const response = await fetch('/api/messaging/identity', { cache: 'no-store' });
  const payload = await responsePayload(response);
  if (!response.ok) throw new Error(payload.error || 'Unable to retrieve the account messaging identity.');
  return (payload.keys || []) as AccountKeyPayload[];
}

async function importAccountKey(input: { identityPublicKey: string; identityPrivateKey: string; publicKeyFingerprint: string }) {
  const response = await fetch('/api/messaging/identity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await responsePayload(response);
  if (!response.ok) throw new Error(payload.error || 'Unable to sync the account messaging identity.');
  return payload.key as AccountKeyPayload;
}

async function resolveActiveUserId(requestedUserId?: string) {
  if (requestedUserId) return requestedUserId;
  if (preparedIdentity && preparedAt + PREPARATION_TTL_MS > Date.now()) return preparedIdentity.ownerUserId;
  const workspaceResponse = await fetch('/api/workspace', { cache: 'no-store' });
  const workspace = await responsePayload(workspaceResponse);
  if (!workspaceResponse.ok) throw new Error(workspace.error || 'Unable to resolve the active messaging identity.');
  const userId = String(workspace?.user?.id || '');
  if (!userId) throw new Error('Unable to resolve the active messaging identity.');
  return userId;
}

async function ensurePrepared(options: { userId?: string; force?: boolean } = {}) {
  const userId = await resolveActiveUserId(options.userId);
  if (!options.force && preparedIdentity?.ownerUserId === userId && preparedAt + PREPARATION_TTL_MS > Date.now()) return;

  let accountKeys = await fetchAccountKeys();
  let localIdentity: StoredDeviceIdentity | null = null;
  if (globalThis.indexedDB && globalThis.crypto?.subtle) {
    try {
      localIdentity = await readStoredIdentity(identityStorageId(userId));
      if (!localIdentity) localIdentity = await claimLegacyIdentity(userId);
    } catch {
      // Account keys do not depend on browser storage. A damaged or blocked
      // legacy store must not prevent this authenticated session from working.
      localIdentity = null;
    }
  }

  if (localIdentity && !accountKeys.some((key) => key.publicKeyFingerprint.toUpperCase() === localIdentity.fingerprint.toUpperCase())) {
    const imported = await importAccountKey({
      identityPublicKey: localIdentity.publicKeyArmored,
      identityPrivateKey: await privateKeyArmoredFor(localIdentity),
      publicKeyFingerprint: localIdentity.fingerprint,
    });
    localIdentity.serverDeviceId = imported.deviceId;
    await writeStoredIdentity(localIdentity);
    accountKeys = await fetchAccountKeys();
  }

  if (!accountKeys.length) {
    const generated = await generateOpenPgpDeviceKeyPair();
    await importAccountKey({
      identityPublicKey: generated.publicKeyArmored,
      identityPrivateKey: generated.privateKeyArmored,
      publicKeyFingerprint: generated.fingerprint,
    });
    accountKeys = await fetchAccountKeys();
  }

  const keys = await Promise.all(accountKeys.map(async (key) => ({
    ...key,
    privateKey: await openpgp.readPrivateKey({ armoredKey: key.identityPrivateKey }),
  })));
  const primary = keys.find((key) => key.isPrimary);
  if (!primary) throw new Error('The account messaging identity has no primary key.');

  preparedIdentity = { ownerUserId: userId, keys, primary };
  deviceDirectoryCache.delete(userId);
  preparedAt = Date.now();
}

async function encryptionPublicKeys(recipientUserId: string, ownUserId: string) {
  const [initialRecipientDevices, ownDevices] = await Promise.all([fetchDevices(recipientUserId), fetchDevices(ownUserId)]);
  let recipientDevices = initialRecipientDevices;
  if (!recipientDevices.some((device) => !device.revokedAt)) recipientDevices = await fetchDevices(recipientUserId, true);
  if (!recipientDevices.some((device) => !device.revokedAt)) {
    throw new Error('The recipient must sign in once to register their secure messaging identity.');
  }
  const uniqueKeys = new Map<string, openpgp.PublicKey>();
  for (const device of [...recipientDevices, ...ownDevices]) {
    if (device.revokedAt) continue;
    uniqueKeys.set(device.publicKeyFingerprint, (await publicKeyFor(device)).toPublic());
  }
  return [...uniqueKeys.values()];
}

const protocol: IrisMessagingProtocol = {
  name: 'OPENPGP_SIGNED_E2EE',
  async prepare(options) {
    preparation ||= ensurePrepared(options).finally(() => {
      preparation = null;
    });
    await preparation;
  },
  async encrypt({ recipientUserId, plaintext }) {
    await this.prepare();
    const identity = preparedIdentity!;
    const encryptedEnvelope = await encryptSignedOpenPgpTextWithKeys({
      plaintext,
      recipientPublicKeys: await encryptionPublicKeys(recipientUserId, identity.ownerUserId),
      senderPrivateKey: identity.primary.privateKey,
    });
    return { encryptedEnvelope, senderDeviceId: identity.primary.deviceId, protocolVersion: 1 };
  },
  async decrypt({ senderUserId, senderDeviceId, encryptedEnvelope }) {
    await this.prepare();
    const senderDevice = (await fetchDevices(senderUserId)).find((device) => device.id === senderDeviceId);
    if (!senderDevice) throw new Error('The sender’s signing key is unavailable.');
    const decryptWithPreparedKeyring = async () => decryptVerifiedOpenPgpTextWithKeys({
      message: await openpgp.readMessage({ armoredMessage: encryptedEnvelope }),
      recipientPrivateKey: preparedIdentity!.keys.map((key) => key.privateKey),
      senderPublicKey: await publicKeyFor(senderDevice),
    });
    try {
      return await decryptWithPreparedKeyring();
    } catch {
      await this.prepare({ userId: preparedIdentity!.ownerUserId, force: true });
      return decryptWithPreparedKeyring();
    }
  },
  async encryptAttachment({ recipientUserId, plaintext }) {
    await this.prepare();
    const identity = preparedIdentity!;
    const ciphertext = await encryptSignedOpenPgpBinaryWithKeys({
      plaintext,
      recipientPublicKeys: await encryptionPublicKeys(recipientUserId, identity.ownerUserId),
      senderPrivateKey: identity.primary.privateKey,
    });
    return { ciphertext, senderDeviceId: identity.primary.deviceId, protocolVersion: 1, encryptedEnvelope: '' };
  },
  async decryptAttachment({ senderUserId, senderDeviceId, ciphertext }) {
    await this.prepare();
    const senderDevice = (await fetchDevices(senderUserId)).find((device) => device.id === senderDeviceId);
    if (!senderDevice) throw new Error('The sender’s signing key is unavailable.');
    const decryptWithPreparedKeyring = async () => decryptVerifiedOpenPgpBinaryWithKeys({
      message: await openpgp.readMessage({ armoredMessage: ciphertext }),
      recipientPrivateKey: preparedIdentity!.keys.map((key) => key.privateKey),
      senderPublicKey: await publicKeyFor(senderDevice),
    });
    try {
      return await decryptWithPreparedKeyring();
    } catch {
      await this.prepare({ userId: preparedIdentity!.ownerUserId, force: true });
      return decryptWithPreparedKeyring();
    }
  },
};

export function getMessagingProtocol() {
  return protocol;
}
