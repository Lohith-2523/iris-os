CREATE TABLE "MessagingDevice" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceLabel" TEXT NOT NULL,
    "identityPublicKey" TEXT NOT NULL,
    "publicKeyFingerprint" TEXT NOT NULL,
    "protocolVersion" INTEGER NOT NULL DEFAULT 1,
    "revokedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MessagingDevice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MessagingConversation" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "participantKey" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MessagingConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MessagingConversationMember" (
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadAt" TIMESTAMP(3),
    CONSTRAINT "MessagingConversationMember_pkey" PRIMARY KEY ("conversationId","userId")
);

CREATE TABLE "EncryptedMessage" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "senderDeviceId" TEXT NOT NULL,
    "clientMessageId" TEXT NOT NULL,
    "encryptedEnvelope" TEXT NOT NULL,
    "protocolVersion" INTEGER NOT NULL DEFAULT 1,
    "clientCreatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EncryptedMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EncryptedAttachment" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "storageObjectId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "ciphertextSha256" TEXT NOT NULL,
    "encryptedMetadata" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EncryptedAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MessageDeliveryReceipt" (
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    CONSTRAINT "MessageDeliveryReceipt_pkey" PRIMARY KEY ("messageId","userId")
);

CREATE INDEX "MessagingDevice_orgId_userId_idx" ON "MessagingDevice"("orgId", "userId");
CREATE INDEX "MessagingDevice_userId_revokedAt_idx" ON "MessagingDevice"("userId", "revokedAt");
CREATE UNIQUE INDEX "MessagingDevice_userId_publicKeyFingerprint_key" ON "MessagingDevice"("userId", "publicKeyFingerprint");
CREATE UNIQUE INDEX "MessagingConversation_orgId_participantKey_key" ON "MessagingConversation"("orgId", "participantKey");
CREATE INDEX "MessagingConversation_orgId_updatedAt_idx" ON "MessagingConversation"("orgId", "updatedAt");
CREATE INDEX "MessagingConversationMember_userId_conversationId_idx" ON "MessagingConversationMember"("userId", "conversationId");
CREATE UNIQUE INDEX "EncryptedMessage_orgId_clientMessageId_key" ON "EncryptedMessage"("orgId", "clientMessageId");
CREATE INDEX "EncryptedMessage_conversationId_createdAt_idx" ON "EncryptedMessage"("conversationId", "createdAt");
CREATE INDEX "EncryptedMessage_orgId_expiresAt_idx" ON "EncryptedMessage"("orgId", "expiresAt");
CREATE INDEX "EncryptedAttachment_messageId_idx" ON "EncryptedAttachment"("messageId");
CREATE INDEX "EncryptedAttachment_orgId_createdAt_idx" ON "EncryptedAttachment"("orgId", "createdAt");
CREATE INDEX "MessageDeliveryReceipt_userId_readAt_idx" ON "MessageDeliveryReceipt"("userId", "readAt");

ALTER TABLE "MessagingDevice" ADD CONSTRAINT "MessagingDevice_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessagingDevice" ADD CONSTRAINT "MessagingDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessagingConversation" ADD CONSTRAINT "MessagingConversation_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessagingConversation" ADD CONSTRAINT "MessagingConversation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessagingConversationMember" ADD CONSTRAINT "MessagingConversationMember_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "MessagingConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessagingConversationMember" ADD CONSTRAINT "MessagingConversationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EncryptedMessage" ADD CONSTRAINT "EncryptedMessage_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EncryptedMessage" ADD CONSTRAINT "EncryptedMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "MessagingConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EncryptedMessage" ADD CONSTRAINT "EncryptedMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EncryptedMessage" ADD CONSTRAINT "EncryptedMessage_senderDeviceId_fkey" FOREIGN KEY ("senderDeviceId") REFERENCES "MessagingDevice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EncryptedAttachment" ADD CONSTRAINT "EncryptedAttachment_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EncryptedAttachment" ADD CONSTRAINT "EncryptedAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "EncryptedMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageDeliveryReceipt" ADD CONSTRAINT "MessageDeliveryReceipt_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "EncryptedMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageDeliveryReceipt" ADD CONSTRAINT "MessageDeliveryReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
