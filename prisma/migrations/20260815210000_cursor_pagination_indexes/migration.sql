-- Query-aligned compound indexes for bounded cursor reads. The final id column
-- provides a deterministic tie-breaker when timestamps are equal.
DROP INDEX IF EXISTS "GeneratedDocument_orgId_kind_createdAt_idx";
CREATE INDEX "GeneratedDocument_orgId_kind_createdAt_id_idx" ON "GeneratedDocument"("orgId", "kind", "createdAt", "id");

DROP INDEX IF EXISTS "Project_orgId_idx";
DROP INDEX IF EXISTS "Project_clientId_idx";
CREATE INDEX "Project_orgId_createdAt_id_idx" ON "Project"("orgId", "createdAt", "id");
CREATE INDEX "Project_clientId_createdAt_id_idx" ON "Project"("clientId", "createdAt", "id");

DROP INDEX IF EXISTS "Invoice_orgId_idx";
DROP INDEX IF EXISTS "Invoice_clientId_idx";
DROP INDEX IF EXISTS "Invoice_projectId_idx";
CREATE INDEX "Invoice_orgId_issuedDate_id_idx" ON "Invoice"("orgId", "issuedDate", "id");
CREATE INDEX "Invoice_clientId_issuedDate_id_idx" ON "Invoice"("clientId", "issuedDate", "id");
CREATE INDEX "Invoice_projectId_issuedDate_id_idx" ON "Invoice"("projectId", "issuedDate", "id");

DROP INDEX IF EXISTS "Strategy_orgId_type_createdAt_idx";
CREATE INDEX "Strategy_orgId_type_createdAt_id_idx" ON "Strategy"("orgId", "type", "createdAt", "id");
DROP INDEX IF EXISTS "Report_orgId_createdAt_idx";
CREATE INDEX "Report_orgId_createdAt_id_idx" ON "Report"("orgId", "createdAt", "id");

DROP INDEX IF EXISTS "PrismChatSession_orgId_updatedAt_idx";
CREATE INDEX "PrismChatSession_userId_orgId_updatedAt_id_idx" ON "PrismChatSession"("userId", "orgId", "updatedAt", "id");

CREATE INDEX "MetaCampaign_orgId_createdAt_id_idx" ON "MetaCampaign"("orgId", "createdAt", "id");
CREATE INDEX "MetaAd_orgId_createdAt_id_idx" ON "MetaAd"("orgId", "createdAt", "id");
CREATE INDEX "MetaAd_orgId_adAccountId_spend_id_idx" ON "MetaAd"("orgId", "adAccountId", "spend", "id");

DROP INDEX IF EXISTS "MetaLead_orgId_adAccountId_idx";
DROP INDEX IF EXISTS "MetaLead_clientId_createdTime_idx";
CREATE INDEX "MetaLead_orgId_createdTime_id_idx" ON "MetaLead"("orgId", "createdTime", "id");
CREATE INDEX "MetaLead_orgId_adAccountId_createdTime_id_idx" ON "MetaLead"("orgId", "adAccountId", "createdTime", "id");
CREATE INDEX "MetaLead_clientId_adAccountId_createdTime_id_idx" ON "MetaLead"("clientId", "adAccountId", "createdTime", "id");

DROP INDEX IF EXISTS "AgencyLead_orgId_idx";
DROP INDEX IF EXISTS "AgencyLead_orgId_sourceProvider_createdTime_idx";
DROP INDEX IF EXISTS "AgencyLead_orgId_adAccountId_createdTime_idx";
CREATE INDEX "AgencyLead_orgId_createdTime_id_idx" ON "AgencyLead"("orgId", "createdTime", "id");
CREATE INDEX "AgencyLead_orgId_email_idx" ON "AgencyLead"("orgId", "email");
CREATE INDEX "AgencyLead_orgId_sourceProvider_createdTime_id_idx" ON "AgencyLead"("orgId", "sourceProvider", "createdTime", "id");
CREATE INDEX "AgencyLead_orgId_adAccountId_createdTime_id_idx" ON "AgencyLead"("orgId", "adAccountId", "createdTime", "id");

DROP INDEX IF EXISTS "Transaction_orgId_date_idx";
CREATE INDEX "Transaction_orgId_date_id_idx" ON "Transaction"("orgId", "date", "id");

DROP INDEX IF EXISTS "ClientTask_clientId_idx";
DROP INDEX IF EXISTS "ClientTask_assignedToId_idx";
DROP INDEX IF EXISTS "ClientTask_projectId_idx";
CREATE INDEX "ClientTask_clientId_createdAt_id_idx" ON "ClientTask"("clientId", "createdAt", "id");
CREATE INDEX "ClientTask_assignedToId_createdAt_id_idx" ON "ClientTask"("assignedToId", "createdAt", "id");
CREATE INDEX "ClientTask_projectId_createdAt_id_idx" ON "ClientTask"("projectId", "createdAt", "id");

DROP INDEX IF EXISTS "Deliverable_orgId_status_createdAt_idx";
CREATE INDEX "Deliverable_orgId_status_createdAt_id_idx" ON "Deliverable"("orgId", "status", "createdAt", "id");
CREATE INDEX "Deliverable_orgId_createdAt_id_idx" ON "Deliverable"("orgId", "createdAt", "id");
DROP INDEX IF EXISTS "ChangeRequest_orgId_status_createdAt_idx";
CREATE INDEX "ChangeRequest_orgId_status_createdAt_id_idx" ON "ChangeRequest"("orgId", "status", "createdAt", "id");
CREATE INDEX "ChangeRequest_orgId_createdAt_id_idx" ON "ChangeRequest"("orgId", "createdAt", "id");

DROP INDEX IF EXISTS "Notification_orgId_userId_readAt_createdAt_idx";
CREATE INDEX "Notification_orgId_userId_createdAt_id_idx" ON "Notification"("orgId", "userId", "createdAt", "id");
CREATE INDEX "Notification_unread_user_created_idx" ON "Notification"("orgId", "userId", "createdAt", "id") WHERE "readAt" IS NULL;

DROP INDEX IF EXISTS "CalendarEvent_orgId_idx";
DROP INDEX IF EXISTS "CalendarEvent_creatorId_idx";
CREATE INDEX "CalendarEvent_orgId_startTime_id_idx" ON "CalendarEvent"("orgId", "startTime", "id");
CREATE INDEX "CalendarEvent_creatorId_startTime_id_idx" ON "CalendarEvent"("creatorId", "startTime", "id");

DROP INDEX IF EXISTS "RecurringSubscription_orgId_idx";
CREATE INDEX "RecurringSubscription_orgId_createdAt_id_idx" ON "RecurringSubscription"("orgId", "createdAt", "id");

DROP INDEX IF EXISTS "EncryptedMessage_conversationId_createdAt_idx";
CREATE INDEX "EncryptedMessage_conversationId_createdAt_id_idx" ON "EncryptedMessage"("conversationId", "createdAt", "id");

-- Partial indexes avoid indexing local/manual Meta rows that portal reads exclude.
CREATE INDEX "MetaCampaign_synced_org_created_idx" ON "MetaCampaign"("orgId", "createdAt", "id") WHERE "providerSyncedAt" IS NOT NULL;
CREATE INDEX "MetaAd_synced_orphan_org_created_idx" ON "MetaAd"("orgId", "createdAt", "id") WHERE "providerSyncedAt" IS NOT NULL AND "campaignId" IS NULL;
