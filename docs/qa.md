# Вопросы по архитектуре Landings (QA)

> Цель: закрыть вопросы перед изменениями модели/CRUD/API/Admin UI/Public routing, чтобы не сломать текущие SEO‑маршруты и selection‑принцип.

## Решения (финальные, 2026‑04)

### 1) Роутинг и canonical

- **Global HUB** живёт в корне и является canonical:
  - `/river-cruises`, `/bus-tours`, `/salute-9-may`
- **City landing**:
  - `/cities/:citySlug/:topicSlug`
- **Запрещено**: `/landings/*` (ломает SEO).
- **Редиректы**: ❌ не делаем авто‑редирект `/<topicSlug>` → `/cities/...`; HUB всегда самостоятельный.
- **HUB ≠ CITY**:
  - HUB = навигация + SEO high‑level
  - CITY = transactional SEO (основной трафик)

### 2) Family / модель

- Отдельной сущности family **нет**.
- Используем:
  - `LandingPage.topicKey: string` (например `river-cruises`)
  - `LandingPage.cityId?: string`
  - `LandingPage.parentId?: string` (HUB → CITY)
- Правила:
  - HUB: `cityId = null`, `parentId = null`
  - CITY: `cityId != null`, `parentId = HUB.id`
  - **M:N запрещён**, один CITY landing = один parent.

### 3) Источник каталога (MVP)

- MVP: **оба** режима, `PRIMARY_COLLECTION` приоритет, `AUTO_QUERY` fallback.
- `queryConfig` — только по жёсткому контракту (❌ без произвольных JSON):

```ts
type LandingQueryConfig = {
  subcategoryIds?: string[]
  cityId?: string
  limit?: number
  sort?: 'POPULAR' | 'SOONEST' | 'PRICE'
}
```

- Storefront-safe правило в одном месте: `CatalogPolicyService.isStorefrontSafe(event)`:
  - `event.isActive === true`
  - `event.publishStatus === 'PUBLISHED'`
  - `hasActiveOffer === true`

### 4) Публикация / anti-thin

- Publish: `resolvedEventsCount > 0`
- Indexable: `resolvedEventsCount >= 3`
- Автоматизация: если `< 3` → `isIndexable = false`, **manual override разрешён**.

### 5) Связи

- Article ↔ Landing: **one-way**:
  - `Landing.relatedArticleIds: string[]`
  - приоритизация: `primaryArticleId?: string`, `secondaryArticleIds?: string[]`

### 6) Admin UX / preview

- Отдельный preview endpoint **не нужен**.
- Используем public read‑path с `preview=true`.
- Create child from parent — **не MVP**, позже.

---

# Вопросы по архитектуре Taxonomy (Subcategories) + SEO Audit (QA)

> Цель: закрыть вопросы перед внедрением SEO Audit как операционного read‑слоя, тесно связанного с таксономией подкатегорий.

## 1) Scope и “что считаем качеством”

### Решения (финальные, 2026‑04)

- **Publish gate (BLOCKER / ERROR)**: `NO_LOCATION`, `NO_ACTIVE_OFFER`, `INVALID_STATE`
- **SEO Audit (soft)**: `NO_PHOTO`, `WEAK_DESC`, `NO_SUBCATEGORY`, `THIN_CONTENT`
- **Раздельное состояние**: `canPublish=true` и `isIndexable=false` обязательно

- Где проходит граница между **publish‑gate** (жёсткая блокировка публикации) и **SEO Audit** (операционное качество)? Какие issue должны быть `ERROR` и блокировать активацию/индексацию?
- Нужна ли отдельная политика “можно публиковать, но нельзя индексировать” (thin pages / слабый контент), и где она хранится (Landing.isIndexable, derived rule, manual override)?

## 2) Snapshot vs on-the-fly

### Решения (финальные, 2026‑04)

- MVP: on-the-fly + Redis cache (без snapshot).
- TTL: 60–120s
- Key: `seo:audit:<entityType>:<filters>`

- Какой ожидаемый порядок количества сущностей (events/venues/articles/collections/landings/subcategories) и какие целевые SLO для `/admin/seo-audit/*`?
- Нужен ли **snapshot read‑model** уже на MVP: генерация по расписанию (cron/BullMQ) или инвалидация по событиям (upsert контента/публикация/изменение связей)?
- Какая стратегия кэширования: Redis TTL + `generatedAt`, или отдельная таблица snapshot’ов?

## 3) Унификация issue codes и severity

### Решения (финальные, 2026‑04)

- `IssueCode` = жёсткий контракт (enum/union), без динамических строк:
  - `NO_PHOTO` | `NO_PRICE` | `NO_SESSIONS` | `NO_SUBCATEGORY` | `THIN_CONTENT`
- `Severity`: `ERROR` (blocker) | `WARN` | `INFO`

- Должен ли список `issueCode` быть “контрактом” (enum/union) с явной версионизацией, или допускаются динамические коды (опасно для UI/фильтров)?
- Как согласовывать `severity` vs `group` (CONTENT/SEO/STRUCTURE/CATALOG/LINKING/PUBLICATION): кто владелец таксономии кодов и как поддерживать обратную совместимость?

## 4) Taxonomy rules (completeness + misuse)

### Решения (финальные, 2026‑04)

- Subcategory обязательна для Event.
- Limit: max = 3.
- Inactive subcategory in use: WARN (не блокирует).

- Является ли subcategory обязательной для публикации `Event`/`Venue`? Если “обязательной” только для части типов — где хранится правило (policy by category/type)?
- Считаем ли ошибкой “inactive subcategory still in use”, и что тогда должен делать UI: запрещать сохранение или только подсвечивать?
- Ограничение “слишком много subcategories”: какое число является допустимым и зависит ли оно от типа (UNIVERSAL vs EVENT_ONLY)?

## 5) Admin UX: триаж и переходы

### Решения (финальные, 2026‑04)

- Deep links обязательны:
  - Audit → entity
  - entity → audit (filtered)
- Health badge показываем в списках, не только в деталке.

- Какие deep‑links обязательны:
  - из SEO Audit issue → в сущность (admin‑деталка),
  - из сущности → “посмотреть issues” (фильтрованный список)?
- Нужно ли показывать “health badge” в списках (Events/Venues/Landings) или только в деталке?

## 6) Public URL и targetUrl в audit

### Решения (финальные, 2026‑04)

- Один helper: `buildPublicUrl(entity)`
- Примеры: Event `/events/:slug`, Venue `/venues/:slug`, Landing `/cities/:city/:slug`, Hub `/:slug`

- Как строить `targetUrl` для разных сущностей (event/venue/article/collection/landing/promo/subcategory-landing) с учётом city‑routing и каноникализации?
- Нужен ли единый helper на backend для построения targetUrl (чтобы UI не дублировал routing rules)?

---

# Вопросы по архитектуре Settings (Admin V3) (QA)

> Цель: закрыть вопросы перед внедрением Settings как “управления системой” (RBAC, интеграции, payments, notifications, SEO, feature flags, system settings) без ломки существующих контрактов и с учётом безопасности.

### Статус реализации (14.04.2026)

**Сделано в коде:** модель `AppSetting` и ключи `seo` / `system`; `GET/PATCH /api/v1/admin/settings/app/seo|system` (merge PATCH; `baseUrl` в SEO не принимается); глобальные feature flags (`GET/PATCH /admin/feature-flags`) и таблица на Settings; `GET/PATCH /admin/users`; в Prisma — `OWNER`, поля сброса пароля у `AdminUser`; `POST /auth/admin/forgot-password` и `reset-password` + письмо; anti-lockout последнего активного ADMIN/OWNER; иерархия ролей в `RolesGuard`; UI: формы SEO/System, `/forgot-password`, `/reset-password`. Детали и бэклог: `docs/Tasktracker.md` (сводка Settings).

**Осталось:** создание `AdminUser` из UI; роль `MANAGER` в `AdminRole` (в доке — в enum пока нет); интеграции / платежи / уведомления в Settings; явные ответы в OpenAPI; audit log изменений; согласование namespace `/admin-v3/settings/*` с фактическим роутингом админки (`settings-scope-and-sections`); на деплое — миграция и `ADMIN_APP_URL` для ссылок в письмах.

## 1) Границы и роутинг

### Решения (финальные, 2026‑04)

- Namespace: `/admin-v3/settings/*`
- MVP разделы (обязательно): Users / Roles, Feature Flags, SEO, System
- Остальное — под feature flags.

- Какой **канонический namespace** для Settings в Admin V3: строго `/admin-v3/settings/*` (внутренний sidebar) или отдельные top-level страницы?
- Какие разделы должны быть доступны на MVP обязательно (Users/Roles, Feature Flags, SEO, System), а какие можно спрятать за feature flag?

## 2) RBAC: роли vs permissions

### Решения (финальные, 2026‑04)

- MVP: только role-based.
- Роли: `OWNER`, `ADMIN`, `MANAGER`.
- `OWNER` only: admin users, payments, integrations, rotate secrets.

- Достаточно ли **role-based** модели `AdminRole` на MVP без granular permissions?
- Какие действия считаем “критичными” и должны быть только для `OWNER` (например: управление admin users, payments, integrations secrets)?
- Нужна ли отдельная роль “FINANCE” или “TECH” в будущем, или расширение пойдёт через permissions?

## 3) AdminUser: жизненный цикл и безопасность

### Решения (финальные, 2026‑04)

- `AdminUser` — отдельная модель от buyer.
- Reset password: magic link.
- 2FA: не сейчас.
- Anti-lockout: нельзя деактивировать последнего `OWNER`.

- Какой flow логина/сессий для `AdminUser` сейчас в проекте (общий user vs отдельная модель)? Нужно ли разделять учётки админки и покупателей жёстко?
- Политика паролей/сброса:
  - reset-password генерирует временный пароль, magic link, или принудительный reset при следующем логине?
  - требуется ли 2FA на горизонте (как follow-up), и где это будет жить?
- Как обрабатывать “деактивировал сам себя” для OWNER/ADMIN (защита от lockout)?

## 4) Хранение настроек: KV (`AppSetting`) vs отдельные таблицы

### Решения (финальные, 2026‑04)

- KV (`AppSetting`) только для:
  - SEO (кроме `baseUrl`)
  - system flags/settings
- Отдельные таблицы:
  - `FeatureFlag`
  - `Integration`

- Какие настройки обязаны жить в KV, а какие лучше держать отдельными таблицами (например, `FeatureFlag`, `Integration`)?
- Нужны ли versioning/migrations для `AppSetting.value` (schema evolution), или MVP допускает soft‑валидацию и safe defaults?
- Требуется ли кэширование настроек (Redis TTL + invalidation) или можно читать из БД на запрос с агрегацией?

## 5) Sensitive data: маскирование и обновление секретов

### Решения (финальные, 2026‑04)

- Хранение: encrypted JSON.
- API: `{ hasSecret: true, last4: 'abcd' }`.
- Rotate secrets: отдельный endpoint (обязательно).

- Где хранить “секреты” интеграций/платежей:
  - в той же `config: Json` (с encryption-at-rest) или отдельные поля/таблица?
  - нужна ли интеграция с secrets manager (явно “не сейчас”, но важно зафиксировать границы)?
- Какой контракт API для masked значений:
  - возвращать только `hasSecret: true` и `last4`?
  - или “maskedString” вида `****abcd`?
- Нужна ли операция “rotate secret” как отдельный endpoint/flow?

## 6) Feature Flags: область действия и consistency

### Решения (финальные, 2026‑04)

- Feature flags работают и в UI, и в backend.
- Cache: TTL допустим.

- Feature flags должны управлять:
  - только UI (скрытие разделов) или также backend-поведением (гейты на endpoints)?
- Нужны ли окруженческие overrides (staging/prod) и как их хранить?
- Какой SLA на обновление флагов: мгновенно (без кэша) или допускаем задержку (кэш TTL)?

## 7) SEO settings: baseUrl и canonical

### Решения (финальные, 2026‑04)

- `baseUrl` — из ENV.
- Из админки не управляется.

- Откуда берётся `baseUrl` сегодня (env, конфиг, хардкод)? Готовы ли мы сделать его управляемым из Settings без риска сломать canonical/sitemap?
- Как разделить “боевые” значения и значения для preview/staging (чтобы админ случайно не поменял baseUrl в prod)?

## 8) Notifications: шаблоны и безопасность

### Решения (финальные, 2026‑04)

- Шаблоны: в коде (Git).
- В БД: только параметры.

- Где должны жить шаблоны:
  - как JSON в БД,
  - или как файлы/код (Git) + только параметры в БД?
- Нужна ли система переменных/валидации placeholders, чтобы избежать runtime ошибок в прод‑письмах?

## 9) Payments settings: режимы и контракт

### Решения (финальные, 2026‑04)

- MVP: `provider`, `enabled`, `mode (test/live)`, `publicKey`, `secretKey`.
- Валидация: нельзя включить без ключей; test/live должны совпадать.

- Какой минимальный набор полей для платежных настроек на MVP (provider, enabled, mode, keys)?
- Нужна ли валидация “test/live ключи соответствуют режиму” и защита от включения платежей без ключей?

