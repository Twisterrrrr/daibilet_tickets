# Backend и техдолг — Задачи с DoD и порядком выполнения

> Очередность: A5 → B2 → A3 → A4 → B1 → A1-Pino → B3 → B4 → A2 → C1 → C2
>
> Примечание: A1 (requestId + PII masking) уже выполнён в Production Hardening. A1-Pino — Structured JSON logs (pino).

---

## A5 (HIGH) JwtPayload вместо req: any — ✅ Выполнено (22.02.2026)

**Goal:** типизировать req.user и payload для admin/supplier/user, убрать req: any.

### Steps

1. Создать типы: `AdminAuthUser`, `SupplierAuthUser`, `UserAuthUser`, `PartnerAuthUser`, `RequestWithUser<T>`
2. Расширить Express Request: `src/types/express.d.ts`
3. В auth strategy: добавлен `type: 'admin'` в JwtStrategy
4. Пройтись по контроллерам: заменён `req: any` на `RequestWithUser<...>` или `ExpressRequest & { user: AdminAuthUser }`
5. `@AuthUser()` decorator: `src/auth/auth-user.decorator.ts`

### DoD

- [x] Нет req: any в контроллерах/guards
- [x] req.user строго типизирован
- [x] Сборка TS проходит

### Smoke

- admin/settings, supplier/events — req.user.role / req.user.operatorId без кастов

---

## B2 (MED) RBAC Supplier (guards/decorators/operatorId boundary) — ✅ Выполнено (22.02.2026)

**Goal:** запретить supplier доступ к чужим данным по operatorId, плюс роли.

### Steps

1. Декораторы: `@SupplierRoles(...)` — уже был
2. Guard: `SupplierRolesGuard` проверяет `user.type === 'supplier'`, роли
3. Boundary: все supplier CRUD используют `req.user.operatorId` в where; DTO без operatorId
4. Типизация: supplier-settings, supplier-events, reports, dashboard — RequestWithUser<SupplierAuthUser>

### DoD

- [x] Ни один supplier endpoint не даёт прочитать/изменить чужой operatorId
- [ ] e2e покрытие — отложено

---

## A3 (HIGH) Типизация tc-sync.service.ts — ✅ Выполнено (22.02.2026)

**TcEvent вместо any[]**

**Goal:** убрать any[] и «скрытые» поля TC, типизировать вход, маппинг и результат.

### Steps

1. Найти все any/any[] в tc-sync.service.ts
2. Ввести типы: TcEvent, TcSession, TcPrice, TcWidgetRef (минимально нужные поля)
3. Вынести mapping в чистые функции: `mapTcEventToDomain(tc: TcEvent): DomainEventCreateInput`, `mapTcSession(...)`
4. Жёстко типизировать результаты API/gRPC клиента
5. Удалить as any, заменить на: unknown + guards (`isTcEvent`) или zod schema
6. Добавить тесты на 2–3 фикстуры

### DoD

- [x] В tc-sync.service.ts нет any[] и as any (REST v1 типизирован)
- [x] Сборка TS без ошибок
- [ ] Тесты на маппинг — отложено

### Smoke

- incremental sync проходит
- full sync не падает на «неожиданном поле»

---

## A4 (HIGH) Proto-generated types для gRPC — 🔶 Частично (22.02.2026)

**Goal:** убрать ручные типы там, где есть .proto, использовать генерируемые типы/клиенты.

### Steps

1. Проверить наличие .proto в репо (packages/**/proto или vendor)
2. Выбрать генератор: buf + connect-es / grpc-tools / ts-proto (предпочтительно buf)
3. Добавить скрипт: `pnpm gen:proto`
4. Папка вывода: `packages/shared/src/generated/tc/**`
5. Подключить generated types в tc-клиент / tc-sync.service.ts
6. Решить вопрос git: коммитить generated или генерить в CI перед build

### DoD

- [x] `pnpm gen:proto` добавлен (требует установки protoc)
- [ ] tc-sync.service.ts использует generated типы — ручные типы в tc-grpc.service
- [ ] protoc в CI/Docker — TODO

### Smoke

- удалить generated/ → `pnpm gen:proto` восстановил → build ok

---

## B1 (MED) where: any → Prisma typed where builders — 🔶 Частично (22.02.2026)

**Goal:** типизировать Prisma where и builder-функции.

### Steps

1. Найти все `where: any` и Prisma вызовы с кастами
2. Для каждой сущности: `buildEventWhere(filters): Prisma.EventWhereInput`
3. Использовать `satisfies Prisma.EventWhereInput` где удобно
4. Добавить unit tests на 5–10 комбинаций фильтров

### DoD

- [x] common/where-builders.ts: buildEventWhere, buildArticleWhere, buildUpsellWhere
- [x] admin-events, admin-articles, pricing — используют билдеры
- [ ] Остальные where: any — TODO

---

## A1-Pino (HIGH) Structured JSON logs — ✅ Уже выполнено

**Goal:** перейти на структурированные JSON-логи (pino) и подготовить доставку в агрегатор.

### Steps

1. Добавить зависимости: pino, pino-http (если нужно), pino-pretty (dev-only)
2. В main.ts/bootstrap: включить pino logger для Nest (nestjs-pino или adapter), request logging с requestId
3. Middleware/interceptor: генерировать/прокидывать x-request-id, писать в контекст логов
4. PII redact: authorization, cookie, email, phone, paymentToken, card, etc.
5. ENV: LOG_LEVEL, LOG_PRETTY (dev), LOG_REDACT=true
6. Docker compose: логи в stdout; опционально пример promtail/vector конфиг

### DoD

- [x] nestjs-pino, logger.config.ts: PII redact, genReqId, pino-pretty (dev)

### Smoke

- дернуть /api/v1/health → один structured entry
- искусственно 500 → error log с requestId, без токенов

---

## B3 (MED) Redis-кэш: списки/детали/сессии (TTL)

**Goal:** ускорить каталог/страницы, разгрузить БД.

### Steps

1. Определить ключи: `catalog:list:{city}:{filtersHash}`, `catalog:detail:{id}`, `tc:sessions:{eventId}`
2. TTL: list 60–180s, detail 5–15m, sessions 30–120s
3. Инвалидация: при sync/обновлении → delete key(s), использовать CacheInvalidationMatrix
4. Обёртка `CacheService.getOrSet(key, ttl, fn)`

### DoD

- [ ] Кеш уменьшает запросы к БД на list/detail
- [ ] Корректная инвалидация на update/sync
- [ ] Метрики/логи cache hit/miss (хотя бы debug)

### Smoke

- 2 запроса подряд к одному endpoint → второй быстрее + cache hit

---

## B4 (MED) Nginx location /uploads/ — ✅ Уже выполнено

**Goal:** отдавать uploads через nginx, без Node.

### Steps

1. Добавить volume mapping uploads в docker
2. В nginx: `location /uploads/ { alias /path/to/uploads/; }`, запрет листинга, корректные headers
3. nginx -t в контейнере

### DoD

- [x] nginx/default.conf: location /uploads/ { alias /var/uploads/; }
- [x] autoindex off, Cache-Control

### Smoke

- открыть реальный файл /uploads/...jpg в браузере

---

## A2 (HIGH) Email-шаблоны: order-confirmed, order-completed — ✅ Уже выполнено

**Goal:** email templates + отправка (SMTP) при смене статуса заказа.

### Steps

1. Механизм шаблонов: mjml→HTML или handlebars/ejs + инлайн CSS
2. Создать: `order-confirmed.(mjml|hbs)`, `order-completed.(mjml|hbs)`, layout/partials
3. EmailService.sendOrderConfirmed(orderDto), sendOrderCompleted(orderDto)
4. SMTP config: SMTP_HOST/PORT/USER/PASS/FROM_NAME/FROM_EMAIL; fail-fast в prod если не задан
5. Триггеры в fulfill-package / обработчике статуса
6. EMAIL_DRY_RUN=true → логирует payload вместо отправки

### DoD

- [x] order-confirmed.hbs, order-completed.hbs — MailService.sendOrderConfirmed, sendOrderCompleted
- [x] admin-checkout, fulfillment processor триггерят отправку

### Smoke

- dev EMAIL_DRY_RUN=true → при смене статуса пишет «would send»
- staging: отправить письмо на свой email

---

## C1 (LOW) Убрать as any в бэкенде (~31 место)

**Goal:** постепенно уменьшать «дырки» типизации.

### Steps

1. `grep "as any"` по backend
2. Заменить на unknown + guard / правильный тип
3. Если сложно — TODO + локальная функция-адаптер

### DoD

- [ ] -X мест as any (зафиксировать цель, например -10)
- [ ] Без изменения поведения

---

## C2 (LOW) Уменьшить frontend any (api.ts, DTO) 100+

**Goal:** типизировать ответы API и DTO.

### Steps

1. Типизировать `fetchApi<T>()`
2. Вынести DTO в packages/shared
3. Подключить zod для runtime-валидации (опционально, фазами)

### DoD

- [ ] api.ts не возвращает any
- [ ] Минимум 10 endpoint ответов типизированы
