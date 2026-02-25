# AGENTS.md

## Cursor Cloud specific instructions

### Architecture overview

Дайбилет — pnpm monorepo with 4 packages under `packages/`:
- **backend** (`@daibilet/backend`) — NestJS REST API on port 4000. Swagger docs at `/api/docs`.
- **frontend** (`@daibilet/frontend`) — Next.js 15 (App Router) SSR site on port 3000.
- **frontend-admin** (`@daibilet/frontend-admin`) — Vite SPA admin panel on port 5173 (optional).
- **shared** (`@daibilet/shared`) — TypeScript types/utils consumed by other packages. Must be built (`pnpm --filter @daibilet/shared build`) before backend/frontend.

Infrastructure: PostgreSQL 16 (port 5433) + Redis 7 (port 6379) via `docker-compose.yml`.

### Starting services

1. **Docker (PostgreSQL + Redis):** `sudo dockerd` must be running first, then `sudo docker compose up -d`
2. **Prisma:** `.env` must be symlinked into `packages/backend/` for Prisma CLI: `ln -sf /workspace/.env /workspace/packages/backend/.env`. Use `prisma db push` for fresh setup (avoids migration ordering issues with the shadow database). Use `prisma migrate deploy` for production.
3. **Dev servers:** `pnpm dev` runs backend + frontend concurrently. Or run separately: `pnpm dev:backend`, `pnpm dev:frontend`.
4. **Seed data:** `pnpm db:seed` populates cities, tags, landing pages, combo pages, upsells, pricing, and admin user (`admin@daibilet.ru` / `changeme123`).

### Gotchas

- **Prisma migrations vs db push:** `prisma migrate dev` fails due to a migration ordering issue in the shadow database (`20260212_audience` references enum values from a later migration). Use `prisma db push` for development setup.
- **BullMQ queue constants:** Queue name constants (`QUEUE_EMAILS`, `QUEUE_REVIEW_TASKS`) live in `queue.constants.ts` to avoid circular dependency between `queue.module.ts` and the processor files.
- **ESLint not configured:** Backend has `eslint` in lint script but no eslint dependency or config file. Frontend's `next lint` requires interactive setup. Only the shared package's lint (`tsc --noEmit`) works out of the box.
- **TC_API_TOKEN:** The Ticketscloud API token is not set in dev — the gRPC client logs a warning but the app still starts and functions normally for catalog browsing with seeded data.
- **Docker in nested containers:** Requires fuse-overlayfs storage driver and iptables-legacy. Docker daemon must be started with `sudo dockerd`.

### Key commands (see also `package.json` scripts)

| Action | Command |
|--------|---------|
| Install deps | `pnpm install` |
| Build shared | `pnpm --filter @daibilet/shared build` |
| Generate Prisma | `pnpm db:generate` |
| Push schema | `cd packages/backend && npx prisma db push` |
| Seed DB | `pnpm db:seed` |
| Dev (all) | `pnpm dev` |
| Lint (shared) | `pnpm --filter @daibilet/shared lint` |
