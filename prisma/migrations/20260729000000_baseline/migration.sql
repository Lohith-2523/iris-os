-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."AgencyLead" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "status" TEXT NOT NULL,
    "collectionMethod" TEXT,
    "approachMethod" TEXT,
    "funnelName" TEXT,
    "createdTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "estimatedClientValue" DOUBLE PRECISION,

    CONSTRAINT "AgencyLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AskPrismMessage" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AskPrismMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Automation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Automation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AutomationRun" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "triggeredBy" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "logs" TEXT,
    "automationId" TEXT NOT NULL,

    CONSTRAINT "AutomationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CalendarEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "meetLink" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrence" TEXT,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "orgId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "attendees" TEXT[],
    "attendeeStatus" JSONB,
    "googleEventId" TEXT,
    "isGoogleEvent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "status" TEXT NOT NULL,
    "healthScore" INTEGER NOT NULL,
    "healthStatus" TEXT NOT NULL,
    "churnRiskScore" INTEGER NOT NULL,
    "roiMetric" DOUBLE PRECISION NOT NULL,
    "renewalDate" TIMESTAMP(3),
    "upsellOpportunityValue" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "agencyType" TEXT,
    "businessModel" TEXT,
    "metadata" JSONB,
    "orgId" TEXT NOT NULL,
    "adAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sourceLeadId" TEXT,
    "billingAddressLine1" TEXT,
    "billingAddressLine2" TEXT,
    "billingCity" TEXT,
    "billingCountry" TEXT,
    "billingPostalCode" TEXT,
    "billingState" TEXT,
    "gstNumber" TEXT,
    "legalEntityName" TEXT,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ClientInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "adAccountId" TEXT,
    "token" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ClientTask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "blocker" TEXT,
    "update" TEXT,
    "timeline" TEXT,
    "deadline" TIMESTAMP(3),
    "outputUrl" TEXT,
    "carryOverComment" TEXT,
    "projectId" TEXT,
    "stageId" TEXT,
    "clientId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "parentTaskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Contact" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DesignAsset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "status" TEXT NOT NULL,
    "canvaProjectId" TEXT,
    "brandId" TEXT NOT NULL,
    "campaignId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesignAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Expense" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "merchant" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FinancialForecast" (
    "id" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "projectedRev" DOUBLE PRECISION NOT NULL,
    "projectedExp" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "narrative" TEXT,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialForecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GoogleCalendarConnection" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "lastSync" TIMESTAMP(3),
    "syncLogs" TEXT,
    "credentialCiphertext" TEXT,
    "externalAccountId" TEXT,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleCalendarConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IntegrationConnection" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "lastSync" TIMESTAMP(3),
    "syncLogs" TEXT,
    "credentialCiphertext" TEXT,
    "externalAccountId" TEXT,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNPAID',
    "orgId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "issuedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "automationKey" TEXT,
    "buyerSnapshot" JSONB,
    "deliveryError" TEXT,
    "deliveryStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "downloadToken" TEXT NOT NULL,
    "emailRecipient" TEXT,
    "lineItems" JSONB,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pdfGeneratedAt" TIMESTAMP(3),
    "projectId" TEXT NOT NULL,
    "sellerSnapshot" JSONB,
    "sentAt" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "templateKey" TEXT NOT NULL DEFAULT 'IRIS_PROFESSIONAL_V1',

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MemberInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "agencyTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "projects" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "token" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MetaAd" (
    "id" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "spend" DOUBLE PRECISION NOT NULL,
    "leadsCount" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "platform" TEXT NOT NULL,
    "imageUrl" TEXT,
    "campaignId" TEXT,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "adAccountId" TEXT,
    "providerSyncedAt" TIMESTAMP(3),

    CONSTRAINT "MetaAd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MetaCampaign" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "objective" TEXT,
    "dailyBudget" DOUBLE PRECISION,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "adAccountId" TEXT,
    "providerSyncedAt" TIMESTAMP(3),

    CONSTRAINT "MetaCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MetaLead" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "adId" TEXT,
    "adName" TEXT,
    "fullName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "status" TEXT NOT NULL,
    "createdTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "collectionMethod" TEXT,
    "approachMethod" TEXT,
    "funnelName" TEXT,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "adAccountId" TEXT,
    "campaignId" TEXT,
    "clientId" TEXT,
    "fieldData" JSONB,
    "formId" TEXT,
    "pageId" TEXT,

    CONSTRAINT "MetaLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MetaPageConnection" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "pageName" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaPageConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Milestone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'BASIC',
    "hasAddon" BOOLEAN NOT NULL DEFAULT false,
    "agencyTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bankNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "billingEmail" TEXT,
    "preferences" JSONB,
    "aiSharingConsent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "billingAddressLine1" TEXT,
    "billingAddressLine2" TEXT,
    "billingCity" TEXT,
    "billingCountry" TEXT,
    "billingPostalCode" TEXT,
    "billingState" TEXT,
    "gstNumber" TEXT,
    "legalEntityName" TEXT,
    "invoiceBrandColor" TEXT NOT NULL DEFAULT '#09090B',
    "invoiceLogoDataUrl" TEXT,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrganizationOnboardingState" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "needsOnboarding" BOOLEAN NOT NULL DEFAULT true,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "checklist" JSONB,
    "draft" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationOnboardingState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PrismChatSession" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workflowState" JSONB,
    "workflowType" TEXT,

    CONSTRAINT "PrismChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PrismInsight" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "score" INTEGER,
    "metric" TEXT,
    "riskLevel" TEXT NOT NULL,
    "actionableStep" TEXT,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrismInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "progress" INTEGER NOT NULL DEFAULT 0,
    "riskLevel" TEXT NOT NULL,
    "riskDescription" TEXT,
    "timeline" TEXT,
    "serviceLine" TEXT,
    "budget" DOUBLE PRECISION,
    "orgId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paymentAmount" DOUBLE PRECISION,
    "paymentFrequency" TEXT,
    "paymentStartDate" TIMESTAMP(3),
    "paymentTerms" TEXT,
    "paymentType" TEXT NOT NULL DEFAULT 'RETAINER',
    "autoGenerateInvoice" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProjectMember" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProjectStage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RecurringRetainer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "frequency" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringRetainer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RecurringSubscription" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "category" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Report" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "filePath" TEXT,
    "summary" TEXT,
    "createdById" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ResourceAllocation" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "hoursAlloc" DOUBLE PRECISION NOT NULL,
    "utilization" DOUBLE PRECISION NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ScheduledPost" (
    "id" TEXT NOT NULL,
    "platform" TEXT[],
    "postType" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "clientFeedback" TEXT,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Strategy" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "timeline" TEXT NOT NULL,
    "targetAudience" TEXT,
    "constraints" TEXT,
    "additionalNotes" TEXT,
    "content" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputSnapshot" JSONB NOT NULL,
    "contextSnapshot" JSONB NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Strategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TaskComment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TaskUpdate" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Transaction" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "details" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Expense',
    "type" TEXT NOT NULL,
    "transactorAccount" TEXT NOT NULL,
    "yourAccount" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "referenceNumber" TEXT,
    "comments" TEXT,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT,
    "invoiceId" TEXT,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "authUserId" TEXT,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT,
    "agencyTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "avatarUrl" TEXT,
    "orgId" TEXT NOT NULL,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgencyLead_orgId_idx" ON "public"."AgencyLead"("orgId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "AgencyLead_orgId_leadId_key" ON "public"."AgencyLead"("orgId" ASC, "leadId" ASC);

-- CreateIndex
CREATE INDEX "AskPrismMessage_orgId_createdAt_idx" ON "public"."AskPrismMessage"("orgId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "AskPrismMessage_sessionId_idx" ON "public"."AskPrismMessage"("sessionId" ASC);

-- CreateIndex
CREATE INDEX "AskPrismMessage_userId_idx" ON "public"."AskPrismMessage"("userId" ASC);

-- CreateIndex
CREATE INDEX "Automation_createdById_idx" ON "public"."Automation"("createdById" ASC);

-- CreateIndex
CREATE INDEX "Automation_orgId_idx" ON "public"."Automation"("orgId" ASC);

-- CreateIndex
CREATE INDEX "AutomationRun_automationId_idx" ON "public"."AutomationRun"("automationId" ASC);

-- CreateIndex
CREATE INDEX "Brand_orgId_idx" ON "public"."Brand"("orgId" ASC);

-- CreateIndex
CREATE INDEX "CalendarEvent_creatorId_idx" ON "public"."CalendarEvent"("creatorId" ASC);

-- CreateIndex
CREATE INDEX "CalendarEvent_orgId_idx" ON "public"."CalendarEvent"("orgId" ASC);

-- CreateIndex
CREATE INDEX "Campaign_brandId_idx" ON "public"."Campaign"("brandId" ASC);

-- CreateIndex
CREATE INDEX "Client_orgId_idx" ON "public"."Client"("orgId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Client_sourceLeadId_key" ON "public"."Client"("sourceLeadId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ClientInvite_email_key" ON "public"."ClientInvite"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ClientInvite_token_key" ON "public"."ClientInvite"("token" ASC);

-- CreateIndex
CREATE INDEX "ClientTask_assignedToId_idx" ON "public"."ClientTask"("assignedToId" ASC);

-- CreateIndex
CREATE INDEX "ClientTask_clientId_idx" ON "public"."ClientTask"("clientId" ASC);

-- CreateIndex
CREATE INDEX "ClientTask_parentTaskId_idx" ON "public"."ClientTask"("parentTaskId" ASC);

-- CreateIndex
CREATE INDEX "ClientTask_projectId_idx" ON "public"."ClientTask"("projectId" ASC);

-- CreateIndex
CREATE INDEX "ClientTask_stageId_idx" ON "public"."ClientTask"("stageId" ASC);

-- CreateIndex
CREATE INDEX "Contact_clientId_idx" ON "public"."Contact"("clientId" ASC);

-- CreateIndex
CREATE INDEX "DesignAsset_brandId_idx" ON "public"."DesignAsset"("brandId" ASC);

-- CreateIndex
CREATE INDEX "DesignAsset_campaignId_idx" ON "public"."DesignAsset"("campaignId" ASC);

-- CreateIndex
CREATE INDEX "Expense_orgId_idx" ON "public"."Expense"("orgId" ASC);

-- CreateIndex
CREATE INDEX "FinancialForecast_orgId_month_idx" ON "public"."FinancialForecast"("orgId" ASC, "month" ASC);

-- CreateIndex
CREATE INDEX "GoogleCalendarConnection_externalAccountId_idx" ON "public"."GoogleCalendarConnection"("externalAccountId" ASC);

-- CreateIndex
CREATE INDEX "GoogleCalendarConnection_orgId_status_idx" ON "public"."GoogleCalendarConnection"("orgId" ASC, "status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleCalendarConnection_userId_key" ON "public"."GoogleCalendarConnection"("userId" ASC);

-- CreateIndex
CREATE INDEX "IntegrationConnection_orgId_idx" ON "public"."IntegrationConnection"("orgId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationConnection_orgId_provider_key" ON "public"."IntegrationConnection"("orgId" ASC, "provider" ASC);

-- CreateIndex
CREATE INDEX "IntegrationConnection_provider_externalAccountId_idx" ON "public"."IntegrationConnection"("provider" ASC, "externalAccountId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_automationKey_key" ON "public"."Invoice"("automationKey" ASC);

-- CreateIndex
CREATE INDEX "Invoice_clientId_idx" ON "public"."Invoice"("clientId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_downloadToken_key" ON "public"."Invoice"("downloadToken" ASC);

-- CreateIndex
CREATE INDEX "Invoice_orgId_idx" ON "public"."Invoice"("orgId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_orgId_invoiceNumber_key" ON "public"."Invoice"("orgId" ASC, "invoiceNumber" ASC);

-- CreateIndex
CREATE INDEX "Invoice_orgId_status_dueDate_idx" ON "public"."Invoice"("orgId" ASC, "status" ASC, "dueDate" ASC);

-- CreateIndex
CREATE INDEX "Invoice_projectId_idx" ON "public"."Invoice"("projectId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "MemberInvite_email_key" ON "public"."MemberInvite"("email" ASC);

-- CreateIndex
CREATE INDEX "MemberInvite_orgId_idx" ON "public"."MemberInvite"("orgId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "MemberInvite_token_key" ON "public"."MemberInvite"("token" ASC);

-- CreateIndex
CREATE INDEX "MetaAd_campaignId_idx" ON "public"."MetaAd"("campaignId" ASC);

-- CreateIndex
CREATE INDEX "MetaAd_orgId_adAccountId_providerSyncedAt_idx" ON "public"."MetaAd"("orgId" ASC, "adAccountId" ASC, "providerSyncedAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "MetaAd_orgId_adId_key" ON "public"."MetaAd"("orgId" ASC, "adId" ASC);

-- CreateIndex
CREATE INDEX "MetaAd_orgId_idx" ON "public"."MetaAd"("orgId" ASC);

-- CreateIndex
CREATE INDEX "MetaCampaign_orgId_adAccountId_providerSyncedAt_idx" ON "public"."MetaCampaign"("orgId" ASC, "adAccountId" ASC, "providerSyncedAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "MetaCampaign_orgId_campaignId_key" ON "public"."MetaCampaign"("orgId" ASC, "campaignId" ASC);

-- CreateIndex
CREATE INDEX "MetaCampaign_orgId_idx" ON "public"."MetaCampaign"("orgId" ASC);

-- CreateIndex
CREATE INDEX "MetaLead_clientId_createdTime_idx" ON "public"."MetaLead"("clientId" ASC, "createdTime" ASC);

-- CreateIndex
CREATE INDEX "MetaLead_orgId_adAccountId_idx" ON "public"."MetaLead"("orgId" ASC, "adAccountId" ASC);

-- CreateIndex
CREATE INDEX "MetaLead_orgId_idx" ON "public"."MetaLead"("orgId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "MetaLead_orgId_leadId_key" ON "public"."MetaLead"("orgId" ASC, "leadId" ASC);

-- CreateIndex
CREATE INDEX "MetaPageConnection_connectionId_idx" ON "public"."MetaPageConnection"("connectionId" ASC);

-- CreateIndex
CREATE INDEX "MetaPageConnection_orgId_idx" ON "public"."MetaPageConnection"("orgId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "MetaPageConnection_pageId_key" ON "public"."MetaPageConnection"("pageId" ASC);

-- CreateIndex
CREATE INDEX "Milestone_projectId_idx" ON "public"."Milestone"("projectId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationOnboardingState_orgId_key" ON "public"."OrganizationOnboardingState"("orgId" ASC);

-- CreateIndex
CREATE INDEX "OrganizationOnboardingState_orgId_updatedAt_idx" ON "public"."OrganizationOnboardingState"("orgId" ASC, "updatedAt" ASC);

-- CreateIndex
CREATE INDEX "PrismChatSession_orgId_updatedAt_idx" ON "public"."PrismChatSession"("orgId" ASC, "updatedAt" ASC);

-- CreateIndex
CREATE INDEX "PrismChatSession_userId_idx" ON "public"."PrismChatSession"("userId" ASC);

-- CreateIndex
CREATE INDEX "PrismInsight_orgId_createdAt_idx" ON "public"."PrismInsight"("orgId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "Project_clientId_idx" ON "public"."Project"("clientId" ASC);

-- CreateIndex
CREATE INDEX "Project_orgId_idx" ON "public"."Project"("orgId" ASC);

-- CreateIndex
CREATE INDEX "Project_orgId_paymentType_paymentStartDate_idx" ON "public"."Project"("orgId" ASC, "paymentType" ASC, "paymentStartDate" ASC);

-- CreateIndex
CREATE INDEX "ProjectMember_projectId_idx" ON "public"."ProjectMember"("projectId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMember_projectId_userId_key" ON "public"."ProjectMember"("projectId" ASC, "userId" ASC);

-- CreateIndex
CREATE INDEX "ProjectMember_userId_idx" ON "public"."ProjectMember"("userId" ASC);

-- CreateIndex
CREATE INDEX "ProjectStage_projectId_idx" ON "public"."ProjectStage"("projectId" ASC);

-- CreateIndex
CREATE INDEX "RecurringRetainer_clientId_idx" ON "public"."RecurringRetainer"("clientId" ASC);

-- CreateIndex
CREATE INDEX "RecurringRetainer_orgId_startDate_idx" ON "public"."RecurringRetainer"("orgId" ASC, "startDate" ASC);

-- CreateIndex
CREATE INDEX "RecurringSubscription_orgId_idx" ON "public"."RecurringSubscription"("orgId" ASC);

-- CreateIndex
CREATE INDEX "Report_createdById_idx" ON "public"."Report"("createdById" ASC);

-- CreateIndex
CREATE INDEX "Report_orgId_createdAt_idx" ON "public"."Report"("orgId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "ResourceAllocation_projectId_idx" ON "public"."ResourceAllocation"("projectId" ASC);

-- CreateIndex
CREATE INDEX "ScheduledPost_clientId_idx" ON "public"."ScheduledPost"("clientId" ASC);

-- CreateIndex
CREATE INDEX "Strategy_createdById_idx" ON "public"."Strategy"("createdById" ASC);

-- CreateIndex
CREATE INDEX "Strategy_orgId_type_createdAt_idx" ON "public"."Strategy"("orgId" ASC, "type" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "TaskComment_taskId_idx" ON "public"."TaskComment"("taskId" ASC);

-- CreateIndex
CREATE INDEX "TaskComment_userId_idx" ON "public"."TaskComment"("userId" ASC);

-- CreateIndex
CREATE INDEX "TaskUpdate_taskId_idx" ON "public"."TaskUpdate"("taskId" ASC);

-- CreateIndex
CREATE INDEX "Transaction_clientId_idx" ON "public"."Transaction"("clientId" ASC);

-- CreateIndex
CREATE INDEX "Transaction_invoiceId_idx" ON "public"."Transaction"("invoiceId" ASC);

-- CreateIndex
CREATE INDEX "Transaction_orgId_date_idx" ON "public"."Transaction"("orgId" ASC, "date" ASC);

-- CreateIndex
CREATE INDEX "Transaction_orgId_idx" ON "public"."Transaction"("orgId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_authUserId_key" ON "public"."User"("authUserId" ASC);

-- CreateIndex
CREATE INDEX "User_clientId_idx" ON "public"."User"("clientId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email" ASC);

-- CreateIndex
CREATE INDEX "User_orgId_idx" ON "public"."User"("orgId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "public"."UserPreference"("userId" ASC);

-- AddForeignKey
ALTER TABLE "public"."AgencyLead" ADD CONSTRAINT "AgencyLead_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AskPrismMessage" ADD CONSTRAINT "AskPrismMessage_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AskPrismMessage" ADD CONSTRAINT "AskPrismMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."PrismChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AskPrismMessage" ADD CONSTRAINT "AskPrismMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Automation" ADD CONSTRAINT "Automation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Automation" ADD CONSTRAINT "Automation_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AutomationRun" ADD CONSTRAINT "AutomationRun_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "public"."Automation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Brand" ADD CONSTRAINT "Brand_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CalendarEvent" ADD CONSTRAINT "CalendarEvent_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CalendarEvent" ADD CONSTRAINT "CalendarEvent_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Campaign" ADD CONSTRAINT "Campaign_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "public"."Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Client" ADD CONSTRAINT "Client_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Client" ADD CONSTRAINT "Client_sourceLeadId_fkey" FOREIGN KEY ("sourceLeadId") REFERENCES "public"."AgencyLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClientInvite" ADD CONSTRAINT "ClientInvite_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClientTask" ADD CONSTRAINT "ClientTask_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClientTask" ADD CONSTRAINT "ClientTask_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClientTask" ADD CONSTRAINT "ClientTask_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "public"."ClientTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClientTask" ADD CONSTRAINT "ClientTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClientTask" ADD CONSTRAINT "ClientTask_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "public"."ProjectStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contact" ADD CONSTRAINT "Contact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DesignAsset" ADD CONSTRAINT "DesignAsset_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "public"."Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DesignAsset" ADD CONSTRAINT "DesignAsset_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Expense" ADD CONSTRAINT "Expense_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FinancialForecast" ADD CONSTRAINT "FinancialForecast_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GoogleCalendarConnection" ADD CONSTRAINT "GoogleCalendarConnection_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GoogleCalendarConnection" ADD CONSTRAINT "GoogleCalendarConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MemberInvite" ADD CONSTRAINT "MemberInvite_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MetaAd" ADD CONSTRAINT "MetaAd_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."MetaCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MetaAd" ADD CONSTRAINT "MetaAd_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MetaCampaign" ADD CONSTRAINT "MetaCampaign_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MetaLead" ADD CONSTRAINT "MetaLead_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MetaLead" ADD CONSTRAINT "MetaLead_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MetaPageConnection" ADD CONSTRAINT "MetaPageConnection_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "public"."IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MetaPageConnection" ADD CONSTRAINT "MetaPageConnection_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Milestone" ADD CONSTRAINT "Milestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganizationOnboardingState" ADD CONSTRAINT "OrganizationOnboardingState_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PrismChatSession" ADD CONSTRAINT "PrismChatSession_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PrismChatSession" ADD CONSTRAINT "PrismChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PrismInsight" ADD CONSTRAINT "PrismInsight_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Project" ADD CONSTRAINT "Project_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProjectStage" ADD CONSTRAINT "ProjectStage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecurringRetainer" ADD CONSTRAINT "RecurringRetainer_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecurringRetainer" ADD CONSTRAINT "RecurringRetainer_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecurringSubscription" ADD CONSTRAINT "RecurringSubscription_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Report" ADD CONSTRAINT "Report_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Report" ADD CONSTRAINT "Report_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ResourceAllocation" ADD CONSTRAINT "ResourceAllocation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScheduledPost" ADD CONSTRAINT "ScheduledPost_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Strategy" ADD CONSTRAINT "Strategy_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Strategy" ADD CONSTRAINT "Strategy_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaskComment" ADD CONSTRAINT "TaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."ClientTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaskComment" ADD CONSTRAINT "TaskComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaskUpdate" ADD CONSTRAINT "TaskUpdate_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."ClientTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
