# Regression Checklist

> Используется для ручной проверки после релизов и до внедрения новых UX-изменений.
> **Critical Path** — минимальный набор сценариев, который достаточно пройти, чтобы уверенно считать, что базовая функциональность работает.

---

## Critical Path — Supplier (`/supplier`)

| # | URL | Шаги | Ожидаемый результат |
|---|-----|------|---------------------|
| S1 | /login | Ввод email/password → Вход | Редирект на Dashboard, sidebar виден |
| S2 | / | Dashboard загружен | PageHeader, метрики, блоки Trust/Attention/Sales без 500 |
| S3 | /events | Список событий | Список или EmptyState, без зависшего спиннера |
| S4 | /events/new | Создать событие → Заполнить минимум → Сохранить | Черновик создан, редирект на /events/:id |
| S5 | /reviews | Список отзывов | Список или EmptyState, табы переключаются |
| S6 | /reports | Отчёт о продажах | Фильтры работают, таблица или EmptyState |
| S7 | /balance | Баланс | Метрики, форма заявки, история без 500 |
| S8 | /notifications | Уведомления | Список или EmptyState, фильтры по типу |
| S9 | /settings | Настройки | Форма отображается, сохранение работает |

**Критерии успеха:** Нет 500/404, нет зависших спиннеров, в DevTools Console нет красных JS-ошибок.

---

## Critical Path — Admin (`/admin`)

| # | URL | Шаги | Ожидаемый результат |
|---|-----|------|---------------------|
| A1 | /login | Вход | Редирект на Dashboard |
| A2 | / | Dashboard | StatCard, метрики, без 500 |
| A3 | /events | Список событий | DataTable, фильтры, без 500 |
| A4 | /orders | Список заказов | Таблица, без 500 |
| A5 | /checkout | Checkout-сессии | Карточки/таблицы, фильтры |
| A6 | /payouts | Выплаты | DataTable, статусы |
| A7 | /suppliers | Поставщики | DataTable, Trust-бейджи |
| A8 | /moderation | Очередь модерации | Список, сортировка по trust |
| A9 | /reviews | Отзывы | Вкладки, списки |
| A10 | /support | Поддержка | Список тикетов |
| A11 | /settings | Настройки | Форма, Ops-опции |

**Критерии успеха:** Нет 500/404, нет зависших спиннеров, DevTools без красных JS-ошибок.

---

## Расширенный чек-лист (при необходимости)

### Supplier — полный обход

- [ ] /login — вход, refresh token
- [ ] /register — регистрация
- [ ] / — Dashboard (trust, attention, sales)
- [ ] /events — список
- [ ] /events/new — создание
- [ ] /events/:id — редактирование
- [ ] /reviews — список, табы
- [ ] /reviews/:id — деталь, ответ/оспоривание
- [ ] /notifications — список, фильтры
- [ ] /reports — отчёт, экспорт
- [ ] /balance — баланс, заявка на вывод
- [ ] /settings — настройки компании

### Admin — основные разделы

- [ ] Dashboard
- [ ] Events, Cities, Venues, Tags
- [ ] Landings, Collections, Combos, Articles
- [ ] Orders, Checkout, Payouts
- [ ] Suppliers, Moderation
- [ ] Reviews, External Reviews
- [ ] Support
- [ ] Settings, Jobs, Audit, SEO

---

## Примечания

- При отсутствии автотестов Critical Path — основной способ проверки стабильности.
- Рекомендуется выполнять Critical Path перед коммитом UX-изменений (Phase A/B).
- Результаты фиксировать: дата, прохождение S1–S9 / A1–A11, найденные ошибки.
