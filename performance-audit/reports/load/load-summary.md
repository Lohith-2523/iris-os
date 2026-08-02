# Local load summary

Safe, read-only load test against `/`, `/home`, `/pricing`, and `/login`, 40 requests per stage:

| Concurrency | Requests/s | p50 | p95 | p99 | Failures |
|---:|---:|---:|---:|---:|---:|
| 1 | 327.75 | 2 ms | 4 ms | 27 ms | 0 |
| 5 | 634.86 | 8 ms | 9 ms | 10 ms | 0 |
| 10 | 649.44 | 15 ms | 22 ms | 22 ms | 0 |
| 25 | 729.15 | 36 ms | 38 ms | 38 ms | 0 |

This measures local static delivery only. It does not establish authenticated API or production infrastructure capacity.
