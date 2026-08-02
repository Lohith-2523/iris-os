'use client';

import * as openpgp from 'openpgp';
import {
  decryptVerifiedOpenPgpTextWithKeys,
  decryptVerifiedOpenPgpBinaryWithKeys,
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
  encrypt(input: {
    conversationId: string;
    recipientUserId: string;
    plaintext: string;
  }): Promise<EncryptedOutgoingMessage>;
  decrypt(input: {
    conversationId: string;
    senderUserId: string;
    senderDeviceId: string;
    encryptedEnvelope: string;
    protocolVersion: number;
  }): Promise<string>;
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

type PublicDevice = {
  id: string;
  identityPublicKey: string;
  publicKeyFingerprint: string;
  revokedAt?: string | null;
};

const DATABASE_NAME = 'iris-secure-messaging';
const DATABASE_VERSION = 1;
const DEVICE_STORE = 'device-identities';
let preparedIdentity: StoredDeviceIdentity | null = null;
let preparation: Promise<void> | null = null;
let preparedAt = 0;
const PREPARATION_TTL_MS = 60_000;
const DEVICE_DIRECTORY_TTL_MS = 30_000;
const deviceDirectoryCache = new Map<string, { expiresAt: number; request: Promise<PublicDevice[]> }>();
const publicKeyCache = new Map<string, Promise<openpgp.PublicKey>>();
let privateKeyCache: { ownerUserId: string; fingerprint: string; key: openpgp.PrivateKey } | null = null;

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
    request.onerror = () => reject(request.error || new Error('Unable to open the secure device store.'));
  });
}

async function readStoredIdentity(id: string) {
  const database = await openIdentityDatabase();
  try {
    return await new Promise<StoredDeviceIdentity | null>((resolve, reject) => {
      const request = database.transaction(DEVICE_STORE, 'readonly').objectStore(DEVICE_STORE).get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('Unable to read the secure device identity.'));
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
      request.onerror = () => reject(request.error || new Error('Unable to save the secure device identity.'));
    });
  } finally {
    database.close();
  }
}

async function createStoredIdentity(userId: string): Promise<StoredDeviceIdentity> {
  const keyPair = await generateOpenPgpDeviceKeyPair();
  const wrappingKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const privateKeyIv = crypto.getRandomValues(new Uint8Array(12));
  const privateKeyCiphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: privateKeyIv },
    wrappingKey,
    new TextEncoder().encode(keyPair.privateKeyArmored),
  );
  return {
    id: identityStorageId(userId),
    ownerUserId: userId,
    wrappingKey,
    privateKeyCiphertext,
    privateKeyIv,
    publicKeyArmored: keyPair.publicKeyArmored,
    fingerprint: keyPair.fingerprint,
  };
}

async function privateKeyFor(identity: StoredDeviceIdentity) {
  if (privateKeyCache?.ownerUserId === identity.ownerUserId && privateKeyCache.fingerprint === identity.fingerprint) {
    return privateKeyCache.key;
  }
  const armored = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: identity.privateKeyIv },
    identity.wrappingKey,
    identity.privateKeyCiphertext,
  );
  const key = await openpgp.readPrivateKey({ armoredKey: new TextDecoder().decode(armored) });
  privateKeyCache = { ownerUserId: identity.ownerUserId, fingerprint: identity.fingerprint, key };
  return key;
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
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Unable to retrieve secure device keys.');
      return (payload.devices || []) as PublicDevice[];
    })
    .catch((error) => {
      deviceDirectoryCache.delete(userId);
      throw error;
    });
  deviceDirectoryCache.set(userId, { expiresAt: Date.now() + DEVICE_DIRECTORY_TTL_MS, request });
  return request;
}

async function registerIdentity(identity: StoredDeviceIdentity) {
  const response = await fetch('/api/messaging/devices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceLabel: `${navigator.platform || 'Browser'} · OpenPGP`,
      identityPublicKey: identity.publicKeyArmored,
      publicKeyFingerprint: identity.fingerprint,
      protocolVersion: 1,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Unable to register this secure device.');
  identity.serverDeviceId = payload.device.id;
  await writeStoredIdentity(identity);
  deviceDirectoryCache.delete(identity.ownerUserId);
}

async function resolveActiveUserId(requestedUserId?: string) {
  if (requestedUserId) return requestedUserId;
  if (preparedIdentity && preparedAt + PREPARATION_TTL_MS > Date.now()) return preparedIdentity.ownerUserId;
  const workspaceResponse = await fetch('/api/workspace', { cache: 'no-store' });
  if (!workspaceResponse.ok) throw new Error('Unable to resolve the active messaging identity.');
  const workspace = await workspaceResponse.json();
  const userId = String(workspace?.user?.id || '');
  if (!userId) throw new Error('Unable to resolve the active messaging identity.');
  return userId;
}

async function ensurePrepared(options: { userId?: string; force?: boolean } = {}) {
  if (!globalThis.indexedDB || !globalThis.crypto?.subtle) {
    throw new Error('This browser does not provide the secure storage and Web Crypto APIs required for messaging.');
  }
  const userId = await resolveActiveUserId(options.userId);
  if (!options.force && preparedIdentity?.ownerUserId === userId && preparedAt + PREPARATION_TTL_MS > Date.now()) return;

  let identity = preparedIdentity?.ownerUserId === userId
    ? preparedIdentity
    : await readStoredIdentity(identityStorageId(userId));
  if (!identity) identity = await claimLegacyIdentity(userId);
  if (!identity) {
    identity = await createStoredIdentity(userId);
    await writeStoredIdentity(identity);
  }

  const registeredDevices = await fetchDevices(userId, Boolean(options.force));
  const registrationIsCurrent = Boolean(
    identity.serverDeviceId
    && registeredDevices.some((device) => device.id === identity.serverDeviceId
      && !device.revokedAt
      && device.publicKeyFingerprint.toUpperCase() === identity.fingerprint.toUpperCase()),
  );
  if (!registrationIsCurrent) await registerIdentity(identity);
  preparedIdentity = identity;
  preparedAt = Date.now();
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
    const deviceSets = await Promise.all([
      fetchDevices(recipientUserId),
      fetchDevices(identity.ownerUserId),
    ]);
    let recipientDevices = deviceSets[0];
    const ownDevices = deviceSets[1];
    if (!recipientDevices.some((device) => !device.revokedAt)) recipientDevices = await fetchDevices(recipientUserId, true);
    const uniqueKeys = new Map<string, openpgp.PublicKey>();
    for (const device of [...recipientDevices, ...ownDevices]) {
      if (device.revokedAt) continue;
      const publicKey = await publicKeyFor(device);
      uniqueKeys.set(device.publicKeyFingerprint, publicKey.toPublic());
    }
    if (!recipientDevices.some((device) => !device.revokedAt)) {
      throw new Error('The recipient must sign in once to register their secure messaging identity.');
    }
    const signingKey = await privateKeyFor(identity);
    const encryptedEnvelope = await encryptSignedOpenPgpTextWithKeys({
      plaintext,
      recipientPublicKeys: [...uniqueKeys.values()],
      senderPrivateKey: signingKey,
    });
    return { encryptedEnvelope, senderDeviceId: identity.serverDeviceId!, protocolVersion: 1 };
  },
  async decrypt({ senderUserId, senderDeviceId, encryptedEnvelope }) {
    await this.prepare();
    const identity = preparedIdentity!;
    const senderDevices = await fetchDevices(senderUserId);
    const senderDevice = senderDevices.find((device) => device.id === senderDeviceId);
    if (!senderDevice) throw new Error('The sender’s signing device is unavailable or revoked.');
    const decryptionKey = await privateKeyFor(identity);
    return decryptVerifiedOpenPgpTextWithKeys({
      message: await openpgp.readMessage({ armoredMessage: encryptedEnvelope }),
      recipientPrivateKey: decryptionKey,
      senderPublicKey: await publicKeyFor(senderDevice),
    });
  },
  async encryptAttachment({ recipientUserId, plaintext }) {
    await this.prepare();
    const identity = preparedIdentity!;
    const deviceSets = await Promise.all([
      fetchDevices(recipientUserId),
      fetchDevices(identity.ownerUserId),
    ]);
    let recipientDevices = deviceSets[0];
    const ownDevices = deviceSets[1];
    if (!recipientDevices.some((device) => !device.revokedAt)) recipientDevices = await fetchDevices(recipientUserId, true);
    const uniqueKeys = new Map<string, openpgp.PublicKey>();
    for (const device of [...recipientDevices, ...ownDevices]) {
      if (!device.revokedAt) uniqueKeys.set(device.publicKeyFingerprint, (await publicKeyFor(device)).toPublic());
    }
    if (!recipientDevices.some((device) => !device.revokedAt)) throw new Error('The recipient must sign in once to register their secure messaging identity.');
    const signingKey = await privateKeyFor(identity);
    const ciphertext = await encryptSignedOpenPgpBinaryWithKeys({
      plaintext,
      recipientPublicKeys: [...uniqueKeys.values()],
      senderPrivateKey: signingKey,
    });
    return { ciphertext, senderDeviceId: identity.serverDeviceId!, protocolVersion: 1, encryptedEnvelope: '' };
  },
  async decryptAttachment({ senderUserId, senderDeviceId, ciphertext }) {
    await this.prepare();
    const identity = preparedIdentity!;
    const senderDevices = await fetchDevices(senderUserId);
    const senderDevice = senderDevices.find((device) => device.id === senderDeviceId && !device.revokedAt);
    if (!senderDevice) throw new Error('The sender’s signing device is unavailable or revoked.');
    const decryptionKey = await privateKeyFor(identity);
    return decryptVerifiedOpenPgpBinaryWithKeys({
      message: await openpgp.readMessage({ armoredMessage: ciphertext }),
      recipientPrivateKey: decryptionKey,
      senderPublicKey: await publicKeyFor(senderDevice),
    });
  },
};

export function getMessagingProtocol() {
  return protocol;
}
