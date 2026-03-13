# Content Model — гибридная архитектура полей

> Core vs content JSON vs inherited refund policy.  
> См. также [PageTemplateSpecs.md](PageTemplateSpecs.md).

---

## Три слоя данных

### 1. Core (колонки)

Структурированные поля для фильтров, SEO, listing, checkout:

- **Event:** meetingPoint, routeSummary, boardingPierId, disembarkPierId, refundPolicyMode, refundPolicyText
- **Venue:** venueType, description, openingHours, highlights, faq, refundPolicyMode, refundPolicyText
- **Supplier (Operator):** defaultRefundPolicyText

### 2. Content JSON

PDP-контент (типизированный JSON):

- **Event:** `contentTemplateData` — routeDescription, program, menu, cast, advantages, bookingRules, visitRules, visitorTips, extraFaq
- **Venue:** `venueTemplateData` — collections, halls, cloakroom, seasonality и т.п.

### 3. Refund policy (наследование)

- **Supplier** → defaultRefundPolicyText  
- **Venue:** refundPolicyMode (INHERIT_SUPPLIER | CUSTOM), refundPolicyText  
- **Event:** refundPolicyMode (INHERIT_SUPPLIER | INHERIT_VENUE | CUSTOM), refundPolicyText  

Резолв: CUSTOM → свой текст; INHERIT_VENUE → venue; INHERIT_SUPPLIER → supplier; fallback → системный дефолт.

---

## Разделение правил

- **refundPolicy** — правила возврата/обмена (отдельно, наследуемо)
- **bookingRules** — условия бронирования (контент, в contentTemplateData)
- **visitRules** — правила посещения (контент, в contentTemplateData)

---

## API

Для Event/Venue отдаём:

- `refundPolicyMode`, `refundPolicyText` — как хранятся
- `refundPolicyResolved` — итоговый текст после резолва наследования
