BEGIN;

ALTER TABLE "ProjectStage" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'NOT_STARTED';
ALTER TABLE "Project" ADD COLUMN "autoCompleted" BOOLEAN NOT NULL DEFAULT false;

-- Derive from the complete database relation, never from a paginated UI payload.
CREATE FUNCTION iris_sync_project_completion(project_id TEXT) RETURNS void
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
  has_stages BOOLEAN;
  all_complete BOOLEAN;
  task_progress INTEGER;
BEGIN
  -- NO KEY UPDATE serializes rollups without conflicting with task FK checks.
  PERFORM 1 FROM "Project" WHERE id = project_id FOR NO KEY UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  UPDATE "ProjectStage" s
  SET status = derived.status, "updatedAt" = CURRENT_TIMESTAMP
  FROM (
    SELECT st.id, CASE
      WHEN count(t.id) > 0 AND bool_and(t.status = 'COMPLETED') THEN 'COMPLETED'
      WHEN count(t.id) > 0 AND bool_or(t.status <> 'TODO') THEN 'IN_PROGRESS'
      ELSE 'NOT_STARTED'
    END AS status
    FROM "ProjectStage" st
    LEFT JOIN "ClientTask" t ON t."stageId" = st.id
    WHERE st."projectId" = project_id
    GROUP BY st.id
  ) derived
  WHERE s.id = derived.id AND s.status IS DISTINCT FROM derived.status;

  SELECT count(*) > 0, count(*) > 0 AND bool_and(status = 'COMPLETED')
    INTO has_stages, all_complete FROM "ProjectStage" WHERE "projectId" = project_id;
  -- Unstaged tasks are still unfinished project work.
  SELECT all_complete AND NOT EXISTS (
    SELECT 1 FROM "ClientTask" WHERE "projectId" = project_id AND status <> 'COMPLETED'
  ) INTO all_complete;
  SELECT COALESCE(round(avg(progress)), 0)::integer INTO task_progress
    FROM "ClientTask" WHERE "projectId" = project_id;

  UPDATE "Project" SET
    status = CASE
      WHEN all_complete THEN 'COMPLETED'
      WHEN "autoCompleted" OR (has_stages AND status = 'COMPLETED') THEN 'IN_PROGRESS'
      ELSE status END,
    progress = CASE WHEN all_complete THEN 100 ELSE LEAST(task_progress, 99) END,
    "autoCompleted" = all_complete,
    "updatedAt" = CURRENT_TIMESTAMP
  WHERE id = project_id AND (has_stages OR "autoCompleted");
END;
$$;

-- Transition tables let bulk imports/updates roll up once per affected project.
CREATE FUNCTION iris_completion_changed() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE project_ids TEXT[]; project_id TEXT;
BEGIN
  -- Cascading deletes must also roll up. A no-change stage UPDATE has an empty
  -- transition table and terminates recursion without suppressing FK cascades.
  IF TG_OP = 'INSERT' THEN
    SELECT array_agg(DISTINCT "projectId" ORDER BY "projectId") INTO project_ids FROM new_rows;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT array_agg(DISTINCT "projectId" ORDER BY "projectId") INTO project_ids FROM old_rows;
  ELSE
    SELECT array_agg(DISTINCT "projectId" ORDER BY "projectId") INTO project_ids FROM (
      SELECT "projectId" FROM new_rows UNION SELECT "projectId" FROM old_rows
    ) affected;
  END IF;
  IF project_ids IS NULL THEN RETURN NULL; END IF;
  -- Lock every affected parent in a stable order before updating stage rows.
  PERFORM 1 FROM "Project" WHERE id = ANY(project_ids) ORDER BY id FOR NO KEY UPDATE;
  FOREACH project_id IN ARRAY project_ids LOOP
    IF project_id IS NOT NULL THEN PERFORM iris_sync_project_completion(project_id); END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

CREATE TRIGGER iris_task_completion_insert AFTER INSERT ON "ClientTask"
  REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION iris_completion_changed();
CREATE TRIGGER iris_task_completion_update AFTER UPDATE ON "ClientTask"
  REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION iris_completion_changed();
CREATE TRIGGER iris_task_completion_delete AFTER DELETE ON "ClientTask"
  REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION iris_completion_changed();
CREATE TRIGGER iris_stage_completion_insert AFTER INSERT ON "ProjectStage"
  REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION iris_completion_changed();
CREATE TRIGGER iris_stage_completion_update AFTER UPDATE ON "ProjectStage"
  REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION iris_completion_changed();
CREATE TRIGGER iris_stage_completion_delete AFTER DELETE ON "ProjectStage"
  REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION iris_completion_changed();

-- An ordinary project edit must not overwrite the automatic completed state.
CREATE FUNCTION iris_project_completion_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE has_stages BOOLEAN; all_complete BOOLEAN;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  SELECT count(*) > 0, count(*) > 0 AND bool_and(status = 'COMPLETED')
    INTO has_stages, all_complete FROM "ProjectStage" WHERE "projectId" = NEW.id;
  all_complete := all_complete AND NOT EXISTS (
    SELECT 1 FROM "ClientTask" WHERE "projectId" = NEW.id AND status <> 'COMPLETED'
  );
  IF all_complete THEN
    NEW.status := 'COMPLETED'; NEW.progress := 100; NEW."autoCompleted" := true;
  ELSIF OLD."autoCompleted" OR (has_stages AND NEW.status = 'COMPLETED') THEN
    NEW.status := 'IN_PROGRESS'; NEW.progress := LEAST(NEW.progress, 99); NEW."autoCompleted" := false;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER iris_project_completion_guard BEFORE UPDATE OF status, progress ON "Project"
  FOR EACH ROW EXECUTE FUNCTION iris_project_completion_guard();

-- Backfill existing stages/projects without changing task records.
DO $$ DECLARE project_id TEXT; BEGIN
  FOR project_id IN SELECT DISTINCT "projectId" FROM "ProjectStage" ORDER BY "projectId" LOOP
    PERFORM iris_sync_project_completion(project_id);
  END LOOP;
END $$;

COMMIT;
