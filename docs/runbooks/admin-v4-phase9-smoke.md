# Admin V4 — smoke перед релизом (фаза 9)

Краткий чеклист после стабилизации контрактов фазы 8. Не заменяет полный регресс; цель — поймать «пустой экран / 500 / сломанный роут».

## Порты и dev (локально)

| Сервис | По умолчанию | Примечание |
|--------|----------------|------------|
| Nest API | `4000` (`PORT`) | `pnpm dev:backend` из корня |
| Admin V4 (Vite) | `5176` | `vite.config.ts` → proxy `/api/v1` → `127.0.0.1:4000` |
| Публичный health | `GET /api/v1/health` | Без JWT; тело `{ status: 'ok' \| 'degraded', db, redis }` |

## Автоматизация (без JWT)

Из корня репозитория при **запущенном** backend:

```bash
pnpm smoke:health
```

**Фаза 9 (расширенный автосмоук):** после `smoke:health` проверяет, что ключевые `GET /admin/*` без токена отвечают **401/403** (маршрут жив, нет 5xx). Опционально с JWT — проверка **200** и формы `items[]`.

```bash
pnpm smoke:phase9
# с полной проверкой списков (нужен валидный access-токен админа/редактора):
# Windows PowerShell:
#   $env:SMOKE_ADMIN_BEARER="eyJ..."; pnpm smoke:phase9
# macOS/Linux:
#   SMOKE_ADMIN_BEARER="eyJ..." pnpm smoke:phase9
```

Переменные: `SMOKE_API_BASE_URL` (как для health), `SMOKE_ADMIN_BEARER` (опционально, сырое значение **без** префикса `Bearer `).

Другой origin (staging / прод — только если `GET …/health` доступен снаружи без VPN):

```bash
# Windows (cmd)
set SMOKE_API_BASE_URL=https://staging.example.com&& pnpm smoke:health

# macOS / Linux
SMOKE_API_BASE_URL=https://staging.example.com pnpm smoke:health
```

В **CI** на каждый PR/push в `main`: `typecheck` включает `packages/frontend-admin-v4` (`tsc --noEmit`); полный HTTP-smoke к админ-эндпоинтам в CI без поднятого API не гоняется.

## Деплой

- Staging: workflow [`.github/workflows/staging-deploy.yml`](../../.github/workflows/staging-deploy.yml) (ветка `staging` / `workflow_dispatch`).
- Production: [`.github/workflows/prod-deploy.yml`](../../.github/workflows/prod-deploy.yml).

После деплоя на стенде: `pnpm --filter @daibilet/backend db:migrate:prod` (или эквивалент в `deploy.sh`) — см. ниже «Миграции».

## Окружение

- Backend `GET /api/v1/health` — 200, в теле допустим `degraded`, если Redis недоступен, но процесс жив.
- Авторизация админа для ручных шагов ниже: роль `ADMIN` / `EDITOR` / `VIEWER` по сценарию (Bearer).

## Маршруты SPA (`/admin-v4`)

1. **События** — список загружается, пагинация, фильтры `needsAttention` / `readyToPublish` / `purchaseReadiness` не дают 400.
2. **Событие — деталка** — вкладки, блок `readiness`, блок `importMeta` (если есть импорт).
3. **Внешние заказы** — список, пагинация, фильтры `hasRefundRequests` / `refundPending`.
4. **Лендинги** — список, колонка «На сайте» (при заданном `PUBLIC_STOREFRONT_ORIGIN` или `canonicalUrl`).
5. **Таксономия** — страница тегов/подкатегорий без необработанной ошибки.

## API (выборочно)

- `GET /api/v1/admin/events?page=1&limit=10` — 200, поля `needsAttention`, `readyToPublish`.
- `GET /api/v1/admin/events?needsAttention=true` — 200 (не комбинировать с `readyToPublish=true`).
- `GET /api/v1/admin/external-orders?page=1&limit=10` — 200.
- `GET /api/v1/admin/external-orders?search=test&page=1` — 200 (может быть `items: []`).
- `GET /api/v1/admin/landings?lite=1&page=1` — 200, при наличии базы — `storefrontPublicUrl` на строках.

## Миграции

- На стенде: `pnpm --filter @daibilet/backend exec prisma migrate deploy` (или скрипт проекта) — без pending error.

## Пустые списки

- Запросы с фильтром, не совпадающим ни с одной строкой, возвращают **200** и `items: []`, не 500.

## Фазы 10–11 (performance + freeze) — доп. чеклист

**Фаза 10 (измеримо, без новых зависимостей):**

- События / лендинги: в URL есть `page` и фильтры; список событий уходит с `lite=1`, лендинги — с `lite=1`.
- Внешние заказы: пагинация согласована с поиском — `GET /api/v1/admin/external-orders?search=…` фильтрует на сервере (`externalOrderId`, при полном UUID — `id`); после ввода в поле поиска страница сбрасывается (query `q` + сброс `page`).

**Фаза 11 (handoff / стабилизация):**

- Продуктовый контракт и «второй темп»: [`docs/product/admin-v4-imported-sales.md`](../product/admin-v4-imported-sales.md), gap-таблицы — [`docs/reports/admin-v4-dto-gaps.md`](../reports/admin-v4-dto-gaps.md) §MVP freeze.
- Multi-origin: на стенде проверить колонку «На сайте» у лендингов (`storefrontPublicUrl` / `PUBLIC_STOREFRONT_ORIGIN` / `canonicalUrl`).
