# Wave 1: подготовка Radario и Qtickets (без доступа к API)

Цель — иметь **единый HTTP-слой**, **переменные окружения** и **ошибки «не настроено»**, чтобы после получения спецификации от вендоров осталось только добавить пути, мапперы и вызовы из `ProviderSyncService` / чекаута.

## Переменные окружения (backend)

### Radario

| Переменная | Обязательно для live | Описание |
|------------|----------------------|----------|
| `RADARIO_BASE_URL` | да | Базовый URL API (без завершающего `/` или с — оба варианта поддержаны при склейке путей) |
| `RADARIO_BEARER_TOKEN` | да | Bearer-токен для заголовка `Authorization` |

Дескриптор в коде: `ProviderAccountAuthType.BEARER`, `REST_JSON`.

### Qtickets

| Переменная | Обязательно для live | Описание |
|------------|----------------------|----------|
| `QTICKETS_BASE_URL` | да | Базовый URL API |
| `QTICKETS_API_KEY` | да | Секрет для API |
| `QTICKETS_API_KEY_HEADER` | нет | Имя заголовка (по умолчанию `X-Api-Key`); уточнить по официальной доке |

Дескриптор: `API_KEY`, `REST_JSON`.

**Секреты не логировать.** В логах и сообщениях об ошибках используются только метки провайдера и HTTP-статус.

## Код

- Общий fetch: `packages/backend/src/integrations/http/ticket-provider-json-fetch.ts` (таймаут, JSON, ошибки `TicketProviderHttpError`).
- Ошибка «интеграция не готова»: `ProviderIntegrationNotConfiguredError` (HTTP 503, код `PROVIDER_NOT_CONFIGURED`).
- Сервисы: `RadarioIntegrationEnv`, `RadarioHttpService`, `QticketsIntegrationEnv`, `QticketsHttpService` — зарегистрированы в `IntegrationsModule` и **экспортируются** для будущих синков/оркестрации.

Методы `getJson` / `postJson` принимают **только path** относительно `*_BASE_URL`; конкретные пути **не зашиты** — их задаёт реализация после чтения документации вендора.

## Чеклист при появлении вендора

1. Заполнить env на sandbox/stage, проверить `isReady()` (через инъекцию сервисов или временный admin smoke — по отдельной задаче).
2. Зафиксировать в репозитории **официальные** base URL и список эндпоинтов (в комментариях к адаптеру или в этом файле — без секретов).
3. Реализовать маппинг ответов → внутренние DTO / `EventProviderLink` / сеансы.
4. Включить capability-флаги в `getDescriptor()` по факту поддержки (webhooks, create order и т.д.).
5. Добавить интеграционные тесты с `fetch`-mock или записанными фикстурами.

См. также: [TicketProviderCapabilityFoundation.md](TicketProviderCapabilityFoundation.md), [TicketProviderCapabilityMatrix.md](TicketProviderCapabilityMatrix.md).
