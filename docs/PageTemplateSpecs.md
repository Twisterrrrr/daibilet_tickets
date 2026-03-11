# PageTemplateSpecs — гибридная модель полей Event / Venue

> **Принцип:** не «всё в templateData», а 4 слоя: Core columns, Structured details, Content blocks (JSON), Inherited policy.

---

## 1. Главное правило

Поля, которые участвуют в **фильтрах**, **SEO**, **listing/card/PDP** как структурированные сущности, **availability/checkout** — хранятся в **колонках**.

Контентные блоки страницы (программа, меню, маршрут-описание) — в **JSON**.

---

## 2. Четыре слоя данных

| Слой | Где | Примеры |
|------|-----|---------|
| **A. Core** | Колонки Event / Venue | category, subcategory, ageLimit, meetingPoint, venueType |
| **B. Structured details** | Отдельные таблицы или typed JSON | EventExcursionDetails (на будущее) |
| **C. Content blocks** | `contentTemplateData` / `venueTemplateData` | routeDescription, program, menu, cast |
| **D. Inherited policy** | refundPolicyMode + refundPolicyText | наследование Supplier → Venue → Event |

---

## 3. Event — целевая модель

### Core (колонки)

| Поле | Тип | Описание |
|------|-----|----------|
| ageLimit | Int? | Возрастное ограничение (6+, 12+, 18+) |
| meetingPoint | String? | Точка сбора |
| boardingPierId | String? | Причал отправления (если есть сущность Pier) |
| disembarkPierId | String? | Причал прибытия |
| routeSummary | String? | Короткий структурированный маршрут |
| refundPolicyMode | enum | INHERIT_SUPPLIER \| INHERIT_VENUE \| CUSTOM |
| refundPolicyText | Text? | Текст при CUSTOM |

### contentTemplateData (JSON)

| Поле | Тип | Описание |
|------|-----|----------|
| routeDescription | string | Длинное описание маршрута |
| program | string | Программа / сет-лист |
| menu | string | Меню (RIVER, GASTRO) |
| cast | string | Состав (артисты, ведущие) |
| advantages | string[] | Преимущества |
| bookingRules | string | Условия бронирования |
| visitRules | string | Правила посещения (не refund!) |
| visitorTips | string | Советы посетителям |
| extraFaq | {q, a}[] | Доп. FAQ |

**Важно:** `routeSummary` — колонка (структурированно), `routeDescription` — JSON (контент).

---

## 4. Venue — целевая модель

### Core (колонки)

- venueType — уже есть
- description, openingHours, highlights, faq — уже есть
- refundPolicyMode, refundPolicyText — добавить

### venueTemplateData (JSON)

| VenueType | Поля |
|-----------|------|
| MUSEUM | collections, audioGuide, interactive, permanentExhibitions, currentExhibitions |
| GALLERY | currentExhibitions, exhibitionSchedule |
| THEATER | halls, acoustics, cloakroom |
| PALACE, PARK | seasonality, gardens, accessibilityNotes |

---

## 5. Supplier

| Поле | Описание |
|------|----------|
| defaultRefundPolicyText | Text? | Дефолтный текст возврата/обмена |
| defaultRefundPolicyUpdatedAt | DateTime? | Когда обновлён |

---

## 6. Refund policy — наследование

### Event

```ts
enum EventRefundPolicyMode {
  INHERIT_SUPPLIER
  INHERIT_VENUE
  CUSTOM
}
```

1. CUSTOM + refundPolicyText → свой текст  
2. INHERIT_VENUE → resolveVenueRefundPolicy(venue, supplier)  
3. INHERIT_SUPPLIER → supplier.defaultRefundPolicyText  
4. fallback → системный дефолт  

### Venue

```ts
enum VenueRefundPolicyMode {
  INHERIT_SUPPLIER
  CUSTOM
}
```

1. CUSTOM → свой текст  
2. INHERIT_SUPPLIER → supplier.defaultRefundPolicyText  
3. fallback → системный дефолт  

### API

Отдавать: `refundPolicyMode`, `refundPolicyTextRaw`, `refundPolicyResolved`.

---

## 7. Schema registry

Единый реестр для category/subcategory и venueType:

```ts
type TemplateFieldSpec = {
  key: string;
  label: string;
  storage: 'COLUMN' | 'CONTENT_JSON';
  required: boolean;
  inputType: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'richtext';
  categories?: string[];
  subcategories?: string[];
  venueTypes?: string[];
};

type TemplateSpec = {
  entity: 'EVENT' | 'VENUE';
  type: string;
  sections: { key: string; title: string; fields: TemplateFieldSpec[] }[];
};
```

Файл: `packages/shared/src/content/page-template-specs.ts` (или в backend).

---

## 8. Этапы внедрения

| Этап | Задача |
|------|--------|
| 1 | Зафиксировать архитектуру (core vs content JSON vs inherited policy) |
| 2 | Добавить refund policy на Supplier / Venue / Event |
| 3 | Добавить contentTemplateData, venueTemplateData + JSON schema |
| 4 | Перенастроить админку на schema registry |
| 5 | Постепенно выносить из templateData в колонки поля для фильтров/SEO |

---

## 9. Текущее состояние vs целевое

**Было:**
- EventOverride.templateData — смесь route, shipName, menu, program, cast, hall, rules
- Venue — фиксированные поля, нет venueTemplateData, нет refundPolicy

**Сделано (MVP+):**
- Event: core columns + contentTemplateData (в EventOverride) + refundPolicy
- Venue: core + venueTemplateData + refundPolicy
- Operator (Supplier): defaultRefundPolicyText
- RefundPolicyResolutionService, schema registry, shared types

---

## 10. Cursor-промпт для реализации

> Сохранён для запуска при готовности к внедрению.

```
Нужно внедрить в проект Daibilet архитектуру шаблонов полей для Event/Venue не как "всё в templateData", а как гибридную модель:
1) core-колонки для структурированных полей,
2) JSON-поле для контентных блоков страницы,
3) отдельный наследуемый слой для правил обмена/возврата билетов.

Цель: Event (core + contentTemplateData + refundPolicy), Venue (core + venueTemplateData + refundPolicy), Supplier (defaultRefundPolicyText).

Добавить:
- Event: ageLimit, meetingPoint, boardingPierId, disembarkPierId, routeSummary, refundPolicyMode, refundPolicyText, contentTemplateData
- Venue: refundPolicyMode, refundPolicyText, venueTemplateData
- Supplier: defaultRefundPolicyText

Реализовать RefundPolicyResolutionService (resolveVenueRefundPolicy, resolveEventRefundPolicy).

Создать page-template-specs.ts — schema registry для category/subcategory/venueType.

См. docs/PageTemplateSpecs.md для деталей.
```
