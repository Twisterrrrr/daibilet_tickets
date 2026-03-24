# Security Test Matrix — ожидаемые ответы по ролям

> 2026-03-24. База для ручных / автоматических проверок. **401** = нет/битый JWT, **403** = недостаточно прав.

## Admin API (`/api/v1`)

| Endpoint / действие | Разрешено | Запрещено (ожид.) |
|---------------------|-----------|-------------------|
| `GET /admin/catalog/consistency` | ADMIN, EDITOR, VIEWER | 401 без JWT |
| `GET /admin/ops/metrics` | ADMIN | EDITOR/VIEWER → 403 |
| `GET /admin/ops/diagnostics` | ADMIN, EDITOR, VIEWER | 401 |
| `GET /admin/support/tickets` | ADMIN, EDITOR | VIEWER → 403 |
| `GET /admin/support/tickets/:id` | ADMIN, EDITOR | VIEWER → 403 |
| `PATCH /admin/support/tickets/:id` | ADMIN, EDITOR | VIEWER → 403 |
| `POST /admin/reconciliation/.../retry` (и др. mutate) | ADMIN | EDITOR/VIEWER → 403 |
| `GET /admin/dashboard/...` | По `@Roles` класса (VIEWER+) | 401 |

## Supplier API (`/api/v1/supplier/...`)

| Endpoint / действие | Разрешено | Запрещено (ожид.) |
|---------------------|-----------|-------------------|
| `GET /supplier/settings` | Любая роль с JWT | 401 |
| `PUT /supplier/settings` | OWNER | иные → 403 |
| `GET /supplier/invitations` | OWNER | иные → 403 |
| `GET /supplier/profile/legal` | OWNER | иные → 403 |
| `GET /supplier/orders` | Любая роль (фильтр `operatorId` в where) — **риск**: операционные write без `@SupplierRoles` | 401 |
| `PATCH/PATCH scoped event` + `OperatorScopeGuard` | Чужой `operatorId` на сущности | 403 `FORBIDDEN_OPERATOR_SCOPE` |

## Приглашения (публично)

| Сценарий | Ожидание |
|----------|----------|
| Невалидный token | 404 `NotFoundException` |
| Истёкший | 400 |
| Уже принято | 400 |
| Email занят | 409 |
| Успешный accept | 200 + токены |

## Автотесты (репозиторий)

- `packages/backend/src/auth/__tests__/roles.guard.spec.ts`
- `packages/backend/src/auth/__tests__/roles-metadata-merge.spec.ts`
- `packages/backend/src/supplier/__tests__/supplier.guard.spec.ts`
- `packages/backend/src/supplier/__tests__/supplier-rbac.service.spec.ts`
- `packages/backend/src/supplier/__tests__/supplier-invitation.service.spec.ts`
- `packages/backend/src/common/guards/__tests__/operator-scope.assert.spec.ts`
