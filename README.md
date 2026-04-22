# MeatRecords

Платформа дистрибьюции музыки с AI-генерацией контента.

---

## Что нужно установить перед началом

Если чего-то нет — кликай на ссылку, устанавливай, возвращайся.

| Что | Зачем | Проверить |
|-----|-------|-----------|
| [Node.js 20+](https://nodejs.org) | запускает всё | `node -v` → должно быть `v20.x` или выше |
| [pnpm](https://pnpm.io/installation) | менеджер пакетов | `pnpm -v` → должно быть `9.x` или выше |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | база данных и Redis | открой Docker Desktop, убедись что работает |
| [Git](https://git-scm.com) | клонировать репо | `git -v` |

> **Нет pnpm?** Установить одной командой: `npm install -g pnpm`

---

## Установка — шаг за шагом

### Шаг 1 — Скачай репозиторий

```bash
git clone https://github.com/makopyants/meatrecords.git
cd meatrecords
```

### Шаг 2 — Установи зависимости

```bash
pnpm install
```

Ждёшь ~1 минуту, качаются пакеты. В конце должно быть `Done`.

### Шаг 3 — Создай файл с настройками

```bash
cp .env.example .env
```

Теперь нужно сгенерировать секретный ключ для авторизации. Выполни:

```bash
openssl rand -base64 32
```

Скопируй результат и вставь в `.env` вместо `change-me-generate-with-openssl-rand-base64-32`:

```
AUTH_SECRET=сюда_вставить_ключ
```

Остальное можно не трогать — дефолтные значения работают локально.

### Шаг 4 — Свяжи конфиг с веб-приложением

```bash
ln -sf ../../.env apps/web/.env
```

Эта команда создаёт ссылку чтобы Next.js тоже видел тот же `.env`.

### Шаг 5 — Запусти базу данных и Redis

```bash
docker compose up -d
```

Docker скачает нужные образы (только в первый раз, ~200MB) и запустит:
- PostgreSQL на порту `5432`
- Redis на порту `6379`

Проверить что всё поднялось:

```bash
docker compose ps
```

В колонке `STATUS` должно быть `healthy` у обоих сервисов.

### Шаг 6 — Создай таблицы в базе данных

```bash
pnpm --filter @repo/web exec prisma migrate deploy
pnpm --filter @repo/web exec prisma generate
```

### Шаг 7 — Собери общие пакеты

```bash
pnpm --filter @repo/shared build
pnpm --filter @repo/ai-prompts build
```

### Шаг 8 — Создай тестового пользователя

```bash
pnpm db:seed
```

Создаст аккаунт:
- Email: `nrecordsmeat@gmail.com`
- Пароль: `password`

### Шаг 9 — Запусти приложение

Открой **два терминала**:

**Терминал 1** — веб-приложение:
```bash
pnpm --filter @repo/web dev
```

Подожди пока появится `✓ Ready` и открой http://localhost:3000

**Терминал 2** — AI-воркер (генерация обложек и контента):
```bash
pnpm --filter @repo/worker build && pnpm --filter @repo/worker dev
```

---

## Всё работает — что дальше?

1. Открой http://localhost:3000
2. Войди через `nrecordsmeat@gmail.com` / `password`
3. Создай артиста → заполни бренд-профиль (5 вопросов)
4. Создай релиз → загрузи аудиофайл
5. Нажми **«Запустить генерацию»**
6. Воркер сгенерирует 3 варианта обложки через Pollinations.ai (~2 мин)
7. Одобри или отклони каждый модуль → отправь на модерацию

---

## Что делать если что-то сломалось

**`pnpm: command not found`**
```bash
npm install -g pnpm
```

**`Cannot connect to Docker`**  
Открой Docker Desktop и дождись пока он запустится, потом повтори команду.

**`Error: DATABASE_URL`**  
Скорее всего забыл сделать симлинк на шаге 4:
```bash
ln -sf ../../.env apps/web/.env
```

**`Port 5432 is already in use`**  
У тебя уже запущен PostgreSQL. Останови его или измени порт в `docker-compose.yml` и `.env`.

**`Module not found: @repo/shared`**  
Не собраны общие пакеты. Повтори шаг 7.

---

## Структура проекта

```
apps/
  web/        — Next.js (сайт + API)
  worker/     — воркер для AI-задач
packages/
  shared/     — общие типы и схемы
  ai-prompts/ — шаблоны промптов для AI
prisma/       — схема и миграции БД
docker-compose.yml
```

## Переменные окружения

| Переменная | Обязательна | Описание |
|-----------|------------|---------|
| `DATABASE_URL` | да | строка подключения к PostgreSQL |
| `REDIS_URL` | да | строка подключения к Redis |
| `AUTH_SECRET` | да | секретный ключ для сессий |
| `OPENAI_API_KEY` | нет | для реальной генерации через DALL-E 3 |
| `COVER_MOCK` | нет | `true` = генерация через бесплатный Pollinations.ai |
| `R2_*` | нет | Cloudflare R2 для хранения файлов (без него — dev-режим) |
| `MODERATOR_EMAILS` | нет | email администраторов через запятую |

> Без `OPENAI_API_KEY` обложки генерируются бесплатно через [Pollinations.ai](https://pollinations.ai) (FLUX модель).
