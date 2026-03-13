# Аудит текущего состояния: модуль отзывов MVP

> 11.03.2026 — этап 0, до реализации продвинутого модуля отзывов (disputes, supplier response).

---

## 1. Существующие Prisma-модели

| Модель | Статус | Ключевые поля |
|--------|--------|---------------|
| **Review** | ✅ Есть | eventId, venueId, operatorId, rating, text, authorName, authorEmail, isVerified, status (PENDING_EMAIL, PENDING, APPROVED, REJECTED), adminComment |
| **ReviewPhoto** | ✅ Есть | reviewId, url, thumbUrl, filename, sortOrder |
| **ReviewVote** | ✅ Есть | reviewId, ipHash, isHelpful |
| **ExternalReview** | ✅ Есть | eventId, source, authorName, rating, text (импорт из Яндекс/2GIS и т.д.) |
| **ReviewRequest** | ✅ Есть | email, eventId, token (post-purchase flow) |
| **ReviewSupplierResponse** | ❌ Нет | — |
| **ReviewDispute** | ❌ Нет | — |
| **ReviewDisputeEvidence** | ❌ Нет | — |
| **ReviewActionLog** | ❌ Нет | — |

### Review — недостающие поля для MVP

- `supplierId` (snapshot при создании) — nullable, для связи с поставщиком события
- `publishedAt` — DateTime? (когда одобрен)
- `verificationType` — enum (PURCHASE_VERIFIED, EMAIL_VERIFIED, UNVERIFIED) или оставить `isVerified`
- `status` — добавить HIDDEN (сейчас только PENDING_EMAIL, PENDING, APPROVED, REJECTED)

*Примечание: `isVerified` уже покрывает верификацию; можно не добавлять verificationType в MVP и оставить isVerified.*

---

## 2. Event / source / ownership

| Поле | Значение | Смысл |
|------|----------|-------|
| `Event.source` | TC | Ticketscloud (импорт) |
| | TEPLOHOD | teplohod.info (импорт) |
| | MANUAL | Ручной ввод / supplier / partner API |
| `Event.supplierId` | UUID? | Оператор-поставщик (Operator) |
| `Event.operatorId` | UUID? | Оператор события |
| `Event.createdByType` | ADMIN, SUPPLIER, IMPORT | Кто создал |

**Логика capability:**
- TC, TEPLOHOD → отзывы **запрещены** (импортные агрегаторные события)
- MANUAL + (supplierId или operatorId) → отзывы **разрешены**
- Venues: аналогично по operatorId (MVP фокус на events)

---

## 3. Существующие API и endpoints

### Public (catalog)
- `POST /reviews` — создание отзыва (без проверки source)
- `GET /events/:slug/reviews` — одобренные отзывы события
- `GET /reviews/verify?token=...` — подтверждение email
- `POST /reviews/:id/photos` — загрузка фото
- `POST /reviews/:id/vote` — голос за полезность
- `GET /reviews/request-info?token=...` — pre-filled форма

### Admin
- `GET /admin/reviews` — список (status, eventId)
- `PATCH /admin/reviews/:id/approve`
- `PATCH /admin/reviews/:id/reject`
- `DELETE /admin/reviews/:id`

### Supplier
- **Нет** endpoints для отзывов.

---

## 4. ReviewService — текущая логика

- `create()` — проверяет event/venue exists, дубликат email, voucher/reviewRequest верификацию. **Не проверяет** Event.source.
- `getByEventSlug()` — возвращает APPROVED отзывы + externalReviews. **Не возвращает** dispute banner, supplier response.
- `adminModerate(approve/reject)` — переводит статус. Нет hide.
- `adminDelete()` — удаляет физически.

---

## 5. Фронтенд

| Компонент | Файл | Функция |
|-----------|------|---------|
| EventPageView | `components/events/EventPageView.tsx` | Карточка события, `<ReviewSection />` |
| ReviewSection | `components/ui/ReviewSection.tsx` | Список отзывов + форма. **Всегда** показывает форму, если eventId/venueId |
| ReviewsListPage | `frontend-admin/.../ReviewsList.tsx` | Модерация (вкладки PENDING, APPROVED, REJECTED) |
| Supplier | Нет раздела «Отзывы» | — |

API `getEventBySlug` возвращает event с `source`, `supplierId`, `operatorId` — можно использовать для capability на фронте.

---

## 6. File storage

- `UploadService` — `processAndSave()` для изображений (JPEG/PNG/WebP, 5MB, Sharp → WebP)
- `StorageProvider` — save, delete, getUrl
- Для dispute evidence: jpg/png/pdf, 25MB, 5 файлов — нужен отдельный flow (без Sharp для PDF)

---

## 7. Где встроить capability check

1. **Backend** — `ReviewService.create()`: перед созданием отзыва по eventId — загрузить Event, проверить `canAcceptReviews(event)`.
2. **Backend** — GET event detail: добавить поле `reviewCapability: 'ENABLED' | 'DISABLED'` в ответ.
3. **Frontend** — ReviewSection: не показывать форму, если `reviewCapability === 'DISABLED'`; показывать заглушку при необходимости.
4. **Supplier** — показывать инструменты (ответ/оспаривание) только для owned events с reviewCapability=ENABLED.

---

## 8. Прогресс реализации (11.03.2026)

## Выполнено

### Этап 1 — Prisma schema
- Добавлен enum `ReviewStatus.HIDDEN`
- Добавлены enums: `ReviewSupplierResponseStatus`, `ReviewDisputeStatus`, `ReviewDisputeReasonCode`
- Модели: `ReviewSupplierResponse`, `ReviewDispute`, `ReviewDisputeEvidence`, `ReviewActionLog`
- Review: `supplierId`, `publishedAt`, связи supplierResponse, disputes, actionLogs
- Миграция: `20260311180000_add_review_disputes_module/migration.sql`
- **Команда:** `npx prisma migrate dev` (когда БД доступна)

### Этап 2 — Domain
- `ReviewCapabilityService`: `canAcceptReviews()`, `isImportedAggregatorEvent()`, `requiresSupplierResponse()`
- Логика: TC/TEPLOHOD → отзывы запрещены; MANUAL + owner → разрешены

### Этап 3 — Backend Public ✅
- Capability guard в `ReviewService.create()` — отказ с 403 для TC/TEPLOHOD
- Поле `reviewCapability: 'ENABLED' | 'DISABLED'` в `getEventBySlug`
- Snapshot `supplierId` при создании отзыва
- `publishedAt` при admin approve
- В `getByEventSlug` и `getByVenueSlug`: `supplierResponse` (approved), `hasActiveDispute`
- Frontend: плашка «Оспаривается», блок «Ответ организатора»

### Этап 4 — Backend Supplier ✅
- `SupplierReviewsService`: list, getOne, upsertResponse, submitResponse, accept, createDispute, addEvidence, listDisputes
- Endpoints: GET /supplier/reviews, GET /supplier/reviews/:id, POST /supplier/reviews/:id/response, POST /supplier/reviews/:id/response/submit, POST /supplier/reviews/:id/accept, POST /supplier/reviews/:id/dispute, GET /supplier/disputes, POST /supplier/disputes/:id/evidence
- Загрузка evidence: jpg/png/pdf, до 25MB, до 5 файлов на dispute (через StorageProvider)

### Этап 5 — Backend Admin ✅
- Модерация ответов: GET supplier-responses, PATCH supplier-responses/:id/approve, PATCH supplier-responses/:id/reject
- Disputes: GET disputes, PATCH disputes/:id/resolve (RESOLVED_KEEP, RESOLVED_EDIT→KEEP, RESOLVED_HIDE, RESOLVED_DELETE)
- Action log: ADMIN_RESPONSE_APPROVED/REJECTED, ADMIN_RESOLVED_*

### Этап 6 — File storage ✅
- Dispute evidence: реализовано в этапе 4 (StorageProvider, jpg/png/pdf, 25MB, 5 файлов)
- UploadService: deleteFile, getFileUrl для evidence
- Admin disputes: evidence с url в ответе

### Этапы 7–9 — Frontend ✅
- **Public:** capability, dispute banner, supplier response уже в этапе 3 (ReviewSection, EventPageView)
- **Supplier:** раздел «Отзывы» (вкладки all/needs_response/disputed/responded), карточка, response/dispute/accept, загрузка evidence
- **Admin:** вкладки «Ответы поставщика», «Оспаривания» — approve/reject, resolve

### Этап 10 — Тесты ✅
- `review-capability.service.spec.ts` — unit-тесты для canAcceptReviews, isImportedAggregatorEvent, requiresSupplierResponse

### Этап 11 — Документация ✅
- ReviewModuleSpec.md, ReviewModuleAudit.md актуализированы
- Project.md, Tasktracker.md, Diary.md обновлены

## Осталось
- Нет. **Этапы 1–11 закрыты (11.03.2026).**

## Отложено (по желанию)
- Расширенные тесты (e2e, интеграционные) для модуля отзывов

---

# 10. План (оригинальный)

| Этап | Описание |
|------|----------|
| 1 | Prisma: ReviewSupplierResponse, ReviewDispute, ReviewDisputeEvidence, ReviewActionLog; опционально supplierId, publishedAt в Review |
| 2 | Domain: canAcceptReviews(event), requiresSupplierResponse(review), enums (dispute status, reasonCode) |
| 3 | Backend Public: capability guard в create; reviewCapability в event detail; dispute banner + supplier response в getByEventSlug |
| 4 | Backend Supplier: GET reviews, GET review/:id, POST response, POST response/submit, POST accept, POST dispute, POST disputes/:id/evidence |
| 5 | Backend Admin: moderation supplier responses, disputes queue, resolve dispute |
| 6 | File storage: dispute evidence (pdf/jpg/png, 25MB, 5 files) |
| 7 | Frontend Public: capability check, dispute banner, supplier response в карточке |
| 8 | Frontend Supplier: раздел «Отзывы», вкладки, карточка, response/dispute формы |
| 9 | Frontend Admin: supplier response moderation, disputes page |
| 10 | Tests, docs |

---

## 9. Критичные ограничения MVP

- TC/TEPLOHOD → отзывы **полностью отключены**
- Нет claim ownership для imported events
- Нет expert arbitration, appeals, trust score
- Dispute: упрощённый flow без client reply (MODERATOR_REVIEW → RESOLVED_*)
