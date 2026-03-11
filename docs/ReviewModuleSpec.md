# Review Module MVP — Спецификация

> Короткий документ для предотвращения архитектурных разногласий. Обновляется при изменении правил.

---

## 1. Отзывы отключены для импортируемых событий

**Правило (MVP):**
- События из **Ticketscloud (TC)** и **teplohod.info (TEPLOHOD)** — отзывы **полностью отключены**.
- Отзывы разрешены только для событий **MANUAL** с владельцем (supplierId или operatorId).
- Нет claim ownership для импортируемых событий в MVP.

**Реализация:**
- `ReviewCapabilityService.canAcceptReviews(event)` — единая точка проверки.
- Public `POST /reviews` — 403, если event.source ∈ {TC, TEPLOHOD}.
- `EventDetailFrontend.reviewCapability: 'ENABLED' | 'DISABLED'`.
- Frontend: форма отзыва не показывается при `reviewCapability === 'DISABLED'`.

---

## 2. Модерация ответа поставщика

**Правило:**
- Ответ поставщика проходит модерацию админом до публикации.
- Статусы: `DRAFT` → `PENDING_MODERATION` → `APPROVED` | `REJECTED`.
- Только одобренный ответ показывается на публичной странице.

**Workflow:**
1. Поставщик создаёт/редактирует draft.
2. Поставщик отправляет на модерацию.
3. Админ одобряет или отклоняет (с moderationComment).

---

## 3. Dispute workflow

**Правило:**
- Поставщик может оспорить отзыв (dispute) с приложением доказательств.
- Один активный dispute на отзыв (unique reviewId).
- Поставщик не может сам скрывать, удалять или редактировать отзыв.

**MVP статусы:**
- `MODERATOR_REVIEW` — ожидает решения.
- `RESOLVED_KEEP` — отзыв остаётся.
- `RESOLVED_EDIT` — отзыв редактируется (в MVP может быть не реализовано).
- `RESOLVED_HIDE` — отзыв скрыт.
- `RESOLVED_DELETE` — отзыв удалён.

**Публичный бейдж:**
- Если есть активный dispute (MODERATOR_REVIEW) — показывать плашку: «Отзыв оспаривается поставщиком и находится на проверке».

---

## 4. Supplier ownership

**Правило:**
- Поставщик видит только отзывы на свои owned-события.
- `Review.supplierId` — snapshot поставщика на момент создания отзыва.
- MANUAL event без owner (supplierId/operatorId) → supplier endpoints возвращают пустой результат.

---

## 5. Action log

- Все значимые действия логируются в `ReviewActionLog`.
- actorType: `client` | `supplier` | `admin` | `system`.
- actionType: `REVIEW_CREATED`, `SUPPLIER_RESPONSE_SUBMITTED`, `DISPUTE_CREATED`, `ADMIN_RESOLVED_*` и т.д.

---

## 6. Что не входит в MVP

- Expert arbitration
- Appeal system
- Trust score
- Client reply stage в dispute
- Claim ownership для imported events
- Push-уведомления
- Сложные threaded discussions
