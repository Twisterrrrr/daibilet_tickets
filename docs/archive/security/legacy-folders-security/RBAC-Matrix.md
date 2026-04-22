# RBAC Matrix — source of truth (admin + supplier)

> Обновлено **2026-03-24** (Step E). При расхождении с кодом приоритет у **репозитория**; этот файл — ориентир для guards, UI-gating и security-тестов.

## 1. Роли в Prisma

### 1.1 `AdminRole`

| Значение | Описание |
|----------|----------|
| `ADMIN` | Полный админ-доступ в рамках декораторов `@Roles`; **аналог «superuser» в продукте** (отдельного enum `SUPERUSER` нет). |
| `EDITOR` | Контент, каталог, операции, где явно разрешено `ADMIN` + `EDITOR`. |
| `VIEWER` | Read-only там, где явно перечислен `VIEWER` (или нет сужения — см. §3). |

### 1.2 `SupplierRole`

| Значение | Описание |
|----------|----------|
| `OWNER` | Полный контроль в рамках `operatorId`: настройки, юрлицо, приглашения, команда. |
| `MANAGER` | Операции с событиями/заказами сверх `CONTENT`, без OWNER-only зон. |
| `CONTENT` | Редактирование контента/событий; **не** финансовые/юр-зоны по политике UI и части API. |
| `ACCOUNTANT` | Отчёты/баланс/финдокументы (read-heavy); **без** контент-редактирования в UI-gating. |

**Примечание:** в Prisma **нет** `SupplierRole.VIEWER`. Read-only поставщика в модели данных сейчас выражается через сочетание ролей и эндпоинтов (часто `ACCOUNTANT` для финансов; операционные read без `@SupplierRoles` — см. код).

---

## 2. Матрица возможностей (обзор)

Легенда: **✓** ожидаемо разрешено, **—** нет / не целевой сценарий, **\* ** уточнять по конкретному маршруту в `Security-Test-Matrix.md`.

### 2.1 Admin

| Зона | VIEWER | EDITOR | ADMIN |
|------|--------|--------|-------|
| Read безопасные списки/детали (события, площадки, подборки, дашборд, consistency) | ✓ (где `@Roles` включает VIEWER или нет сужения) | ✓ | ✓ |
| Create/update контентных сущностей | — | ✓ | ✓ |
| Publish / массовые действия | — | частично | ✓ |
| Модерация / теги-админ | — | ✓ | ✓ |
| Финансы, сверка **mutations**, payouts | — | частично | ✓ |
| Support (тикеты, PII клиентов) | — | ✓ | ✓ |
| Ops: `GET /admin/ops/metrics`, очереди, dynamic-tags | — | — | ✓ |
| Аудит-лог админки (`/admin/audit`) | — | — | ✓ |

### 2.2 Supplier (логика + UI)

| Зона | ACCOUNTANT | CONTENT | MANAGER | OWNER |
|------|--------------|---------|---------|-------|
| Read дашборд / отчёты / баланс | ✓ | ✓ | ✓ | ✓ |
| События, вместимость, заказы, отзывы | — (UI скрыто) | ✓ | ✓ | ✓ |
| Юрпрофиль / реквизиты | — | — | — (API OWNER) | ✓ |
| Настройки оператора `PUT` | — | — | — | ✓ |
| Команда / приглашения | — | — | — | ✓ |
| Интеграции (чувствительно) | — (UI скрыто) | — (UI скрыто) | ✓* | ✓ |

---

## 3. Class-level `@Roles` / `@SupplierRoles` (политика)

1. **Не вешать `@Roles` на класс**, пока не проверены **все** методы контроллера: иначе read-only методы могут унаследовать слишком широкий или слишком узкий набор ролей.
2. Предпочтительно: явные `@Roles(...)` / `@SupplierRoles(...)` на **методах** для write и чувствительных read.
3. Если class-level уже есть: каждый новый метод обязан явно указать роли или сознательно наследовать политику класса (с пометкой в этом файле / в PR).
4. **VIEWER** в админке: доступ только там, где роль **явно** перечислена или отсутствует `@Roles` при отсутствии class-level (см. `RolesGuard`: пустой список → пускает любого с `user.role`).

---

## 4. Аудит контроллеров (сводка)

Все перечисленные **admin**-контроллеры используют `JwtAuthGuard` + `RolesGuard`, если не указано иначе.

| Область | Контроллер(ы) | Заметки |
|---------|-----------------|---------|
| Events | `admin-events.controller` | Большинство write — `ADMIN`/`EDITOR`; отдельные — только `ADMIN`. |
| Venues | `admin-venues.controller` | Read часто `VIEWER+`; mutate — `EDITOR+`; delete — `ADMIN`. |
| Suppliers | `admin-suppliers.controller` | Чувствительные PATCH/invite — `ADMIN` на методах. |
| Orders | `admin-orders.controller` | Часть — `ADMIN` only. |
| Finance / реестры | `admin-finance*`, `admin-payouts` | Преимущественно `ADMIN` / `EDITOR` по методам; payouts list — `ADMIN`. |
| Reconciliation | `admin-reconciliation.controller` | Class `VIEWER+`; retry/refund — `@Roles('ADMIN')` на методах. |
| Catalog / consistency | `admin-catalog-consistency.controller` | `GET consistency` — явно `ADMIN, EDITOR, VIEWER`. |
| Ops / metrics | `admin-ops.controller` | Все методы — `ADMIN`. |
| Diagnostics | `admin-reconciliation` `GET ops/diagnostics` | Class `VIEWER+`. |
| Support | `admin-support.controller` | **Только `ADMIN`, `EDITOR`** (тикеты содержат PII). |
| Moderation / reviews | `admin-moderation`, `admin-external-reviews` | По методам. |

**Supplier:** `supplier.controller.ts` — смесь `SupplierJwtGuard` только (доступ любой роли с membership) и связок с `SupplierRolesGuard` + `OperatorScopeGuard` на изменениях сущностей по `Event` / `Venue` / `EventOffer`.

---

## 5. Приглашения поставщика

- Токен: 32 байта hex; срок **7 дней** (`EXPIRY_DAYS` в `SupplierInvitationService`).
- Повторный `accept` при `acceptedAt` → `BadRequestException` (предсказуемо, без утечки «существовал ли токен» vs «принят» — для invalid token используется `NotFoundException`; это ок для публичного эндпоинта).
- Истёкший токен → `BadRequestException`.
- Email уже зарегистрирован → `ConflictException`.
- Accept в транзакции: создание `SupplierUser` + отметка приглашения.

---

## 6. Аудит (audit trail)

Модель `AuditLog`: `userId`, `action`, `entity`, `entityId`, `before`, `after`, `createdAt`.

Рекомендуемая семантика для отчётов/интеграций (без обязательного изменения схемы сейчас):

- `actorId` ↔ `userId`
- `timestamp` ↔ `createdAt`
- `actorRole` — в дорожной карте (JSON meta / отдельная колонка); **пока в Prisma нет отдельного поля роли**.

`AuditInterceptor` логирует успешные POST/PATCH/DELETE на ряде `/admin/*` контроллеров.

---

## 7. Ошибки 401 / 403 и `requestId`

- **401** — неаутентифицирован (`JwtAuthGuard` / supplier JWT).
- **403** — аутентифицирован, но `RolesGuard` / `SupplierRolesGuard` / `OperatorScopeGuard` отказали; тело через `AllExceptionsFilter` включает `requestId` (см. Step D).

Коды сообщений без лишних внутренних деталей: `FORBIDDEN_INSUFFICIENT_ROLE`, `FORBIDDEN_OPERATOR_SCOPE`.

---

## 8. UI gating (второй слой)

- **frontend-admin:** `src/lib/jwtRole.ts` — фильтрация навигации для `VIEWER` (`ADMIN_VIEWER_NAV_DENYLIST`).
- **frontend-supplier:** `src/lib/jwtRole.ts` — скрытие пунктов меню по роли (не замена backend).
- JWT для UI декодируется без проверки подписи; источник истины — сервер.

---

## 9. Ссылки

- `Security-Test-Matrix.md` — эндпоинты, роли, ожидаемые коды.
- `packages/backend/src/auth/roles.guard.ts`
- `packages/backend/src/supplier/supplier.guard.ts`
- `packages/backend/src/common/guards/operator-scope.guard.ts`
