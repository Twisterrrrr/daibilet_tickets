# Checkout + Smart UX Pipeline — итоговое состояние (C0–C7)

Дата: 2026-03-06. После implementation pass.

---

## 1. Что сделано

| PR | Содержание |
|----|------------|
| **C0** | ApiErrorBody и CheckoutErrorCode в shared; ошибки widget/checkout с полем code. |
| **C1** | Read API стабилен: event + sessions, effectiveAvailable (paid + holds), tags, soldLast24h, bestOption. |
| **C2** | SOONEST / BEST_PRICE / POPULAR; bestOption; правило POPULAR: precomputed soldLast24h или эвристика. |
| **C3** | Widget checkout с forcePlatformPayment: true (оплата на платформе); контракт request/response без изменений. |
| **C4** | Holds включают AWAITING_PAYMENT; paid = PackageItem + FulfillmentItem CONFIRMED (sessionId из offersSnapshot); sessionId в SnapshotLineItem и в createPackage. |
| **C5** | Webhook idempotent, markPaid → COMPLETED, startFulfillment → executeFulfillment. Без изменений контракта. |
| **C6** | EventSessionStats, cron */15 мин, soldLast24h в read API, POPULAR с приоритетом реальных данных. |
| **C7** | LastCustomerSnapshot при оплате; GET last-customer?email= для префолла (instant checkout MVP). |

---

## 2. Изменённые/новые файлы

**Backend**

- `prisma/schema.prisma` — EventSessionStats, LastCustomerSnapshot; у EventSession relation stats.
- `prisma/migrations/20260306120000_event_session_stats/migration.sql`
- `prisma/migrations/20260306130000_last_customer_snapshot/migration.sql`
- `checkout/cart-partitioning.ts` — sessionId в SnapshotLineItem.
- `checkout/dto/checkout.dto.ts` — forcePlatformPayment в CreatePackageDto.
- `checkout/checkout.service.ts` — forcePlatformPayment, sessionId и полный snapshot в offersSnapshot; lineItemIndex по idx.
- `checkout/payment.service.ts` — customerPhone в select; сохранение LastCustomerSnapshot при оплате (через `in`-проверку для совместимости до generate).
- `widgets/widgets-api.service.ts` — getHoldsMap с AWAITING_PAYMENT; getPaidBySessionId с FulfillmentItem; include stats; soldLast24h, bestOption; getLastCustomerByEmail.
- `widgets/widgets-api.controller.ts` — GET :provider/last-customer.
- `widgets/widget-checkout.service.ts` — forcePlatformPayment: true в createPackage.
- `scheduler/session-stats.service.ts` — новый; recompute каждые 15 мин.
- `scheduler/scheduler.module.ts` — SessionStatsService.

**Shared**

- `shared/src/api-error.ts` — новый; ApiErrorBody, CheckoutErrorCode.
- `shared/src/index.ts` — экспорт api-error.

**Документация**

- `docs/PR-C0-C7-Audit.md` — аудит.
- `docs/PR-C.md` — обновлён под C0–C7.
- `docs/PR-C0-C7-Final.md` — этот файл.

---

## 3. Миграции

- **20260306120000_event_session_stats** — таблица event_session_stats.
- **20260306130000_last_customer_snapshot** — таблица last_customer_snapshots.

После применения миграций выполнить `npx prisma generate` в packages/backend (для типов LastCustomerSnapshot и EventSessionStats).

---

## 4. API (итог)

- **GET /widgets/:provider/event?eventId=** — event, sessions (available, tags, soldLast24h, bestOption).
- **POST /widgets/:provider/checkout** — body как в PR-C2-C5-Spec; ответ checkoutSessionId, shortCode, expiresAt, redirectUrl.
- **GET /widgets/:provider/last-customer?email=** — { name, email, phone } или null.

Остальные эндпоинты (checkout/result, orders/:id, webhook) без изменений контракта.

---

## 5. Out of scope

- Тяжёлая аналитика и реальное время для C6 (оставлен cron + precomputed).
- Полноценный customer account и авторизация для C7 (только last snapshot по email).
- Изменение формата ответов YooKassa webhook и существующих DTO checkout.

---

## 6. Правило bestOption

**Один стабильный критерий (не смесь эвристик):**

- **bestOption = true** ровно у одного сеанса на событие.
- Это сеанс с **минимальным startsAt среди доступных** (available > 0, не sold out).
- То есть bestOption совпадает с сеансом, помеченным тегом **SOONEST**.

Если доступных сеансов нет, bestOption у всех false. Логика живёт в `widgets-api.service.ts` (комментарий «C2: Tags + bestOption»).

---

## 7. Риски и ограничения

- **Prisma generate:** до первого успешного `prisma generate` после добавления моделей C6/C7 код использует проверку `'lastCustomerSnapshot' in this.prisma` и типы могут не совпадать с клиентом; после generate всё совпадает.
- **Миграции:** тень БД может падать на старых миграциях (например 20260212_audience); миграции C6/C7 можно применить вручную к актуальной БД.
- **C6:** recompute пересчитывает все сессии с продажами; при большом объёме можно сузить выборку (например только будущие сеансы).

---

## 8. E2E validation pass (2026-03-06)

Проведён hardening pass: проверка полного E2E, усиление edge cases, логи, тесты, документация.

### 8.1 Что проверено по полному E2E

| Этап | Путь | Статус |
|------|------|--------|
| Read API | WidgetsApiService.getEventWithSessions → holds, paid, stats, bestOption | Подтверждён |
| Checkout create | widget-checkout → createPackage (forcePlatformPayment) | Подтверждён + проверка доступности в createPackage |
| Payment / redirect | createPaymentIntent → paymentUrl | Подтверждён |
| Webhook | PaymentEventLog.logOnce + WebhookIdempotencyService.processOnce → queue | Подтверждён, дубликат логируется |
| Fulfillment | markPaid → startFulfillment (идемпотент по existing count) → executeFulfillment | Подтверждён |
| Stats | SessionStatsService cron 15 мин, recompute по PackageItem + FulfillmentItem CONFIRMED | Подтверждён |
| Last customer | markPaid → LastCustomerSnapshot.upsert; GET last-customer?email= | Подтверждён |

### 8.2 Edge cases — результат

| Сценарий | Результат |
|----------|-----------|
| **Параллельные покупки последних мест** | В createPackage при forcePlatformPayment добавлена повторная проверка доступности по сессиям (getEffectiveAvailableForSession). Второй запрос при нехватке мест получает BadRequestException с code NOT_ENOUGH_AVAILABLE. Окно гонки сужено; без распределённых блокировок. |
| **Duplicate webhook** | Два уровня: PaymentEventLog.logOnce (200 без постановки в очередь) и processOnce (ProcessedWebhookEvent). При дубликате — лог webhook_duplicate_ignored. Fulfillment: startFulfillment не создаёт записи, если по сессии уже есть FulfillmentItem. |
| **Payment success после expiry** | Политика зафиксирована: intent переводится в PAID, сессия остаётся EXPIRED (state machine не допускает переход EXPIRED → COMPLETED). Fulfillment выполняется (билет выдаётся). Лог: late_payment_after_expiry. Тест: payment.service.spec — «late payment after expiry». |
| **soldLast24h по widget sale** | SessionStatsService.recompute учитывает FulfillmentItem CONFIRMED и sessionId из offersSnapshot; после следующего цикла cron (до 15 мин) read API отдаёт обновлённые soldLast24h/totalPaid. |
| **last-customer новый/существующий email** | Новый email → GET возвращает null. После успешной оплаты — upsert в LastCustomerSnapshot; GET возвращает { name, email, phone }. Prefill не ломает checkout. |

### 8.3 Закреплённые правила

- **Late payment after expiry:** источник истины по статусу сессии — state machine. Intent → PAID, сессия остаётся EXPIRED, fulfillment выполняется; в логах фиксируется late_payment_after_expiry.
- **Last seats:** при создании checkout по виджету (forcePlatformPayment) доступность перепроверяется в createPackage по тем же формулам, что и в read API (capacity − paid − holds).
- **Webhook idempotency:** один paymentId обрабатывается один раз (ProcessedWebhookEvent + logOnce); повторный запрос → 200, без повторного job/fulfillment.

### 8.4 Ограничения (остаются)

- Между read и createPackage остаётся теоретическое окно гонки; защита — повторная проверка в createPackage без транзакционной блокировки.
- Stats обновляются по расписанию (15 мин), не в реальном времени.
- Last customer — один snapshot на email, без истории.

### 8.5 Изменённые файлы (validation pass)

- `checkout/checkout.service.ts` — getHoldsForEvent, getPaidBySessionId, getEffectiveAvailableForSession; проверка доступности в createPackage при forcePlatformPayment; лог checkout_created.
- `checkout/payment.service.ts` — лог late_payment_after_expiry при EXPIRED; структурированный лог payment_intent_created.
- `checkout/checkout.controller.ts` — лог webhook_duplicate_ignored при !result.processed.
- `checkout/fulfillment.service.ts` — лог fulfillment_started.
- `checkout/__tests__/payment.service.spec.ts` — тест «late payment after expiry» (intent → PAID, session не обновляется).

### 8.6 Structured logs (load-bearing точки)

- checkout_created, payment_intent_created, webhook_duplicate_ignored, late_payment_after_expiry, fulfillment_started; в WebhookIdempotencyService — Webhook processed / duplicate skipped.

---

Pipeline C0–C7 после данного прохода считается **validated MVP** для боевого использования в рамках зафиксированных правил и ограничений.

---

## 9. Known architectural risks after C0–C7

Две типичные ловушки ticketing-систем, которые проявляются через несколько месяцев после «работающего» checkout.

### 9.1 Display truth vs transaction truth

**Проблема:** На витрине живёт «текущее» состояние (Event, Session, price, available, теги). В checkout/payment/fulfillment — зафиксированные snapshot-данные. Оператор меняет цену или контент после продажи; импорт обновляет event; в карточке одно, в package/payment — другое. Итог: «почему купили не по той цене?», «почему статистика не сходится?».

**Правило:** Checkout, payment и fulfillment всегда опираются на **snapshot-правду** (offersSnapshot, cartSnapshot и т.д.), а не на текущее редактируемое состояние Event/Session. Контент можно редактировать для витрины; продажа ссылается только на зафиксированный snapshot. Не «исправлять историю продаж» через обычное редактирование контента.

### 9.2 Admin UI as second source of truth

**Проблема:** После усиления админки (Quick view, inline edit, quality score, drag sorting) возникает иллюзия: «всё поправим руками в админке». Импорт привозит одно, оператор правит другое, sync частично перетирает, quality score показывает третье — два центра управления без границ.

**Правило:** Явно делить поля на классы:
- **Source-owned** — канонически из источника, руками почти не редактировать (внешний title по политике, source category raw, external ids, schedule из источника).
- **Local-owned** — принадлежат платформе (SEO, порядок изображений, редакционные описания, badges, merchandising).
- **Override/derived** — явный механизм override (title override, short description override, mapped category, image override).

Inline edit разрешать только для полей с понятным ownership. Иначе manual edits начнут конфликтовать с import/sync.

### 9.3 Policy до FEATURE 7–10 (зафиксировать текстом)

| Область | Ownership | Примечание |
|--------|-----------|------------|
| Изображения, порядок медиа, SEO | Local-owned | Редактируемы в админке; drag sorting — local. |
| Source categories raw, external ids | Source-owned | Не править руками без спец-режима; канон — импорт. |
| Mapped category, title/description override | Override/derived | Явный override поверх source; при sync — политика перезаписи. |
| Inline edit | Только поля с ясным ownership | Не открывать массовый inline edit для source-owned полей. |

Кратко: **не путать текущий контент с проданной историей** (A); **не дать админке стать вторым каноническим источником рядом с импортом** (B).

### 9.4 Рекомендуемый порядок FEATURE 7–10

1. **FEATURE 7 — Quick view** — ускоряет модерацию; показывать смесь source/local/derived с явной пометкой ownership.
2. **FEATURE 9 — Quality score** — управление каталогом; score считает display truth, но знает происхождение поля.
3. **FEATURE 10 — Inline edit** — массовые правки; разрешать только для полей с ясным ownership (override, editorial, SEO, image order).
4. **FEATURE 8 — Drag sorting images** — чисто UX; images = local-owned, import не перетирает, reorder безопасен.

**UX-подсказка (опционально):** при реализации — визуальная метка ownership рядом с полем: `[S]` source / `[L]` local / `[D]` derived (или badge «Source» / «Local» / «Override»), чтобы оператор не правил не те поля.
