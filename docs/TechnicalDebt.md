# Технические долги и аудит

> Последнее обновление: 2026-02-21

## Обзор

Документ фиксирует технические долги, TODO в коде и рекомендации по рефакторингу.

---

## 1. TODO в коде (приоритетные)

| Файл | TODO | Приоритет |
|------|------|-----------|
| ~~`sitemap-cities-filters/route.ts`~~ | ~~count >= 6~~ | ✅ Выполнено |
| ~~`admin-reconciliation.controller.ts`~~ | ~~resolvedBy~~ | ✅ Выполнено |
| ~~`fulfillment.service.ts`~~ | ~~externalEventId~~ | ✅ Выполнено |
| `checkout.service.ts` | Создание Package + платёж YooKassa (Trip Planner) | Критический |
| `checkout.service.ts` | Верификация IP + подпись, payment.succeeded/canceled | Критический |
| ~~`voucher.service.ts`~~ | ~~QR + PDF~~ | ✅ Выполнено |
| ~~`voucher.controller.ts`~~ | ~~PDF endpoint~~ | ✅ Выполнено |

---

## 2. Типизация (`any`)

- **Backend**: ~31 файл с `as any` или `: any`. Tasktracker: заменить на type guards постепенно.
- **Frontend**: 100+ вхождений. Начать с `api.ts` и DTO types.
- **Тесты**: допустимо для моков, но лучше типизировать.

---

## 3. Неприменённые миграции

`.env` лежит в корне монорепо. Seed-скрипты (`db:seed:seo`, `db:seed:qf`) загружают его автоматически.

После коммита выполнить:
```bash
cd packages/backend
npx prisma migrate deploy
npx prisma generate
pnpm run db:seed:seo   # при необходимости
pnpm run db:seed:qf    # при необходимости (query filters)
```

---

## 4. Известные ограничения

- **Prisma generate** — на Windows может падать с EPERM (lock файла). Решение: закрыть IDE/процессы, перезапустить.
- ~~**sitemap-cities-filters**~~ — count ≥ 6 реализовано (2026-02-21).
- **SeoMeta** — generateMetadata подключён для events, venues, cities, blog, combo (2026-02-21). JSON-LD из SeoMeta — только на /events/[slug].
- **SeoGeneratorService** — не подключён к cron (по стратегии: «по кнопке» на 1 город). См. `docs/seo-landing-strategy.md` §0.

---

## 5. Приоритетная очередь (с обоснованием)

### Высокий ROI, низкая сложность

| # | Задача | Где | Почему |
|---|--------|-----|--------|
| 1 | ~~**Sitemap count ≥ 6**~~ ✅ | `sitemap-cities-filters/route.ts` | Выполнено: проверка через api.getCatalog, batch 25. |
| 2 | ~~**SeoMeta на всех типах страниц**~~ ✅ | venues, cities, blog, combo | Выполнено: generateMetadata + getSeoMeta для VENUE, CITY, ARTICLE, COMBO. |
| 3 | **createdByType + RBAC** | Tasktracker | createdByType добавлен (Prisma, миграция, admin/supplier create). RBAC guards — в плане. |

### Прочие приоритеты

- **Критический**: Checkout YooKassa, payment webhooks.
- **Высокий**: bulk SEO generator (Voucher QR + PDF ✅).
- **Низкий**: Типизация any, resolvedBy из JWT.
