# Ticket provider capability foundation (B2B)

## Зачем

Платформа должна подключать десятки внешних источников билетов (REST, SOAP, enterprise-гейт, кастом). Единый «толстый» контракт для всех ломает SOAP и gated API. Нужны **реестр**, **capability-matrix**, **маршрутизация** и **учёт внешних заказов** без provider-specific ветвлений в контроллерах чекаута.

## ProviderDescriptor (first-class)

Минимальный дескриптор (все решения — только через него + `assertCapability`):

- `code` — `TicketProviderCode` (Prisma)
- `protocolType` — `REST_JSON` | `SOAP_XML` | `CUSTOM`
- `operationalClass` — `CORE_REST` | `ENTERPRISE_GATED` | `LEGACY_SOAP` | `CUSTOM_PARTNER`
- `authType` — `ProviderAccountAuthType`
- `capabilities` — набор булевых флагов (см. `provider-capabilities.ts`)

`displayName` для админки — отдельно (`TICKET_PROVIDER_DISPLAY_LABEL`), не в core-дескрипторе.

## Legacy совместимость

- `Event.source` (`TC` | `TEPLOHOD` | `MANUAL`) и `tcEventId` **сохраняются**.
- Fallback маршрутизации: `TC` → `TICKETS_CLOUD`, `TEPLOHOD` → `TEPLOHOD`, `MANUAL` → `MANUAL`.
- Приоритет: активный primary `EventProviderLink` → `Event.defaultProvider` → legacy `source`.

## Prisma (кратко)

- `Event.defaultProvider` — предпочтительный провайдер без явной ссылки.
- `EventProviderLink` / `EventSessionProviderLink` — связь с внешними ID; `@@unique([provider, externalEventId])` и аналог для сеансов.
- `ExternalOrderLink` — внешний заказ: `status` (итог у провайдера) и **`integrationState`** (этап пайплайна: ожидание webhook, reconcile и т.д.).
- `ProviderWebhookLog` — сырой вход; `NO_OP_UNSUPPORTED` если webhooks у провайдера нет.
- `ProviderAccountConfig` — `environment` SANDBOX/PRODUCTION, URL и JSON учётных данных (в API не отдавать без mask).

## Маршрутизация и отладка

- `ProviderRoutingService.resolveForEvent(eventId)` — пара `(descriptor, adapter)`.
- `resolveProviderDebug(eventId)` — `{ strategy, provider, reason }` для поддержки.
- Admin: `GET /api/v1/admin/integrations/routing/debug?eventId=`.

## Webhooks

- `POST /api/v1/webhooks/providers/:providerCode`
- Известный провайдер без `supportsWebhooks`: **204**, запись в лог с `NO_OP_UNSUPPORTED` (не шумим 4xx партнёрам).
- Некорректный код в URL — **400**.

## REST vs SOAP

- REST-адаптеры опираются на `integrations/clients/rest-client.ts` (заготовка).
- SOAP — `integrations/clients/soap-client.ts`; TicketNet и др. не должны тащить XML-транспорт в общий REST-код.

## Платежи vs билеты

- `PaymentIntent.provider` — платёжный контур (YooKassa и т.д.).
- `TicketProviderCode` — билетные партнёры; не смешивать.

## Follow-ups

- Предподготовка Wave 1 (env + HTTP без путей API): [Wave1-Radario-Qtickets-Prep.md](Wave1-Radario-Qtickets-Prep.md).
- Реальные адаптеры Radario, Qtickets, Intickets, Edinoe Pole.
- SOAP-клиент TicketNet.
- Yandex / Mos.ru / Lanit: onboarding, сертификаты, подпись.
- `createExternalOrder` в оркестрации и связь с `CheckoutSession` (см. TODO в `checkout.service.ts`).
- Reconcile job, UI аккаунтов провайдеров.

См. также: [TicketProviderCapabilityMatrix.md](TicketProviderCapabilityMatrix.md), матрица в Tasktracker.
