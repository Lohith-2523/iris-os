ALTER TABLE "public"."User"
ADD COLUMN "handlesDeliverables" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "public"."MemberInvite"
ADD COLUMN "accessPermissions" JSONB,
ADD COLUMN "handlesDeliverables" BOOLEAN NOT NULL DEFAULT false;
