import * as openpgp from 'openpgp';

export async function generateOpenPgpDeviceKeyPair() {
  const keyPair = await openpgp.generateKey({
    type: 'curve25519',
    userIDs: [{ name: 'Iris OS secure messaging device' }],
    format: 'armored',
  });
  const publicKey = await openpgp.readKey({ armoredKey: keyPair.publicKey });
  return {
    privateKeyArmored: keyPair.privateKey,
    publicKeyArmored: keyPair.publicKey,
    fingerprint: publicKey.getFingerprint().toUpperCase(),
  };
}

export async function encryptSignedOpenPgpText(input: {
  plaintext: string;
  recipientPublicKeysArmored: string[];
  senderPrivateKeyArmored: string;
}) {
  const [signingKey, ...encryptionKeys] = await Promise.all([
    openpgp.readPrivateKey({ armoredKey: input.senderPrivateKeyArmored }),
    ...input.recipientPublicKeysArmored.map((armoredKey) => openpgp.readKey({ armoredKey })),
  ]);
  return encryptSignedOpenPgpTextWithKeys({
    plaintext: input.plaintext,
    recipientPublicKeys: encryptionKeys,
    senderPrivateKey: signingKey,
  });
}

export async function encryptSignedOpenPgpTextWithKeys(input: {
  plaintext: string;
  recipientPublicKeys: openpgp.PublicKey[];
  senderPrivateKey: openpgp.PrivateKey;
}) {
  return openpgp.encrypt({
    message: await openpgp.createMessage({ text: input.plaintext }),
    encryptionKeys: input.recipientPublicKeys.map((key) => key.toPublic()),
    signingKeys: input.senderPrivateKey,
    format: 'armored',
  });
}

export async function decryptVerifiedOpenPgpText(input: {
  encryptedEnvelope: string;
  recipientPrivateKeyArmored: string;
  senderPublicKeyArmored: string;
}) {
  const [decryptionKey, verificationKey, message] = await Promise.all([
    openpgp.readPrivateKey({ armoredKey: input.recipientPrivateKeyArmored }),
    openpgp.readKey({ armoredKey: input.senderPublicKeyArmored }),
    openpgp.readMessage({ armoredMessage: input.encryptedEnvelope }),
  ]);
  return decryptVerifiedOpenPgpTextWithKeys({
    message,
    recipientPrivateKey: decryptionKey,
    senderPublicKey: verificationKey,
  });
}

export async function decryptVerifiedOpenPgpTextWithKeys(input: {
  message: openpgp.Message<openpgp.MaybeStream<Uint8Array>>;
  recipientPrivateKey: openpgp.PrivateKey;
  senderPublicKey: openpgp.PublicKey;
}) {
  const result = await openpgp.decrypt({
    message: input.message,
    decryptionKeys: input.recipientPrivateKey,
    verificationKeys: input.senderPublicKey.toPublic(),
    expectSigned: true,
    format: 'utf8',
  });
  await Promise.all(result.signatures.map((signature) => signature.verified));
  if (typeof result.data !== 'string') throw new Error('Unsupported encrypted message payload.');
  return result.data;
}

export async function encryptSignedOpenPgpBinary(input: {
  plaintext: Uint8Array;
  recipientPublicKeysArmored: string[];
  senderPrivateKeyArmored: string;
}) {
  const [signingKey, ...encryptionKeys] = await Promise.all([
    openpgp.readPrivateKey({ armoredKey: input.senderPrivateKeyArmored }),
    ...input.recipientPublicKeysArmored.map((armoredKey) => openpgp.readKey({ armoredKey })),
  ]);
  return encryptSignedOpenPgpBinaryWithKeys({
    plaintext: input.plaintext,
    recipientPublicKeys: encryptionKeys,
    senderPrivateKey: signingKey,
  });
}

export async function encryptSignedOpenPgpBinaryWithKeys(input: {
  plaintext: Uint8Array;
  recipientPublicKeys: openpgp.PublicKey[];
  senderPrivateKey: openpgp.PrivateKey;
}) {
  return openpgp.encrypt({
    message: await openpgp.createMessage({ binary: input.plaintext }),
    encryptionKeys: input.recipientPublicKeys.map((key) => key.toPublic()),
    signingKeys: input.senderPrivateKey,
    format: 'armored',
  });
}

export async function decryptVerifiedOpenPgpBinary(input: {
  encryptedEnvelope: string;
  recipientPrivateKeyArmored: string;
  senderPublicKeyArmored: string;
}) {
  const [decryptionKey, verificationKey, message] = await Promise.all([
    openpgp.readPrivateKey({ armoredKey: input.recipientPrivateKeyArmored }),
    openpgp.readKey({ armoredKey: input.senderPublicKeyArmored }),
    openpgp.readMessage({ armoredMessage: input.encryptedEnvelope }),
  ]);
  return decryptVerifiedOpenPgpBinaryWithKeys({ message, recipientPrivateKey: decryptionKey, senderPublicKey: verificationKey });
}

export async function decryptVerifiedOpenPgpBinaryWithKeys(input: {
  message: openpgp.Message<openpgp.MaybeStream<Uint8Array>>;
  recipientPrivateKey: openpgp.PrivateKey;
  senderPublicKey: openpgp.PublicKey;
}) {
  const result = await openpgp.decrypt({ message: input.message, decryptionKeys: input.recipientPrivateKey, verificationKeys: input.senderPublicKey.toPublic(), expectSigned: true, format: 'binary' });
  await Promise.all(result.signatures.map((signature) => signature.verified));
  return result.data instanceof Uint8Array ? result.data : new Uint8Array(result.data);
}
