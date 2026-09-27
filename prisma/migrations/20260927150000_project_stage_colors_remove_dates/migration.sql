-- Project stages are categorical workflow labels. Scheduling remains owned by
-- project dates and task deadlines.
CREATE TABLE "ProjectStageDateArchive" (
  "stageId" TEXT NOT NULL PRIMARY KEY,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "ProjectStageDateArchive" ("stageId", "startDate", "endDate")
SELECT "id", "startDate", "endDate" FROM "ProjectStage";

ALTER TABLE "ProjectStage" ADD COLUMN "color" TEXT NOT NULL DEFAULT '#94A3B8';
ALTER TABLE "ProjectStage" DROP COLUMN "startDate";
ALTER TABLE "ProjectStage" DROP COLUMN "endDate";

-- Rollback (manual): add nullable startDate/endDate columns, restore them by
-- joining ProjectStageDateArchive on stageId, make them NOT NULL, then drop
-- color and ProjectStageDateArchive.
