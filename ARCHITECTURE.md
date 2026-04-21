# Music Distribution Service — MVP Architecture

## Concept

Платформа дистрибьюции музыки (аналог OneRPM) с AI-слоем на каждом этапе. В MVP охватывается только **этап 1**: загрузка релиза + генерация брендбука + обложка + соцконтент + видеотизер. Выгрузка на стриминговые площадки — вручную владельцем платформы до набора аудитории.

**Центральный объект системы** — `BrandProfile` артиста. Это структурированный JSON-контракт (версионируемый), который создаётся один раз при онбординге и переиспользуется для всех последующих релизов. Обеспечивает визуальную и нарративную целостность бренда.

## Tech Stack (зафиксирован)

- **Runtime:** Node.js 20 LTS
- **Язык:** TypeScript strict
- **Монорепо:** pnpm workspaces (без turborepo на старте)
- **Фреймворк:** Next.js 15 (App Router)
- **UI:** React + Tailwind + shadcn/ui
- **API-стиль:** REST + zod-контракты (не tRPC)
- **ORM:** Prisma
- **БД:** Postgres (managed)
- **Очередь:** Redis + BullMQ
- **Auth:** Auth.js v5 (magic-link)
- **Storage:** Cloudflare R2 (S3-совместимый)
- **Хостинг:** Railway (web + worker + Postgres + Redis в одном проекте)
- **Видео:** Remotion (для тизеров)

## Monorepo Structure

```
/apps
  /web          — Next.js (UI + быстрый API)
  /worker       — Node-процесс, слушает BullMQ, крутит AI-задачи
/packages
  /shared       — zod-схемы, типы BrandProfile, константы, state-machine
  /ai-prompts   — промпты модулей + функции-обёртки
```

Web и worker — два деплоя, **один репозиторий, одна БД**. Next.js на Vercel/serverless не подходит (таймауты), поэтому worker — обычный Node-процесс на Railway.

## Data Model

### Сущности и связи

```
User (артистский аккаунт)
  └── Artist (1:N)
       ├── BrandProfile (1:N — версии; активная через currentBrandId)
       └── Release (1:N, только синглы в MVP)
              ├── brandProfileId — фиксируется навсегда
              ├── Asset (1:N)                    — файлы в R2
              ├── GeneratedContent (1:N)         — AI-выводы + история
              ├── AiJob (1:N)                    — аудит BullMQ
              └── ModerationRecord (1:N)

ReleaseStatusEvent — отдельный audit log всех переходов state-machine
```

### Ключевые решения

- **Модератор в MVP** — владелец платформы. Отдельной таблицы нет, в `ModerationRecord.moderatorEmail` строкой. Мигрируется в таблицу за час при появлении второго модератора.
- **Soft delete** — поле `deletedAt` на `Artist`, `BrandProfile`, `Release`. Реализован через Prisma middleware с escape-hatch `__withDeleted: true` в where-клаузе.
- **Только синглы** — в MVP нет EP/Album, нет таблицы Track. `Release.metadata: Json` для жанров/тегов/ISRC.
- **Artist.slug** — оставлен, уникальный индекс. Нужен для публичных страниц `/artists/{slug}`.
- **BrandProfile.data** — JSONB под zod-схемой в `packages/shared`. Полная структура ниже.
- **BrandProfile версионирование** — новая запись на каждую версию. Релиз навсегда привязан к `brandProfileId`, под который был сгенерён (воспроизводимость).

### Prisma schema (core)

```prisma
model User {
  id         String   @id @default(cuid())
  email      String   @unique
  name       String?
  createdAt  DateTime @default(now())
  artists    Artist[]
}

model Artist {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  name            String
  slug            String   @unique
  currentBrandId  String?  @unique
  currentBrand    BrandProfile? @relation("CurrentBrand", fields: [currentBrandId], references: [id])
  brands          BrandProfile[] @relation("AllBrands")
  releases        Release[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  deletedAt       DateTime?
  @@index([userId])
  @@index([deletedAt])
}

model BrandProfile {
  id          String   @id @default(cuid())
  artistId    String
  artist      Artist   @relation("AllBrands", fields: [artistId], references: [id])
  version     Int
  status      BrandStatus @default(DRAFT)
  data        Json                    // BrandProfileV1 под zod
  currentOf   Artist?  @relation("CurrentBrand")
  releases    Release[]
  createdAt   DateTime @default(now())
  lockedAt    DateTime?
  deletedAt   DateTime?
  @@unique([artistId, version])
  @@index([artistId])
  @@index([deletedAt])
}
enum BrandStatus { DRAFT LOCKED }

model Release {
  id              String   @id @default(cuid())
  artistId        String
  artist          Artist   @relation(fields: [artistId], references: [id])
  brandProfileId  String
  brandProfile    BrandProfile @relation(fields: [brandProfileId], references: [id])
  title           String
  status          ReleaseStatus @default(DRAFT)
  scheduledFor    DateTime?
  publishedAt     DateTime?
  metadata        Json @default("{}")
  pipelineConfig  Json @default("{}")
  assets               Asset[]
  generatedContents    GeneratedContent[]
  moderationRecords    ModerationRecord[]
  aiJobs               AiJob[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  deletedAt       DateTime?
  @@index([artistId, status])
  @@index([status, scheduledFor])
  @@index([deletedAt])
}
enum ReleaseStatus {
  DRAFT
  CONTENT_PENDING
  CONTENT_REVIEW
  MODERATION_QUEUE
  APPROVED
  REJECTED
  DISTRIBUTING
  LIVE
}

model Asset {
  id                   String   @id @default(cuid())
  releaseId            String
  release              Release  @relation(fields: [releaseId], references: [id])
  kind                 AssetKind
  source               AssetSource
  generatedContentId   String?
  generatedContent     GeneratedContent? @relation(fields: [generatedContentId], references: [id])
  url                  String
  fileName             String
  mimeType             String
  sizeBytes            Int
  meta                 Json @default("{}")
  createdAt            DateTime @default(now())
  @@index([releaseId, kind])
}
enum AssetKind { AUDIO_MASTER COVER LYRICS SOCIAL_POST TEASER_VIDEO OTHER }
enum AssetSource { USER_UPLOAD AI_GENERATED }

model GeneratedContent {
  id          String   @id @default(cuid())
  releaseId   String
  release     Release  @relation(fields: [releaseId], references: [id])
  module      AiModule
  status      GenerationStatus
  payload     Json
  assets      Asset[]
  createdAt   DateTime @default(now())
  approvedAt  DateTime?
  @@index([releaseId, module])
}
enum AiModule { BRAND COVER SOCIAL TEASER }
enum GenerationStatus { PENDING READY APPROVED REJECTED }

model AiJob {
  id          String   @id @default(cuid())
  releaseId   String?
  release     Release? @relation(fields: [releaseId], references: [id])
  module      AiModule
  jobId       String   @unique
  status      JobStatus @default(QUEUED)
  input       Json
  output      Json?
  error       String?
  costMeta    Json @default("{}")
  createdAt   DateTime @default(now())
  startedAt   DateTime?
  finishedAt  DateTime?
  @@index([releaseId, module])
  @@index([status])
}
enum JobStatus { QUEUED RUNNING SUCCEEDED FAILED }

model ModerationRecord {
  id              String   @id @default(cuid())
  releaseId       String
  release         Release  @relation(fields: [releaseId], references: [id])
  action          ModerationAction
  reason          String?
  moderatorEmail  String
  createdAt       DateTime @default(now())
  @@index([releaseId])
}
enum ModerationAction { APPROVED REJECTED SENT_BACK }

model ReleaseStatusEvent {
  id          String   @id @default(cuid())
  releaseId   String
  fromStatus  ReleaseStatus
  toStatus    ReleaseStatus
  event       String
  actorRole   String       // "artist" | "moderator" | "system"
  actorRef    String?
  reason      String?
  createdAt   DateTime @default(now())
  @@index([releaseId])
}
```

## BrandProfile JSON — v1 zod-схема

Лежит в `packages/shared/src/brand-profile/v1.schema.ts`. Записывается в `BrandProfile.data`.

```ts
export const BrandProfileV1Schema = z.object({
  v: z.literal(1),
  identity:  IdentityBlockSchema,
  visual:    VisualBlockSchema,
  verbal:    VerbalBlockSchema,
  audience:  AudienceBlockSchema,
  source: z.object({
    generatedBy: z.enum(["ai_full", "ai_assisted", "user_manual"]),
    aiJobIds: z.array(z.string()).default([]),
  }),
});

// Identity
const IdentityBlockSchema = z.object({
  artistName: z.string().min(1).max(80),
  pronunciation: z.string().optional(),
  concept: z.object({
    oneLiner: z.string().max(140),
    description: z.string().max(1000),
    keywords: z.array(z.string()).min(3).max(10),
  }),
  logomark: z.object({
    prompt: z.string(),
    imageUrl: z.string().url(),
    backgroundVariants: z.array(z.enum(["light", "dark", "transparent"])),
  }).nullable(),
});

// Visual — сердце брендбука
const VisualBlockSchema = z.object({
  palette: z.object({
    primary:   HexColorSchema,
    secondary: HexColorSchema,
    accent:    HexColorSchema,
    mood: z.enum(["dark", "light", "vibrant", "muted", "monochrome"]),
  }),
  typography: z.object({
    display: FontSchema,
    body:    FontSchema,
  }).nullable(),  // null → дефолты по mood из packages/shared/src/defaults/typography.ts
  imageStyle: z.object({
    promptFragment: z.string().min(50).max(500),
    descriptors: z.array(z.string()).min(3).max(15),
    forbidden: z.array(z.string()).default([]),
    references: z.array(z.object({
      url: z.string().url(),
      note: z.string().optional(),
    })).default([]),
  }),
  composition: z.object({
    coverLayout: z.enum(["centered_logo", "full_bleed", "minimal_text", "typographic"]),
    socialAspectRatios: z.array(z.enum(["1:1", "9:16", "16:9", "4:5"])).default(["1:1", "9:16"]),
  }),
});
const HexColorSchema = z.string().regex(/^#[0-9A-F]{6}$/i);
const FontSchema = z.object({
  family: z.string(),
  source: z.enum(["google_fonts", "adobe_fonts", "custom"]),
  url: z.string().url().optional(),
  usage: z.string(),
});

// Verbal
const VerbalBlockSchema = z.object({
  toneOfVoice: z.object({
    descriptors: z.array(z.string()).min(3).max(8),
    avoid:       z.array(z.string()).default([]),
  }),
  exemplars: z.object({
    bioShort: z.string().max(280),
    bioLong:  z.string().max(2000),
    pressOneLiner: z.string().max(140),
  }),
  themes: z.array(z.string()).min(2).max(7),
  language: z.object({
    primary: z.enum(["ru", "en", "ru_en_mixed"]),
    secondary: z.array(z.enum(["ru", "en"])).default([]),
  }),
});

// Audience
const AudienceBlockSchema = z.object({
  primary: z.object({
    description: z.string().max(500),
    ageRange: z.tuple([z.number(), z.number()]).optional(),
    interests: z.array(z.string()).min(2).max(10),
  }),
  platforms: z.array(z.object({
    name: z.enum(["telegram", "vk", "instagram", "youtube", "tiktok", "spotify"]),
    priority: z.enum(["primary", "secondary"]),
  })).min(1),
  positioning: z.object({
    genre: z.array(z.string()).min(1).max(5),
    similarTo: z.array(z.string()).default([]),
    differentBecause: z.string().max(500),
  }),
});
```

**Правила эволюции:** любое изменение структуры → `v: 2`, пишется миграционная функция `migrateV1toV2`. Старые записи мигрируются лениво при чтении.

## AI Module Contract

Единый интерфейс для всех модулей. Лежит в `packages/shared/src/ai/module-contract.ts`.

```ts
export interface AiModuleHandler<TInput, TOutput> {
  readonly name: AiModule;
  readonly inputSchema: z.ZodType<TInput>;
  readonly outputSchema: z.ZodType<TOutput>;
  execute(input: TInput, ctx: ModuleContext): Promise<ModuleResult<TOutput>>;
  estimateCost(input: TInput): CostEstimate;
}

export interface ModuleContext {
  jobId: string;
  releaseId?: string;
  artistId: string;
  reportProgress(stage: string, percent: number): Promise<void>;
  logCost(entry: CostLogEntry): void;
  storage: StorageClient;
  abortSignal: AbortSignal;
}

export interface ModuleResult<TOutput> {
  status: "success" | "partial" | "failed";
  output?: TOutput;
  error?: ModuleError;
  artifacts: Artifact[];
  costSummary: CostSummary;
}

export class ModuleError extends Error {
  constructor(
    public readonly kind: ErrorKind,
    public readonly retryable: boolean,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) { super(message); }
}

export type ErrorKind =
  | "invalid_input"
  | "provider_unavailable"
  | "provider_rate_limit"
  | "provider_content_policy"
  | "internal_timeout"
  | "user_cancelled"
  | "unknown";
```

### Четыре модуля

```ts
type BrandInput = {
  brief: { description: string; genre: string[]; references?: string[] };
  inspirationImages?: string[];
};
type BrandOutput = {
  brandProfile: BrandProfileV1;
  alternatives: { logomarkPrompts: string[] };
};

type CoverInput = {
  brandProfile: BrandProfileV1;
  release: { title: string; mood?: string; lyricsExcerpt?: string };
  variants: number;  // 1-4
};
type CoverOutput = {
  covers: Array<{ url: string; prompt: string; variation: string }>;
};

type SocialInput = {
  brandProfile: BrandProfileV1;
  release: { title: string; releaseDate: Date; coverUrl: string };
  platforms: Array<"telegram" | "vk" | "instagram">;
};
type SocialOutput = {
  posts: Array<{
    platform: string;
    text: string;
    imageUrl?: string;
    hashtags: string[];
  }>;
};

type TeaserInput = {
  brandProfile: BrandProfileV1;
  release: { title: string; coverUrl: string };
  audioExcerpt: { url: string; durationSec: number };
  template: "ritual" | "pulse" | "monolith";
  durationSec: 15 | 30 | 60;
};
type TeaserOutput = {
  videoUrl: string;
  thumbnailUrl: string;
  durationSec: number;
};
```

### Правила работы

- **BrandProfile передаётся по значению** (полный объект), не по ID. Это даёт воспроизводимость на момент создания джоба.
- **Cancel через AbortSignal**. Модули обязаны проверять `ctx.abortSignal.aborted` на каждой длинной операции.
- **Внутри модуля — sequential generation** (не параллельный по variants). Проще обрабатывать ошибки, предсказуемая стоимость.
- **Retry** — BullMQ, 3 попытки с backoff `[5s, 30s, 2min]`, но только если `ModuleError.retryable === true`.
- **Прогресс** — `reportProgress(stage, percent)` → Redis Pub/Sub → SSE на фронт.

## Release State Machine

Единый source of truth в `packages/shared/src/release/state-machine.ts`.

| Из | В | Event | Actor |
|---|---|---|---|
| DRAFT | CONTENT_PENDING | submit_for_generation | artist |
| DRAFT | MODERATION_QUEUE | submit_skip_ai | artist |
| CONTENT_PENDING | CONTENT_REVIEW | all_jobs_finished | system |
| CONTENT_PENDING | DRAFT | cancel_generation | artist |
| CONTENT_REVIEW | MODERATION_QUEUE | submit_to_moderation | artist |
| CONTENT_REVIEW | CONTENT_PENDING | regenerate | artist |
| CONTENT_REVIEW | DRAFT | back_to_edit | artist |
| MODERATION_QUEUE | APPROVED | approve | moderator |
| MODERATION_QUEUE | REJECTED | reject | moderator |
| MODERATION_QUEUE | DRAFT | send_back | moderator |
| APPROVED | DISTRIBUTING | start_distribution | moderator |
| DISTRIBUTING | LIVE | mark_live | moderator |
| REJECTED | DRAFT | revise | artist |

**Правила:**
- Каждый переход проходит через `canTransition(release, event, actorRole)` с guard'ами.
- Guard для `DRAFT → CONTENT_PENDING`: есть AUDIO_MASTER, есть BrandProfile со статусом LOCKED, есть title.
- Guard для `MODERATION_QUEUE → APPROVED`: есть COVER asset, есть жанр в metadata.
- `send_back` и `reject` требуют **обязательный `reason`**.
- Каждый переход пишет `ReleaseStatusEvent`.
- В `CONTENT_PENDING` редактировать релиз нельзя (только cancel → DRAFT).
- Переход `CONTENT_PENDING → CONTENT_REVIEW` — системный, триггерится воркером когда все AiJob'ы в состоянии SUCCEEDED/FAILED.

## Pipeline Config

На каждом релизе есть `pipelineConfig: Json` со zod-схемой:

```ts
const PipelineConfigSchema = z.object({
  modules: z.object({
    cover:  z.boolean().default(true),
    social: z.boolean().default(true),
    teaser: z.boolean().default(true),
  }),
  coverOptions:  z.object({ variants: z.number().min(1).max(4).default(2) }).optional(),
  socialOptions: z.object({ platforms: z.array(z.string()) }).optional(),
  teaserOptions: z.object({
    template: z.enum(["ritual", "pulse", "monolith"]),
    durationSec: z.union([z.literal(15), z.literal(30), z.literal(60)]),
  }).optional(),
});
```

Артист может:
- Отключить модули при создании релиза
- **Отключить модуль на лету** в approval-дашборде (с подтверждением)

## Teaser (Remotion)

Видео собираются программно (не AI-video), это вариант «шаблонная сборка».

- Библиотека — Remotion (React-компоненты → mp4 через headless Chromium + ffmpeg)
- Три шаблона: **Ritual** (dark/muted/monochrome), **Pulse** (vibrant/light), **Monolith** (универсальный)
- Длительность 15/30/60 сек, параметризуется через `durationInFrames`
- Цвета, шрифты, логомарк подставляются из BrandProfile
- Артист указывает таймкод интересного куска из аудио
- Воркеру нужно 2GB RAM, Chromium

## Approval UX

Единый дашборд релиза (вариант B):
- Каждый AI-результат — секция со своим состоянием (PENDING/READY/APPROVED/FAILED/SKIPPED)
- Обновления через SSE по `releaseId`
- Regenerate — per-module, не весь релиз
- Старые GeneratedContent сохраняются со `status: REJECTED` (история)
- Deep-dive: **фуллскрин-модалка для тизера**, preview-модалка для обложки, inline для соцпостов
- Загрузка своего файла вместо AI — кнопка «Использовать свой», создаёт Asset с `source: USER_UPLOAD`
- Submit disabled пока есть PENDING или неодобренные READY блоки (tooltip объясняет почему)

## Auth

- Auth.js v5, magic-link + email
- Артист и модератор — **разные эндпоинты** (в MVP модератор = владелец, доступ через отдельный route group с middleware и whitelist email)

## Storage

- Cloudflare R2, S3-совместимый API
- Бакеты: один на всё, ключи с префиксами: `artists/{id}/brand/{v}/...`, `releases/{id}/audio/...`, `releases/{id}/generated/cover/{jobId}/...`
- Presigned URLs для загрузки с фронта
- Публичный доступ только для финальных Asset'ов, сгенерированные промежуточные — только через подписанные URLs

## Naming & Conventions

- TypeScript strict, все компоненты типизированы
- REST: `app/api/v1/{resource}/route.ts`
- zod-схемы API — в `packages/shared/src/api/`
- Именование enum'ов — UPPER_SNAKE (как в Prisma)
- Именование функций/файлов — camelCase
- React-компоненты — PascalCase
- Файловая структура Next.js App Router: `app/(artist)/...`, `app/(admin)/...`, `app/(public)/...`
