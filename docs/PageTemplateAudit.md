# Аудит шаблонов фронта — соответствие PageTemplateSpecs

> Дата: 19.02.2026. Спецификация: `docs/PageTemplateSpecs.md`.

---

## 1. Мероприятия (EVENT) — `/events/[slug]`

| Блок | Спецификация | Реализовано | Примечание |
|------|--------------|-------------|------------|
| Hero | всегда | ✓ | Есть |
| Ближайший сеанс | стандартно | ✓ | nextSession |
| Цена «от X ₽» | при priceFrom > 0 | ✓ | priceFrom |
| **Программа / сет-лист** | templateData.program | ❌ | templateData не отдаётся в API, блоков нет |
| **Состав (артисты)** | templateData.cast | ❌ | Админка есть (EventTemplateFields), API/фронт — нет |
| **Зал / площадка** | venueId или tcData.venue | ⚠️ | Venue name через getVenueName(tcData), hall/capacity — нет |
| Расписание сеансов | при sessions.length > 0 | ✓ | Sessions list |
| Правила | EventOverride / Venue.faq | ❌ | Нет блока |
| Как добраться | address, metro | ⚠️ | address в Quick info, metro — на venue |
| Галерея | galleryUrls | ✓ | Есть |
| Описание | description | ✓ | Есть |
| Отзывы | стандартно | ✓ | ReviewSection |
| Похожие события | relatedEvents | ✓ | Есть |
| Возраст minAge | бейдж | ✓ | Блок «от N лет» |

**Вывод:** program, cast, hall не выводятся. EventOverride.templateData мержится только в applyOverrides (списки), но getEventBySlug не применяет override.

---

## 2. Музеи (MUSEUM) — `/venues/[slug]` + Event с venueId

| Блок | Спецификация | Реализовано | Примечание |
|------|--------------|-------------|------------|
| Hero | всегда | ✓ | Есть |
| Режим работы | Venue.openingHours | ✓ | normalizeHours, таблица |
| Цена «от X ₽» | priceFrom | ✓ | Есть |
| Галерея | galleryUrls | ✓ | Есть |
| Текущие выставки | venue.exhibitions | ✓ | permanentExhibitions, temporaryExhibitions |
| Как добраться | address, metro | ✓ | Есть |
| **Правила посещения** | Venue.features, highlights | ⚠️ | features выводятся как чипы, highlights — отдельно |
| Описание | description | ✓ | Есть |
| Отзывы | VenueReviewsBlock | ✓ | Есть |
| FAQ | venue.faq | ✓ | Есть + JSON-LD FAQPage |
| Highlights | venue.highlights | ✓ | Есть |

**Вывод:** Музейные фичи в целом реализованы. features, highlights, faq — есть.

---

## 3. Экскурсии (EXCURSION) — `/events/[slug]` category=EXCURSION

| Блок | Спецификация | Реализовано | Примечание |
|------|--------------|-------------|------------|
| Hero | всегда | ✓ | Общий шаблон event |
| Маршрут | templateData.route | ❌ | templateData не в API |
| Меню | templateData.menu (RIVER) | ❌ | templateData не в API |
| Теплоход | templateData.shipName (RIVER) | ❌ | templateData не в API |
| Правила | templateData | ❌ | — |

**Вывод:** EXCURSION-специфичные блоки (route, menu, shipName) из templateData не выводятся.

---

## 4. Общие замечания

- **EventOverride.templateData** — хранится в БД, админка (EventTemplateFields) умеет редактировать program, cast, hall, route, menu, shipName.
- **API getEventBySlug** — не включает override, не мержит templateData в ответ.
- **Фронт /events/[slug]** — единый шаблон для всех категорий, без условных блоков program/cast/hall.

---

## 5. Рекомендации

1. **API:** Добавить в getEventBySlug мерж override (в т.ч. templateData) для единичного события.
2. **Фронт EVENT:** Блоки «Программа», «Состав», «Зал» при наличии templateData.program, templateData.cast, templateData.hall.
3. **Фронт EXCURSION:** Блоки «Маршрут», «Меню», «Теплоход» при templateData.route, templateData.menu, templateData.shipName.
4. **Venue.capacity:** Поле не в схеме; для залов добавить при необходимости.
