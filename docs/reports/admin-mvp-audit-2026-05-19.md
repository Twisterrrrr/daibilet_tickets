# Admin MVP audit — imported events / external sales

Дата аудита: 2026-05-19  
Контекст: Daibilet, Admin V4, импортируемые события Ticketscloud и Teplohod.info. Финансовый контур Daibilet в MVP не вводится: покупка, оплата и основные возвраты остаются на стороне внешних провайдеров.

## Короткий вердикт

Проект не в состоянии "нет админки". Скорее состояние такое: backend и доменная модель уже достаточно сильные, Admin V4 уже содержит правильный каркас Imported Sales MVP, но контур нельзя считать рабочим из-за незакрытого hardening: не проходит TypeScript, dashboard частично показывает N/A/TODO, карточка события и внешний заказ не дотянуты до Lovable UX, а часть экранов остаётся прямыми маршрутами вне MVP sidebar.

Главная рекомендация: не начинать новую админку и не тянуть finance/supplier/checkout в MVP. Довести `packages/frontend-admin-v4` как единственный рабочий контур поверх существующих `/api/v1/admin/**`.

## Что уже хорошо

- Продуктовая граница зафиксирована в документах: Imported Sales = импортированный каталог + внешняя покупка + внешние заказы + контентные хабы, без YooKassa/checkout/settlements.
- Sidebar Admin V4 уже сфокусирован на MVP: Dashboard, Events, External Orders, Venues, Cities, Landings, import/system screens. Internal PSP refunds, collections, SEO/growth и promo скрыты из sidebar.
- Backend уже отдаёт канонический `externalPurchaseEntry` для события, включая provider, entry type, widget/deeplink readiness, status и blocking reasons.
- External orders уже имеют отдельный `/admin/external-orders` list/detail и операционный слой ручных заявок на возврат через `/admin/external-refund-requests`.
- Есть dashboard read-model `/admin/imported-sales/dashboard`, источник для сводки MVP.
- Есть документация с DTO gap report и freeze/handoff на май 2026: это хороший якорь, его надо поддерживать как источник решений.

## Главные стопперы

1. `frontend-admin-v4` не проходит `tsc`.
   Проверка через локальный compiler:
   `.\packages\frontend-admin-v4\node_modules\.bin\tsc.CMD -p packages\frontend-admin-v4\tsconfig.json --noEmit`
   падает на импортах `react-router-dom` (`Navigate`, `Route`, `Routes`, `Link`, `useParams`, `useSearchParams` и др.), Radix wrapper props (`className`, `children`) и отсутствии node typings для `vite.config.ts`. При этом в локальном package есть `react-router-dom`, но нет локального `react-router` в `packages/frontend-admin-v4/node_modules`.

2. Backend typecheck тоже не зелёный.
   `.\node_modules\.bin\tsc.CMD -p tsconfig.json --noEmit` из `packages/backend` падает на старых типовых проблемах Express `Request/Response`, JWT options, Sentry, fetch `Response`. Это не обязательно блокирует runtime, но блокирует утверждение "полный рабочий контур".

3. `pnpm` и `git` не доступны в текущем PowerShell PATH.
   Через `.CMD` удалось вызвать `tsc`, но штатные скрипты `pnpm --filter ...` и `git status` не запустились. Для команды это надо починить в локальном/dev окружении или документировать approved path.

4. Dashboard ещё не production-grade.
   `packages/frontend-admin-v4/src/modules/dashboard/api/dashboard.ts` содержит несколько `N/A (TODO...)`: ready-to-publish, missing image, provider split, latest sync time, mapping inbox count. Это нормально для baseline, но не для "оператор открывает утром и понимает, что делать".

5. Event detail частично считает readiness на фронте.
   В карточке есть backend readiness, но рядом остаётся `Publish readiness (read-only, partial)` с фронтовой эвристикой. MVP должен опираться на backend readiness как источник правды; frontend checklist можно оставить как диагностический слой или удалить.

6. External order detail не дотянут до Lovable reference.
   Текущая версия рабочая по базовому refund flow, но reference предполагает вкладки Overview / Refunds / Operations / Source Snapshot / Audit. Сейчас snapshot и audit фактически не разведены как полноценные UX-поверхности, а часть provider facts не нормализована для оператора.

## MVP scope, который стоит зафиксировать

Входит:
- Авторизация admin.
- Dashboard только по Imported Sales.
- Events list/detail: поиск, фильтры source/readiness/purchase readiness, скрыть/активировать, обложка, классификация, расписание/offers read-only, import/source facts.
- External Orders list/detail: provider facts read-only, поиск, фильтры, ручные refund requests, статусы обработки.
- Import Sources / Sync Health / Mapping Inbox: минимум для понимания, почему импорт сломан.
- Venues/Cities/Landings: ограниченный контентный контроль, без превращения в большой CMS.
- Taxonomy read-only + picker там, где он нужен событию.
- Audit log read-only.

Не входит:
- Internal checkout, корзина, YooKassa, reconciliation, settlements, finance, supplier LC, EDO.
- Internal PSP refund requests в рабочем sidebar.
- Полный SEO/growth cockpit, linking/redirects engine, promo placements, collections deep-edit.
- Полный редактор Event content blocks, если он задерживает запуск Imported Sales.

## Рекомендуемый порядок доведения

### Phase 0 — восстановить техническую собираемость

- Починить зависимости/типы Admin V4: `react-router-dom`/`react-router`, Radix wrappers, `@types/node` для `vite.config.ts`.
- Вернуть штатные команды: `pnpm --filter @daibilet/frontend-admin-v4 run typecheck`, `pnpm --filter @daibilet/frontend-admin-v4 run build`.
- Решить, является ли backend global `tsc --noEmit` release gate. Если да — закрыть Express/JWT/Sentry/fetch typing debt; если нет — сделать scoped check для Admin MVP и явно прописать это в runbook.

### Phase 1 — сделать операторский happy path

- Login -> Dashboard -> Events -> Event detail -> открыть публичную карточку/preview.
- Login -> Dashboard -> External Orders -> Order detail -> создать manual refund request -> поменять статус -> увидеть в list.
- Login -> Sources/Sync Health -> понять свежесть TC/Teplohod, последнюю ошибку, кнопку запуска sync.

### Phase 2 — выровнять Events

- Сделать backend readiness единственным источником статуса публикации.
- Оставить `externalPurchaseEntry` как канон; `purchaseLink` только legacy fallback.
- В списке явно показывать purchase status, needs attention, ready to publish, source, future sessions/offers.
- В карточке разделить: "Данные источника" read-only, "Операционные override" editable.
- Refund/exchange policy либо реально прокинуть в `GET /admin/events/:id`, либо убрать TODO из UI до второго темпа.

### Phase 3 — выровнять External Orders

- Добавить вкладки как в reference: Overview, Refunds, Operations, Source Snapshot, Audit.
- В list приблизить колонки к operator workflow: дата, provider, external id, событие/linked, visit/session, status, integration, artifact/tickets, refunds.
- Не вводить деньги Daibilet: суммы показывать только как provider fact, refund request как manual tracking.

### Phase 4 — Dashboard и runbook

- Убрать/заменить N/A на реальные агрегаты или сознательно скрыть эти карточки.
- Добавить smoke script/checklist для Admin V4: auth, dashboard, events list/detail, external orders list/detail/refund flow, sources/sync.
- Зафиксировать демо/seed данные TC и Teplohod, без которых UX невозможно проверить.

## Ключевые файлы

- `docs/product/admin-v4-imported-sales.md` — продуктовый контракт Imported Sales MVP.
- `docs/reports/admin-v4-dto-gaps.md` — текущие gap'ы DTO и freeze/handoff.
- `packages/frontend-admin-v4/src/config/navigation.ts` — sidebar MVP и скрытые зоны.
- `packages/frontend-admin-v4/src/App.tsx` — маршруты Admin V4.
- `packages/frontend-admin-v4/src/modules/events/*` — события и external purchase UI.
- `packages/frontend-admin-v4/src/modules/external-orders/*` и `src/pages/imported-sales/*` — внешние заказы.
- `packages/backend/src/admin/admin-events.controller.ts` — admin events API.
- `packages/backend/src/admin/build-admin-external-purchase-entry.ts` — канон внешней покупки.
- `packages/backend/src/integrations/admin-external-orders.controller.ts` — external order detail/refund operations.
- `packages/backend/src/integrations/admin-integrations-read.controller.ts` — external orders list/provider diagnostics.

## Итоговое решение

Делать MVP надо не через новую Lovable-копию, а через стабилизацию Admin V4:

1. оставить Lovable как UX reference;
2. оставить backend/Prisma источником правды;
3. закрывать только additive DTO gaps;
4. убрать из MVP finance/internal checkout;
5. довести один маршрут оператора до конца вместо расширения поверхности.

