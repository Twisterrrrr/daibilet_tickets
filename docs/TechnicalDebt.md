# Технические долги и аудит

> Последнее обновление: 2026-02-21

## Обзор

Документ фиксирует технические долги, TODO в коде и рекомендации по рефакторингу.

---

## 1. TODO в коде (приоритетные)

| Файл | TODO | Приоритет |
|------|------|-----------|
| `sitemap-cities-filters/route.ts` | count >= 6 перед добавлением SEO-фильтров в sitemap | Средний |
| `admin-reconciliation.controller.ts` | resolvedBy: use actual admin ID from JWT | Низкий |
| `fulfillment.service.ts` | pass externalEventId при вызове | Низкий |
| `checkout.service.ts` | Создание Package + платёж YooKassa (Trip Planner) | Критический |
| `checkout.service.ts` | Верификация IP + подпись, payment.succeeded/canceled | Критический |
| `voucher.service.ts` | Генерация QR-кода и PDF | Высокий |
| `voucher.controller.ts` | Генерация и отдача PDF | Высокий |

---

## 2. Типизация (`any`)

- **Backend**: ~31 файл с `as any` или `: any`. Tasktracker: заменить на type guards постепенно.
- **Frontend**: 100+ вхождений. Начать с `api.ts` и DTO types.
- **Тесты**: допустимо для моков, но лучше типизировать.

---

## 3. Неприменённые миграции

После коммита выполнить:
```bash
cd packages/backend
npx prisma migrate deploy
npx prisma generate
pnpm run db:seed:seo   # при необходимости
```

---

## 4. Известные ограничения

- **Prisma generate** — на Windows может падать с EPERM (lock файла). Решение: закрыть IDE/процессы, перезапустить.
- **sitemap-cities-filters** — не проверяет count ≥ 6 перед добавлением URL (см. docs/seo-landing-strategy.md).
- **SeoMeta** — интеграция generateMetadata пока только для /events/[slug]. Venues, cities, blog, combo — по мере необходимости.
- **SeoGeneratorService** — не подключён к cron/очереди; regenerateAllForCity вызывается вручную или через endpoint.

---

## 5. Рекомендации по приоритетам

1. **Критический**: Checkout YooKassa, payment webhooks.
2. **Высокий**: Voucher QR + PDF, bulk SEO generator.
3. **Средний**: sitemap count ≥ 6, SeoMeta на venues/cities, LandingEdit/ArticleEdit/ComboEdit.
4. **Низкий**: Типизация any, resolvedBy из JWT.
