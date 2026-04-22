# Foundation reset track (практика)

## Что это такое

**Reset track** — отдельная ветка + отдельная чистая БД, где мы можем начать каталог заново, **не рискуя mainline**.

Это отличается от “foundation (mainline)”:
- **mainline**: одна рабочая `packages/backend/prisma/schema.prisma` и текущая продуктовая модель
- **reset track**: новая БД, переносим только контентный слой (города/лендинги/подборки), остальное в БД пустое

## Что сохраняем при reset

- `cities`
- `landing_pages`
- `collections`
- (для работы SEO/навигации) `tags`, `seo_templates`, `regions`, `region_cities`
- (для главной) `promo_blocks`, `promo_collections`, `promo_collection_rules`

## Как запустить reset на новой БД

1) Создай **новую пустую** базу данных (например `daibilet_reset`).

2) Скопируй `.env.reset.example` → `.env.reset` и заполни:
- `SOURCE_DATABASE_URL` — откуда копируем города/лендинги/подборки
- `TARGET_DATABASE_URL` — новая чистая БД
- `RESET_ADMIN_EMAIL/PASSWORD` — initial admin для админки

3) Прогони миграции на TARGET:

```bash
# Важно: команды используют DATABASE_URL, поэтому запускай с подставленным TARGET_DATABASE_URL
DATABASE_URL="$TARGET_DATABASE_URL" pnpm --filter @daibilet/backend db:reset:migrate
```

4) Сгенерируй Prisma client (на всякий случай после смены ветки):

```bash
pnpm --filter @daibilet/backend db:reset:generate
```

5) Склонируй контент из SOURCE в TARGET:

```bash
SOURCE_DATABASE_URL="..." TARGET_DATABASE_URL="..." pnpm --filter @daibilet/backend db:reset:clone-content
```

6) Создай initial admin в TARGET:

```bash
TARGET_DATABASE_URL="..." RESET_ADMIN_EMAIL="..." RESET_ADMIN_PASSWORD="..." pnpm --filter @daibilet/backend db:reset:seed-admin
```

## Safety notes

- **Никогда** не указывай `TARGET_DATABASE_URL` на продовую БД.
- После переключения веток всегда делай `pnpm --filter @daibilet/backend db:generate` и при необходимости `Developer: Reload Window` (IDE может кэшировать типы Prisma).

