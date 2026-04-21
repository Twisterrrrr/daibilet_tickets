# Grand Master Plan — Admin V3

**Назначение:** единая стратегическая дорожная карта Admin V3 по доменам и фазам. Текущий путь (Now/Next/Later) — в `docs/DIRECTION.md`.

**Принцип очередности (всегда):**

`ядро каталога` → `контент` → `качество/SEO` → `поддержка` → `обзор/настройки` → `бизнес-слой` — не наоборот.

---

## 1. Главная цель Admin V3

Не «перенести всю старую админку», а собрать **рабочую управляющую систему витрины** в правильном порядке.

| Горизонт | Цель |
|----------|------|
| **Ближайшая** | Запустить и стабилизировать витрину импортируемых событий: **Ticketscloud**, **Teplohod** |
| **Следующая** | Достроить вокруг launch-core: **контент**, **SEO**, **поддержку**, **операционное управление** |

---

## 2. Фаза 0 — Foundation / Reset baseline

**Цель:** не дать V3 расползтись в набор несвязанных экранов.

**База:** shell, routing, auth, React Query, `adminApi`, feature flags, единый list/detail pattern, error contract, URL-state discipline.

**DoD:** все новые домены строятся по одному паттерну; нет «специальных экранов» вне общей модели.

---

## 3. Фаза 1 — Catalog Core

Главный блок; его нельзя перепрыгнуть.

### 3.1 Event Admin

- **Роль:** событие — основная коммерческая сущность витрины.
- **V3:** list (поиск, фильтры: city, source, supplier, status, publish readiness, сортировки, quick actions); detail (title, slug, source/import metadata, publish/active, venue, city, supplier, subcategories, description/content, pricing/sessions summary, quality/readiness); actions (publish/unpublish, activate/deactivate, archive, open storefront/venue/supplier).
- **Readiness:** не витринно-готово без: venue, цены, будущих сессий, города, базового контента.
- **KPI:** импортированные события можно безопасно выводить на витрину; список и карточка дают полный operational control.

### 3.2 Venue Admin

- **Роль:** canonical слой площадок между импортом и витриной.
- **Candidates:** candidates, similar, approve/merge/reject, confidence, merge preview, batch actions, URL-state/links.
- **Canonical:** list (search, city, sourceType, importSource, lifecycle, readiness, stats, supplier); detail (name, address, city, source, lifecycle, publish/active, subcategories, related events, similar drafts, venue/hub mode, readiness/quality).
- **KPI:** один canonical venue на реальную площадку; candidates flow схлопывается в чистую venue-базу.

### 3.3 City Admin

- **Роль:** географический хаб каталога.
- **List / Detail:** поиск, статус, счётчики (events, landings, collections), hub readiness; поля slug, SEO, hub config, связанные collections/landings/promo, stats, readiness block.
- **Поля:** `isCatalogHub`, hero/intro, seoTitle/seoDescription/H1, `primaryCollectionId`, `relatedLandingIds`, `relatedArticleIds`, indexability.
- **KPI:** город — полноценная точка входа в каталог.

### 3.4 Supplier Admin

- **Роль:** операционный read-heavy домен импорта (не self-service).
- **List / Detail:** интеграция, sync, events/venues summary, listing health, issues/import failures, ссылки на events/venues.
- **Пока не обязательно:** финансы, юркабинет, payouts, supplier users, документы.
- **KPI:** видно, кто наполняет каталог хорошо, а кто ломает.

### 3.5 Minimal Quality / Publish Layer

- Единые readiness DTO, quality issues, publish blocking rules, storefront-safe rules.
- **KPI:** админка знает, что можно выпускать на витрину, а что нет.

---

## 4. Фаза 2 — Hub Layer

После базового каталога — формализовать входные точки витрины.

- **Модель:** `CITY_HUB` | `VENUE_HUB` | `LANDING_HUB`.
- **Readiness:** `NOT_A_HUB` | `DRAFT` | `NEEDS_WORK` | `READY` | `BLOCKED`.
- **Где:** city / venue / landing detail; позже — Hub Overview dashboard.

---

## 5. Фаза 3 — Content Core

- **Articles:** list, editor, publish, SEO, связи с landings/collections.
- **Collections:** MANUAL MVP first, add/remove events, reorder, publish, public page, SEO.
- **Landings:** CITY / HUB / MULTI_CITY, parent/child, event source mode, preview resolved events, related collections/articles, public routing.
- **Promo Blocks:** target (event/collection/landing/article), placement zones, scope, active window, resolver, preview.

---

## 6. Фаза 4 — Taxonomy + SEO Quality

- **Subcategories / Tags:** list, detail, parent/child, type, landing flags, usage, activation.
- **SEO Audit:** summary, issues list, deep links, entity issues, domain rules, hub-aware severity.
- **Entity Health Badges:** events, venues, cities, landings, collections, articles.

---

## 7. Фаза 5 — Support Domain

После каталога и контента.

- **Reviews:** moderation, public output, ссылки на event/venue.
- **Chat:** inbox, conversation, reply, close.
- **Tickets:** list, detail, assign, status flow; chat → ticket; review → ticket.

---

## 8. Фаза 6 — Dashboard

Когда уже есть что агрегировать.

- Health (hub readiness, SEO issues, event/venue issues).
- Activity (views, top entities, conversions при наличии).
- Content & SEO (опубликованное, пустые/слабые страницы).
- Operations (tickets, chats, reviews).
- **Requires Attention:** единый operational list.

---

## 9. Фаза 7 — Settings

После операционных доменов.

- Users / Roles (owner, admin, content, support, analyst).
- Integrations (TC, Teplohod, test connection, status).
- Payments (provider config, stub/live/test).
- Notifications (channels, templates).
- SEO / Domain (base URL, default meta, indexability defaults).
- Feature Flags, system settings (thresholds, limits, defaults).

---

## 10. Фаза 8 — Later Business Layer

Только после всего выше: finance, payouts, documents, supplier legal, advanced permissions, deep analytics, campaign logic, full supplier office.

---

## 11. Реальный порядок внедрения (Stages A–F)

| Stage | Содержание | Результат |
|-------|------------|-----------|
| **A — Launch Core** | Venue candidates polish (confidence, merge preview, URL/state/links, batch actions), canonical venues, events hardening, cities hardening, suppliers light, minimal publish/readiness | Управление витриной imported catalog |
| **B — Content Core** | Articles, Collections, Landings, Promo Blocks | SEO и merchandising layer |
| **C — Structure & Quality** | Hub readiness framework, subcategories/taxonomy, SEO Audit, entity health | Система показывает слабые места |
| **D — Operations** | Reviews, Tickets, Chat, support integrations | Operational support contour |
| **E — Management Layer** | Dashboard, Settings | Центр управления системой |
| **F — Later business** | Finance, docs, payouts, deeper supplier office | — |

---

## 11.1 Тактический путь на 4–6 недель (Admin V3 first)

Это конкретизация под текущую стратегию: **стартуем с Admin V3 без Supplier self‑service и без finance UI**, а затем возвращаемся к ним по мере необходимости.

### Неделя 1: стабилизация control-plane

- Fix/guardrails для **dangerous ops** (publish/unpublish, materialize, auto-moderation run, refunds, feature flags).\n+- Перф: `lite=1` для списков, явные DTO на read-heavy endpoints, baseline замеры.

### Неделя 2–3: Supplier MVP (V3-style)

- Минимальный кабинет поставщика как **тонкий V3-style слой** (не реанимация Supplier V1):\n+  - список событий/площадок поставщика (read-first)\n+  - карточка сущности с readiness/quality и ссылками в Admin V3\n+  - минимальные safe actions только если потребуется\n+- Расширение опциями только по нужде (интеграции/команда/финансы — позже, отдельными фазами).

### Неделя 4–6: schedule / sessions operations

- Сеансы как операционный контур: read-only обзор → bulk-операции → edit/create там, где это реально нужно.\n+- Приоритет: безопасные и обратимые действия, с аудитом.

#### Стратегия (без преждевременного “Event Master”)

- **Шаг 1 — Read-only**: обзор будущих сеансов, “пустые” события (нет future), базовые флаги качества, быстрые deep-links в событие.\n+- **Шаг 2 — Bulk**: pause/resume/stop/cancel в рамках строгих предикатов (только будущие, только нераспроданные, только ограниченные источники), с dry-run и аудитом.\n+- **Шаг 3 — Edit/Create**: точечное редактирование сеанса и пакетное создание только там, где без этого нельзя (в первую очередь MANUAL/операторские сценарии).

DoD фазы: оператор может держать расписание “чистым” без SQL/скриптов и без массовых регрессий.

## 12. Критичность до запуска витрины

**Обязательно до launch-core:** venue candidates, canonical venues, events, cities, suppliers light, minimal publish/readiness.

**Желательно вскоре после:** collections, landings, articles, promo, taxonomy, SEO audit.

**Можно позже:** support, dashboard, settings depth, business layer.

---

## 13. Что не раздувать сейчас

Осторожно с: full CMS, full BI, complex RBAC, financial workflows, supplier portal as full product, advanced automation.

---

## 14. Доменные зависимости (кратко)

| Домен | Зависит от |
|-------|------------|
| Events | venues, cities, suppliers, publish rules |
| Venues | candidates flow, cities, related events |
| Cities | catalog presence, hub model; позже landings/collections/promo |
| Suppliers | imported events, venues, sync state |
| Landings | collections, events, city model, hub logic |
| SEO Audit | taxonomy, content, hub readiness |
| Dashboard | почти от всего |

---

## 15. Definition of Done для всей Admin V3

Admin V3 «состоялась», если:

- импортируемый каталог управляется **без возврата в legacy**;
- события, площадки, города и поставщики закрыты как **рабочие домены**;
- есть content layer (articles, collections, landings, promo);
- есть taxonomy + SEO audit;
- есть support layer, dashboard, settings;
- ключевые экраны **консистентны** (list/detail/action);
- витрина управляется через V3 **предсказуемо**.

---

## 16. Вывод

Нужен не идеальный клон большой админки, а **control panel в правильной очередности**: сначала каталог, потом контент, качество, операции, управление системой.

---

## Связанные документы

- `docs/DIRECTION.md` — текущий путь (Now/Next/Later) и что сознательно отложено.
- `docs/Tasktracker.md` — актуальный трекер задач и статусы.
- `docs/runbooks/infra.md` — эксплуатация, RBAC, ops.

## Notes: Articles (public contract)

- **Публичные страницы сайта:** `/articles` и `/articles/:slug`.
- **Публичный API:** `/articles` и `/articles/:slug`.
- **Legacy `/blog`**: считается устаревшим alias’ом; не использовать в новом UI/перелинковке.
