# MeatRecords

Music distribution platform with AI content generation layer.

## Stack

- **Next.js 15** (App Router) — web app
- **BullMQ + Redis** — AI job queue
- **Prisma 5 + PostgreSQL** — database
- **Auth.js v5** — email/password auth
- **pnpm workspaces** — monorepo

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker + Docker Compose

## Local setup

### 1. Clone and install

```bash
git clone <repo>
cd meatrecords
pnpm install
```

### 2. Environment

```bash
cp .env.example .env
```

Edit `.env` — the defaults work for local Docker. Generate `AUTH_SECRET`:

```bash
openssl rand -base64 32
```

Then symlink env for the web app:

```bash
ln -sf ../../.env apps/web/.env
```

### 3. Start infrastructure

```bash
docker compose up -d
```

Postgres on `localhost:5432`, Redis on `localhost:6379`.

### 4. Database

```bash
pnpm --filter @repo/web exec prisma migrate deploy
pnpm --filter @repo/web exec prisma generate
```

Seed a demo user (email: `nrecordsmeat@gmail.com`, password: `password`):

```bash
pnpm --filter @repo/web exec tsx prisma/seed.ts
```

### 5. Build shared package

```bash
pnpm --filter @repo/shared build
```

### 6. Run

Open two terminals:

```bash
# Terminal 1 — web (http://localhost:3000)
pnpm --filter @repo/web dev

# Terminal 2 — AI worker
pnpm --filter @repo/worker build && pnpm --filter @repo/worker dev
```

## Project structure

```
apps/
  web/        — Next.js app (API routes + UI)
  worker/     — BullMQ worker for AI jobs
packages/
  shared/     — Zod schemas, state machine, types
  ai-prompts/ — AI prompt templates
prisma/       — Schema and migrations
docker-compose.yml
```

## Key flows

1. **Artist onboarding** → create artist → fill brand profile (5-step wizard)
2. **Release** → create → upload audio → submit for generation
3. **AI pipeline** → worker picks up jobs → generates cover/social/teaser → release moves to `CONTENT_REVIEW`
4. **Review** → artist approves/rejects each piece of content → submits to moderation
5. **Moderation** → admin approves → release goes to distribution

## Release statuses

```
DRAFT → CONTENT_PENDING → CONTENT_REVIEW → MODERATION_QUEUE → APPROVED → DISTRIBUTING → LIVE
                                         ↘ REJECTED
```

## Notes

- R2 storage is optional — in dev mode assets are recorded in DB without actual upload
- AI modules are mocked by default — replace handlers in `apps/worker/src/index.ts`
- Admin panel at `/admin` — requires email in `MODERATOR_EMAILS` env var
