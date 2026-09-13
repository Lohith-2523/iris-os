import { Client } from 'pg';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

// Dedicated disposable database only; never run this fixture against app data.
const connectionString = process.env.COMPLETION_TEST_DATABASE_URL;
if (!connectionString) throw new Error('Set COMPLETION_TEST_DATABASE_URL to the isolated completion_rollup_test database.');
const target = new URL(connectionString);
assert(['127.0.0.1', 'localhost'].includes(target.hostname) && target.pathname === '/completion_rollup_test');
const db = new Client({ connectionString });
await db.connect();
try {
  await db.query(`
    DROP SCHEMA public CASCADE; CREATE SCHEMA public;
    CREATE TABLE "Project" (id TEXT PRIMARY KEY, status TEXT NOT NULL DEFAULT 'IN_PROGRESS', progress INT NOT NULL DEFAULT 0, "updatedAt" TIMESTAMP NOT NULL DEFAULT now());
    CREATE TABLE "ProjectStage" (id TEXT PRIMARY KEY, name TEXT, "projectId" TEXT NOT NULL REFERENCES "Project"(id) ON DELETE CASCADE, "updatedAt" TIMESTAMP NOT NULL DEFAULT now());
    CREATE TABLE "User" (id TEXT PRIMARY KEY);
    CREATE TABLE "ClientTask" (id TEXT PRIMARY KEY, status TEXT NOT NULL DEFAULT 'TODO', progress INT NOT NULL DEFAULT 0,
      "projectId" TEXT REFERENCES "Project"(id) ON DELETE CASCADE,
      "stageId" TEXT REFERENCES "ProjectStage"(id) ON DELETE SET NULL,
      "assignedToId" TEXT REFERENCES "User"(id) ON DELETE CASCADE);
    INSERT INTO "Project" (id) VALUES ('p'), ('q'), ('bulk'), ('legacy');
    INSERT INTO "ProjectStage" (id, "projectId") VALUES ('s', 'p'), ('s2', 'p'), ('sq', 'q'), ('sb', 'bulk'), ('sl', 'legacy');
    INSERT INTO "ClientTask" (id, status, progress, "projectId", "stageId") VALUES ('legacy-task','COMPLETED',100,'legacy','sl');
  `);
  await db.query(await readFile(new URL('../prisma/migrations/20260913120000_project_completion_rollup/migration.sql', import.meta.url), 'utf8'));
  const state = async (id, table = 'Project') => (await db.query(`SELECT status FROM "${table}" WHERE id=$1`, [id])).rows[0]?.status;
  assert.equal(await state('legacy'), 'COMPLETED', 'backfills existing data');
  assert.equal(await state('s', 'ProjectStage'), 'NOT_STARTED', 'empty stage stays open');
  await db.query(`INSERT INTO "ClientTask" (id,"projectId","stageId") VALUES ('t','p','s'), ('t2','p','s2')`);
  await db.query(`UPDATE "ClientTask" SET status='COMPLETED',progress=100 WHERE id='t'`);
  assert.equal(await state('s', 'ProjectStage'), 'COMPLETED');
  assert.equal(await state('p'), 'IN_PROGRESS');
  await db.query(`UPDATE "ClientTask" SET status='NEEDS_CLIENT_APPROVAL',progress=100 WHERE id='t2'`);
  assert.equal(await state('s2', 'ProjectStage'), 'IN_PROGRESS', 'approval is not completion');
  assert.equal(await state('p'), 'IN_PROGRESS');
  await db.query(`UPDATE "ClientTask" SET status='COMPLETED',progress=100 WHERE id='t2'`);
  assert.equal(await state('p'), 'COMPLETED');
  await db.query(`UPDATE "Project" SET status='IN_PROGRESS' WHERE id='p'`);
  assert.equal(await state('p'), 'COMPLETED', 'project edits cannot override completed stages');
  await db.query(`UPDATE "ClientTask" SET status='IN_PROGRESS',progress=30 WHERE id='t2'`);
  assert.equal(await state('p'), 'IN_PROGRESS', 'reopens automatically');
  await db.query(`UPDATE "Project" SET status='COMPLETED' WHERE id='p'`);
  assert.equal(await state('p'), 'IN_PROGRESS', 'cannot manually complete unfinished staged project');
  await db.query(`UPDATE "ClientTask" SET status='COMPLETED',progress=100 WHERE id='t2'`);
  await db.query(`INSERT INTO "ClientTask" (id,"projectId") VALUES ('unstaged','p')`);
  assert.equal(await state('p'), 'IN_PROGRESS', 'unstaged work blocks completion');
  await db.query(`DELETE FROM "ClientTask" WHERE id='unstaged'`);
  assert.equal(await state('p'), 'COMPLETED', 'deletion recalculates');
  await db.query(`UPDATE "ClientTask" SET "projectId"='q',"stageId"='sq' WHERE id='t2'`);
  assert.equal(await state('p'), 'IN_PROGRESS', 'moving task recalculates old parent');
  assert.equal(await state('q'), 'COMPLETED', 'moving task recalculates new parent');
  await db.query(`INSERT INTO "ClientTask" (id,status,progress,"projectId","stageId") SELECT 'bulk-'||i, CASE WHEN i=301 THEN 'TODO' ELSE 'COMPLETED' END, CASE WHEN i=301 THEN 0 ELSE 100 END, 'bulk','sb' FROM generate_series(1,301) i`);
  assert.equal(await state('bulk'), 'IN_PROGRESS', 'uses all tasks beyond API row caps');
  await db.query(`UPDATE "ClientTask" SET status='COMPLETED',progress=100 WHERE id='bulk-301'`);
  assert.equal(await state('bulk'), 'COMPLETED');
  await db.query(`INSERT INTO "User" VALUES ('u'); INSERT INTO "ClientTask" (id,"projectId","stageId","assignedToId") VALUES ('cascade','bulk','sb','u')`);
  assert.equal(await state('bulk'), 'IN_PROGRESS');
  await db.query(`DELETE FROM "User" WHERE id='u'`);
  assert.equal(await state('bulk'), 'COMPLETED', 'FK cascades also roll up');
  await db.query(`DELETE FROM "ProjectStage" WHERE id='sq'`);
  assert.equal(await state('q'), 'IN_PROGRESS', 'removing last stage reopens auto-completed project');
  await db.query(`INSERT INTO "Project" (id,status) VALUES ('manual','ON_HOLD'); INSERT INTO "ClientTask" (id,"projectId") VALUES ('manual-task','manual')`);
  assert.equal(await state('manual'), 'ON_HOLD', 'unstaged manual projects retain status');
  // Concurrent completion of separate tasks must observe the final committed set.
  await db.query(`UPDATE "ClientTask" SET status='TODO',progress=0 WHERE id IN ('bulk-1','bulk-2')`);
  const second = new Client({ connectionString });
  await second.connect();
  try {
    await Promise.all([
      db.query(`UPDATE "ClientTask" SET status='COMPLETED',progress=100 WHERE id='bulk-1'`),
      second.query(`UPDATE "ClientTask" SET status='COMPLETED',progress=100 WHERE id='bulk-2'`),
    ]);
    assert.equal(await state('bulk'), 'COMPLETED', 'concurrent updates serialize');
  } finally { await second.end(); }
  console.log('Project completion: backfill, empty stages, approvals, reopen, overrides, moves, deletes, 301 tasks, FK cascades, and concurrency passed.');
} finally { await db.end(); }
