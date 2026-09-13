# Project completion rollout

Apply `20260913120000_project_completion_rollup` before deploying the regenerated Prisma client. The migration adds fields with defaults, retains every existing record, and backfills stages and projects from all tasks. Old application versions remain compatible: triggers cover their writes too.

Run `npx prisma migrate deploy` against the intended database, then `npx prisma generate`. Use migrations rather than `db push`: `db push` does not install the SQL triggers.

Completion requires at least one stage, at least one task in every stage, all those tasks completed, and no unfinished unstaged project tasks. Approval-pending tasks do not count as completed. New/reopened tasks reopen automatically completed projects. Projects without stages retain manual status control. Updates, deletes, moves, approvals, and bulk task creation all recalculate in the same transaction.

For regression checks, point `COMPLETION_TEST_DATABASE_URL` at a dedicated local database named `completion_rollup_test`, then run `node scripts/check-project-completion.mjs`. This script replaces that test database's public schema; it refuses nonlocal hosts or any other database name. It checks backfill, empty stages, approvals, reopening, overrides, moves, deletes, more than 250 tasks, foreign-key cascades, and concurrent completions.

## Rollback

Roll back the application first if needed. The additive columns are compatible with the previous application and should be retained to preserve data. Disable automation by dropping the six `iris_task_completion_*` / `iris_stage_completion_*` triggers and the `iris_project_completion_guard` trigger, then drop the three functions. Do not drop task, stage, or project records. Derived statuses remain at their last value; they can then be managed manually. Re-enabling the functions/triggers and running the backfill restores derived status behavior.

## Email signup deployment

In Supabase Authentication settings, enable **Confirm Email** and configure a working email delivery provider. Allow the deployed `/auth/callback` URL in the redirect allowlist. Email signup deliberately fails closed while automatic email confirmation is enabled. Pending Supabase identities may exist before verification, but they cannot create a new application workspace. Google signup uses Google's verified identity.

Crawler declarations are voluntary. `robots.txt` permits the listed AI/search crawlers only on exact public marketing pages; `llms.txt` describes that same scope. Authentication continues to protect workspace and API data.

References: [Supabase email confirmation](https://supabase.com/docs/guides/auth/general-configuration), [OpenAI crawler identifiers](https://developers.openai.com/api/docs/bots), [Anthropic crawler identifiers](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler), and the [llms.txt proposal](https://llmstxt.org/).
