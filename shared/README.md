# Shared application code

This directory contains code shared by the production IrisOS application and the future IrisOS super-admin application.

- `components`: reusable UI and feature components
- `config`: shared integration configuration
- `lib`: domain helpers, clients, validation, and service utilities
- `server`: server-only domain services, security, and read models

Use the existing `@/components`, `@/config`, `@/lib`, and `@/server` aliases. Keep customer routes in `src/app` and future internal-admin code in `src/admin`.
