# Checkout / Widgets — единая история (archive merged)

Назначение: один вход для всей исторической документации по цепочке **Widget Read API → Checkout → Payment → Webhook → Fulfillment → Stats/Last customer**.

- **Канон (актуальные инварианты):** `docs/core/checkout.md`
- **Этот файл:** удобная “сборка” ссылок + краткие выжимки, чтобы **не читать 4 файла по кругу**.

---

## Состав (источники)

1) `docs/archive/PR-C.md` — краткое “что такое C0…C7” (сводка PR’ов).  
2) `docs/archive/PR-C2-C5-Spec.md` — контракты запрос/ответ + holds/SQL + план ручного тестирования.  
3) `docs/archive/PR-C0-C7-Audit.md` — аудит пробелов/рисков до имплементации.  
4) `docs/archive/PR-C0-C7-Final.md` — итоговое состояние + E2E validation pass + зафиксированные правила.

---

## Быстрая навигация: что читать в зависимости от задачи

- **Нужно понять “как работает пайплайн” без деталей** → `PR-C.md` + канон `docs/core/checkout.md`
- **Нужно понять контракты API / ошибки / payload** → `PR-C2-C5-Spec.md` (раздел B)
- **Нужно понять, что было рискованно/сломано раньше** → `PR-C0-C7-Audit.md` (разделы 2–5)
- **Нужно понять финальные правила + edge cases** → `PR-C0-C7-Final.md` (разделы 6–9)

---

## Носители “load‑bearing” правил (ориентиры)

### `bestOption`

- Канон: `docs/core/checkout.md` (и ссылка на историю)
- История/обоснование: `PR-C0-C7-Final.md` §6, `PR-C.md` (C2)

### Holds / effectiveAvailable

- История реализации и предостережения по перфу: `PR-C2-C5-Spec.md` §C
- Итоговая политика AWAITING_PAYMENT: `PR-C.md` (C4), `PR-C0-C7-Final.md` §1/§2

### Idempotency (webhook / payment)

- История: `PR-C.md` (C5), `PR-C0-C7-Final.md` §8.2

### Late payment after expiry

- История политики и проверка edge case: `PR-C.md` (C4), `PR-C0-C7-Final.md` §8.2

---

## Ссылки на источники

- `docs/archive/PR-C.md`
- `docs/archive/PR-C2-C5-Spec.md`
- `docs/archive/PR-C0-C7-Audit.md`
- `docs/archive/PR-C0-C7-Final.md`

