# Ticket provider capability matrix (v0.1)

Стартовая матрица для проектирования; значения **UNKNOWN** в продукте отражаются консервативными `capabilities: false` до подтверждения спецификацией.

| Provider | Class | Protocol | Integration priority | Notes |
|----------|--------|----------|---------------------|--------|
| Qtickets | CORE_REST | REST JSON | Wave 1 | Хороший кандидат на первый live REST-адаптер |
| Radario | CORE_REST | REST JSON | Wave 1 | Эталонный REST-скaffold в репозитории |
| Intickets | CORE_REST | REST JSON | Wave 1–2 | Нужны доки и доступы |
| Edinoe Pole | CORE_REST | REST JSON | Wave 1–2 | Нужны спецификация и доступы |
| Yandex Tickets | ENTERPRISE_GATED | REST JSON | Wave 3 | Партнёрский контур |
| Mos.ru / Russpass | ENTERPRISE_GATED | REST JSON | Wave 4 | OAuth2 / certs, аппрув |
| TicketNet / Infotech | LEGACY_SOAP | SOAP XML | Отдельный трек | Только через soap-client слой |
| Lanit | CUSTOM_PARTNER | CUSTOM | Отдельный трек | Часто кастом под объект |

Внутренние / уже используемые:

| Provider | Role |
|----------|------|
| MANUAL | Ручной контур, нет внешнего API в адаптере |
| TICKETS_CLOUD | Legacy + дескриптор под будущий оркестратор; sync остаётся в catalog |
| TEPLOHOD | Аналогично |

Детальные флаги capabilities см. в коде: `packages/backend/src/integrations/contracts/provider-capabilities.ts` и дескрипторы в `packages/backend/src/integrations/providers/`.

Подготовка Wave 1 (env, HTTP-слой Radario/Qtickets без путей API): [Wave1-Radario-Qtickets-Prep.md](Wave1-Radario-Qtickets-Prep.md).
