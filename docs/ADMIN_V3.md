# Admin V3 — канон нового админского контура

**Назначение:** один документ про **Admin V3 как продукт**: scope, модули, паттерны UI, контракт list/detail, что закрывает V1 и что нет. Стратегия по фазам и доменам — по-прежнему в [`admin-v3/grand-master-plan.md`](admin-v3/grand-master-plan.md).

**Код:** `packages/frontend-admin-v3`, mount: `/admin-v3/*`.

---

## 1) Scope

- Каталог и операционное управление: события, площадки, города, коллекции, лендинги, теги/таксономия (по мере готовности), SEO-аудит, поддержка, отзывы, настройки/ops.
- **Не цель:** перенести Admin V1 «как есть»; V1 остаётся fallback/toolbox.

---

## 2) Принципы

- **Тонкий UI-слой** над существующим backend; не дублировать доменную логику на фронте (read models и DTO с backend).
- **Feature flags:** не рендерить, не пускать по роуту, не запрашивать данные для выключенных разделов (принцип в [`archive/legacy-root/admin-v3_old/Implementation-Guide.md`](archive/legacy-root/admin-v3_old/Implementation-Guide.md) и коде `FeatureRoute` / `features.ts`).
- **Список:** server-side pagination/filter/sort; для тяжёлых списков — договорённость `lite=1` где поддержано (см. [`SYSTEM.md`](SYSTEM.md) § Admin API).

---

## 3) Единые UI-паттерны (admin/catalog)

Согласно правилам проекта для admin/catalog: **PageHeader**, **FilterBar**, **DataTableShell**, **DetailLayout** (и родственные), **StatusBadge** — не плодить одноразовую вёрстку. Детали компонентов — в коде `frontend-admin-v3` и в legacy-справочнике [`archive/legacy-root/admin-v3_old/ALL-IN-ONE.md`](archive/legacy-root/admin-v3_old/ALL-IN-ONE.md).

---

## 4) List / detail

- **List:** фильтры и таблица как единый ритм; URL-state для фильтров где принято в модуле.
- **Detail:** шапка + сводка + табы; тяжёлые вкладки — лениво.

---

## 5) Что заменяет V1 / V2 и что нет

- **Заменяет:** основной ежедневный контур работы с каталогом и контентом в V3 по мере покрытия экранов.
- **Пока не покрыто / legacy:** часть редких или тяжёлых потоков остаётся в `frontend-admin` или других пакетах — см. [`PROJECT-FOUNDATION.md`](PROJECT-FOUNDATION.md).

---

## 6) Связанные документы

- [`runbooks/infra.md`](runbooks/infra.md) — RBAC, ops, опасные операции
- [`core/architecture.md`](core/architecture.md) — границы системы
- [`ROADMAP.md`](ROADMAP.md) — фазы исполнения
