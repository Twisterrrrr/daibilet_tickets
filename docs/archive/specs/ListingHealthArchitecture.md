# Listing Health Architecture (Phase 4)

> Deterministic, explainable scoring. Без black-box. Source: Event, EventOffer, EventSession, Venue.

---

## 1. Goal

Supplier видит «здоровье» листингов, actionable рекомендации. Admin — агрегат по каталогу.

## 2. Rules (Deterministic)

| Код | Условие | Штраф | Сообщение |
|-----|---------|-------|-----------|
| NO_PHOTO | !event.imageUrl && !event.galleryUrls?.length | 15 | Нет главного фото |
| WEAK_DESC | (event.description?.length ?? 0) < 200 | 10 | Описание короче 200 символов |
| NO_SESSIONS | SCHEDULED && нет будущих сессий | 20 | Нет расписания |
| NO_PRICE | event.priceFrom == null && все офферы без priceFrom | 15 | Не указана цена |
| VENUE_GAPS | venueId && !venue.address | 5 | У площадки нет адреса |
| REJECTED_RATIO | доля отклонённых событий (moderationStatus=REJECTED) / всего | до 10 | Высокий процент отклонений |

Score = 100 - sum(штрафов), clamp 0..100. Или score = 100 - min(100, sum).

## 3. Implementation

```ts
// listing-health.service.ts
interface HealthIssue {
  code: string;
  message: string;
  field?: string;
  eventId?: string;
}

interface ListingHealthResult {
  score: number;
  issues: HealthIssue[];
  recommendations: string[];
}

computeEventHealth(event: Event & { offers, sessions, venue? }): ListingHealthResult;
computeOperatorHealth(operatorId: string): { score, byEvent: [...], aggregate };
```

## 4. Compute Strategy

- **On-read:** при GET /supplier/listing-health — вычислять заново
- **Cache:** Redis `listing_health:operator:${id}` TTL 1h, invalidate при update Event
- **Materialize:** при росте — таблица `listing_health_cache (entity_type, entity_id, score, issues_json, updated_at)`. Обновлять при изменении event/offer. MVP — on-read + опционально Redis.

## 5. API

| Method | Path | Response |
|--------|------|----------|
| GET | /supplier/listing-health | `{ score, issues, recommendations, byEvent?: [...] }` |
| GET | /admin/catalog/health | `?operatorId=&cityId=` → `{ byEvent, byOperator, aggregates }` |

## 6. Prisma Impact

Нет новых таблиц. EventOverride.qualityStatus/qualityIssues — опционально заполнять из ListingHealthService.

## 7. Backend Impact

- `packages/backend/src/catalog/listing-health.service.ts`
- `packages/backend/src/supplier/supplier.controller.ts` — GET listing-health
- `packages/backend/src/admin/admin-catalog.controller.ts` — GET health

## 8. Frontend Impact

- Supplier: панель «Здоровье листинга» (StatCard score, список issues, кнопки «Исправить» → event edit)
- Admin: отчёт «Качество каталога»

## 9. Definition of Done

- [ ] ListingHealthService с детерминированными правилами
- [ ] GET /supplier/listing-health
- [ ] GET /admin/catalog/health
- [ ] Supplier видит score и рекомендации
