ALTER TABLE "User"
  ADD COLUMN "accessPermissions" JSONB,
  ADD COLUMN "offboardedAt" TIMESTAMP(3),
  ADD COLUMN "accessRevokedAt" TIMESTAMP(3),
  ADD COLUMN "offboardingFeedback" TEXT;

ALTER TABLE "AgencyLead"
  ADD COLUMN "followUpAt" TIMESTAMP(3),
  ADD COLUMN "lostReason" TEXT,
  ADD COLUMN "lostDetails" TEXT,
  ADD COLUMN "activity" JSONB;

ALTER TABLE "ClientTask"
  ADD COLUMN "approvalStatus" TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN "approvalNote" TEXT,
  ADD COLUMN "approvedAt" TIMESTAMP(3);

CREATE TABLE "Deliverable" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
  "approvalNote" TEXT,
  "approvedAt" TIMESTAMP(3),
  "submittedByName" TEXT,
  "submittedById" TEXT,
  "orgId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "projectId" TEXT,
  "taskId" TEXT,
  "stageId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Deliverable_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChangeRequest" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "details" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "requestedByName" TEXT,
  "requestedById" TEXT,
  "orgId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "projectId" TEXT,
  "taskId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ChangeRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "href" TEXT,
  "actionLabel" TEXT,
  "readAt" TIMESTAMP(3),
  "scheduledAt" TIMESTAMP(3),
  "userId" TEXT,
  "orgId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Deliverable_orgId_status_createdAt_idx" ON "Deliverable"("orgId", "status", "createdAt");
CREATE INDEX "Deliverable_clientId_projectId_idx" ON "Deliverable"("clientId", "projectId");
CREATE INDEX "Deliverable_taskId_idx" ON "Deliverable"("taskId");
CREATE INDEX "ChangeRequest_orgId_status_createdAt_idx" ON "ChangeRequest"("orgId", "status", "createdAt");
CREATE INDEX "ChangeRequest_clientId_projectId_idx" ON "ChangeRequest"("clientId", "projectId");
CREATE INDEX "Notification_orgId_userId_readAt_createdAt_idx" ON "Notification"("orgId", "userId", "readAt", "createdAt");
CREATE INDEX "Notification_orgId_scheduledAt_idx" ON "Notification"("orgId", "scheduledAt");

ALTER TABLE "Deliverable" ADD CONSTRAINT "Deliverable_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Deliverable" ADD CONSTRAINT "Deliverable_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Deliverable" ADD CONSTRAINT "Deliverable_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Deliverable" ADD CONSTRAINT "Deliverable_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ClientTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ClientTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
