# Bundle analysis

Next.js 16 Turbopack `experimental-analyze --output` completed successfully.

| Raw chunk | Raw size | Identified content | Classification | Recommendation |
|---|---:|---|---|---|
| `26r8v7woircwv.js` | 909 KB | ExcelJS/XLSX | Lazy-load / split by action | Keep exports out of initial page graphs; load on explicit import/export. |
| `2sfeljy3zq10u.js` | 399 KB | XLSX | Lazy-load | Replace static imports in Agency Leads and Team with dynamic imports inside handlers. |
| Multiple route chunks | 378 KB each | Recharts | Lazy-load / deduplicate | Render chart shell first; import charts below fold; inspect Turbopack route duplication. |
| `3qindz_4-tj0w.js` | 372 KB | OpenPGP | Split by route | Load only after Messaging is authorized/opened. |
| `22zix2nxk8-e2.js` | 216 KB raw / about 56 KB transfer | Supabase browser client | Keep on auth routes, remove elsewhere | Root-layout scoping is fixed; avoid prefetching auth chunks where low value. |

Public Lighthouse reports still identify 28–100 KB unused initial JavaScript. The next high-value work is architectural: Server Components for static content and small client islands, not dependency replacement for negligible savings.
