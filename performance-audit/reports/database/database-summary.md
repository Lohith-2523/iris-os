# Database performance summary

- PostgreSQL 17.6; Prisma schema validates.
- Dataset is small (largest sampled application table: 622 CalendarEvent rows), so current read queries are generally sub-10 ms.
- No production schema or index changes were made.
- `pg_stat_statements` is enabled.

## Critical finding

Task status/progress primary-key updates show lock-wait behavior: 131 calls average 9,994.4 ms (max 49,518.5 ms) and another normalized shape has 19 calls averaging 9,420.9 ms (max 22,535.3 ms). Shared-block reads and block-read time are zero; the table has no trigger; the same query shape completes in 4.6 ms when uncontended.

This is not an index problem. Capture blockers during reproduction, deduplicate concurrent saves, use optimistic concurrency, and shorten write transactions.

## Index notes

Several indexes have zero scans in the collected statistics, but the database is tiny and statistics include development/migration activity. Removing them now would be premature. Reassess with representative production traffic and write-volume costs.
