ALTER TABLE "Project" ADD COLUMN "metaIntegrationEnabled" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Project"
SET "metaIntegrationEnabled" = true
WHERE lower(coalesce("serviceLine", '')) SIMILAR TO '%(digital marketing|social media|paid advertising|paid ads|ppc)%';

