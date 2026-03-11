# PageTemplateSpecs — шаблоны полей для типов контента

> Черновик для обсуждения. Вопросы — в конце документа.

---

## 1. Текущее состояние

### Event (EventOverride.templateData)

| Категория | Подкатегории | Поля (JSON) | Реализовано |
|-----------|--------------|-------------|-------------|
| EXCURSION | RIVER, WALKING, BUS, ... | route, shipName*, menu*, rules, advantages, bookingRules | ✓ EventTemplateFields, TemplateDataBlocks |
| MUSEUM | MUSEUM_CLASSIC, EXHIBITION, GALLERY, ... | rules | ✓ Минимальный набор |
| EVENT | CONCERT, SHOW, THEATER, ... | program, cast, hall, rules | ✓ |

\* shipName, menu — только для RIVER.

**Доп. поля в каталоге:** groupSize (из templateData) — для карточек.

### Venue (модель Prisma)

**Фиксированные поля** (нет templateData):

- description, shortDescription
- openingHours (JSON)
- highlights (JSON)
- faq (JSON)
- features (string[])
- galleryUrls, address, metro, phone, email, website
- priceFrom, rating, reviewCount

**VenueType:** MUSEUM, GALLERY, ART_SPACE, EXHIBITION_HALL, THEATER, PALACE, PARK.

**Проблема:** все типы площадок используют одни и те же поля. Специфичных полей по VenueType нет.

---

## 2. Предлагаемая структура по типам

### 2.1 Экскурсии (Event.category = EXCURSION)

#### Общие для всех подкатегорий

| Поле | Тип | Описание |
|------|-----|----------|
| route | string | Маршрут / основные точки |
| rules | string | Правила (одежда, что брать и т.п.) |
| advantages | string | Преимущества («прогулка вам понравится») |
| bookingRules | string | Условия бронирования и возврата |

#### RIVER

| Поле | Тип | Описание |
|------|-----|----------|
| shipName | string | Название теплохода |
| menu | string | Меню (если есть питание) |
| pier | string | Причал отправления (?) |
| durationNote | string | Особенности длительности (?) |

#### BUS / WALKING

| Поле | Тип | Описание |
|------|-----|----------|
| meetingPoint | string | Точка сбора (если не в address) |
| routePoints | string[] | Пункты маршрута по порядку (?) |

#### QUEST

| Поле | Тип | Описание |
|------|-----|----------|
| difficulty | string | Уровень сложности (?) |
| teamSize | string | Рекомендуемый состав (?) |

#### GASTRO

| Поле | Тип | Описание |
|------|-----|----------|
| menu | string | Меню / дегустация |
| dietary | string | Вегетарианские/безглютеновые опции (?) |

---

### 2.2 Площадки / музеи (Venue)

**Варианты хранения:**
- A) Оставить фиксированные поля (description, openingHours, highlights, faq) — без изменений.
- B) Добавить `venueTemplateData Json?` — по аналогии с Event.
- C) Добавить отдельные колонки для востребованных полей.

#### MUSEUM

| Поле | Где | Описание |
|------|-----|----------|
| collections | ? | Коллекции / экспозиции |
| audioGuide | boolean/string | Есть аудиогид |
| interactive | string | Интерактивные зоны |
| permanentExhibitions | string | Постоянная экспозиция |

#### GALLERY

| Поле | Где | Описание |
|------|-----|----------|
| currentExhibitions | string/array | Текущие выставки |
| exhibitionSchedule | string | Расписание смены экспозиций |

#### THEATER

| Поле | Где | Описание |
|------|-----|----------|
| halls | array | Залы (название, вместимость) |
| acoustics | string | Особенности акустики |
| cloakroom | string | Гардероб, правила |

#### PALACE / PARK

| Поле | Где | Описание |
|------|-----|----------|
| seasonality | string | Сезонность (парк, сад) |
| gardens | string | Сады, территории |
| accessibility | string | Доступность (инвалиды, коляски) |

---

### 2.3 Мероприятия (Event.category = EVENT)

#### Общие

| Поле | Тип | Описание |
|------|-----|----------|
| program | string[] | Программа / сет-лист |
| cast | {name, role}[] | Состав (артисты, ведущие) |
| hall | string | Зал / площадка |
| rules | string | Правила (опоздания, возвраты) |

#### Дополнительные (кандидаты)

| Поле | Подкатегория | Описание |
|------|--------------|----------|
| ageLimit | CONCERT, SHOW, STANDUP | Возрастное ограничение (6+, 12+, 18+) |
| premiere | THEATER, SHOW | Премьера / премьерный показ |
| acts | THEATER | Количество актов, антракт |
| language | THEATER, CONCERT | Язык спектакля / субтитры |
| teams | SPORT | Команды / участники |
| format | SPORT | Формат (матч, турнир и т.п.) |
| schedule | FESTIVAL | Расписание по дням/зонам |

---

## 3. Вопросы для ответов

### Общие

1. **Гранулярность подкатегорий:** Разводить поля по подкатегориям (RIVER, BUS, QUEST) или достаточно уровня категории (EXCURSION, EVENT)?

2. **Смешанные типы:** Нужны ли комбинированные форматы (например, RIVER + GASTRO — круиз с ужином)?

### Экскурсии

3. **meetingPoint, pier:** Вынести в общие поля Event (address, meetingPoint) или оставить в templateData?

4. **routePoints vs route:** Маршрут — один текстовый блок (route) или структурированный список пунктов (routePoints)?

5. **QUEST / GASTRO:** Какие поля реально нужны в MVP? difficulty, teamSize, dietary — приоритет?

### Площадки (Venue)

6. **venueTemplateData:** Вводить JSON по аналогии с Event или расширять схему фиксированными колонками?

7. **Коллекции / выставки:** Где хранить «текущие выставки» — в Venue или в связанных Event (категория MUSEUM, subcategory EXHIBITION)?

8. **THEATER.halls:** Нужна ли отдельная сущность Hall (зал с названием, вместимостью) или достаточно текстового описания?

### Мероприятия

9. **ageLimit:** Отдельное поле Event (audience, minAge) или в templateData?

10. **premiere, acts, language:** Какие поля добавлять в первую очередь? Есть ли реальный запрос от контент-редакторов?

11. **SPORT / FESTIVAL:** Специфика (команды, расписание) — в templateData или отдельная сущность?

### Хранение

12. **JSON vs колонки:** Для часто используемых полей (ageLimit, meetingPoint) — лучше отдельная колонка в Event/Override для фильтрации и индексации?

13. **Валидация:** Нужна ли строгая валидация templateData по JSON Schema в зависимости от category/subcategory?

---

## 4. Сводка решений (заполняется после ответов)

| # | Решение |
|---|---------|
| 1 | |
| 2 | |
| ... | |
