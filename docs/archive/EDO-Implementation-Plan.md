# План внедрения ЭДО — отправка закрывающих документов

> 2026-03-21. На основе `docs/finance.md` §8 P4.

---

## 1. Цель

Реализовать возможность **отправки закрывающих документов поставщикам через оператора электронного документооборота (ЭДО)**: отчёты агента, акты, УПД/счёт-фактура — вместо ручной отправки PDF по email.

---

## 2. Текущее состояние (из документации)

### 2.1. Что уже есть

| Компонент | Статус |
|-----------|--------|
| `SupplierReport` | Реализовано. Агрегация по леджеру, snapshot юр. профиля. |
| `SupplierDocument` | Реализовано. Типы: AGENT_REPORT, COMMISSION_ACT, PAYOUT_STATEMENT. |
| `SupplierDocumentFile` | Реализовано. JSON_SNAPSHOT, PDF (stub-HTML). |
| `SupplierDocumentService.generateDocumentsForReport` | Реализовано. Payload с НДС по Tax Matrix. |
| `buildVatDocumentPayload` | Реализовано. Формулы net/vat/commission. |
| `DocumentNumberService` | Реализовано. Нумерация ГГГГ-XXXXXX. |
| `SupplierLegalProfile` | Реализовано (P3). Реквизиты, taxMode, docsEmail. |

### 2.2. Чего нет (P4)

- **Интеграция с оператором ЭДО** — транспорт и подпись документов.
- **Модели**: `SupplierEdoProfile`, `EdoDelivery`, webhook-логирование.
- **Интерфейс**: `EdoProvider` для абстракции оператора.
- **Обработка статусов** подписи (отправлен → подписан получателем → отклонён).

---

## 3. Выбор оператора ЭДО

### 3.1. Кандидаты

| Оператор | Плюсы | Минусы |
|----------|-------|--------|
| **Диадок** | Лидер рынка, API для интеграций, XSD-схемы ФНС | Стоимость, нужна КЭП для подписи |
| **СБИС** | Широкая клиентская база | API менее открытый для внешней интеграции |
| **1С-ЭДО** | Удобно для 1С-клиентов | Привязка к экосистеме 1С |

**Рекомендация:** Диадок — наиболее документированный API для программной интеграции ([developer.kontur.ru/docs/diadoc-api](https://developer.kontur.ru/docs/diadoc-api)).

### 3.2. Концепция Диадок API

- **PostMessage (V3)** — отправка документа в ящик получателя.
- **MessageToPost**: `FromBoxId`, `ToBoxId`, `DocumentAttachments[]`.
- **DocumentAttachment**: XML-документ (base64), подпись (base64), `TypeNamedId`, `Function`, `Version`.
- **Требования**: XML по XSD ФНС, подпись КЭП (API не создаёт подпись — нужно генерировать самим или через отдельный сервис).
- **Webhook/события** — уведомления о доставке, подписании (нужно уточнить в актуальной документации).

---

## 4. Архитектура решения

### 4.1. Интерфейс EdoProvider

```typescript
interface EdoProvider {
  /** Регистрация поставщика в ЭДО (ящик, ИНН и т.д.). */
  registerSupplier(operatorId: string, legalProfile: LegalProfileSnapshot): Promise<EdoProfileResult>;

  /** Отправка документа в ЭДО. */
  sendDocument(params: EdoSendParams): Promise<EdoSendResult>;

  /** Проверка статуса доставки. */
  getDeliveryStatus(deliveryId: string): Promise<EdoDeliveryStatus>;
}

interface EdoSendParams {
  documentId: string;           // SupplierDocument.id
  operatorId: string;
  reportId: string;
  documentType: SupplierDocumentType;
  xmlContent: Buffer;           // XML по XSD ФНС
  recipientBoxId: string;       // ящик получателя
}

interface EdoSendResult {
  deliveryId: string;
  messageId?: string;
  status: 'SENT' | 'DELIVERED' | 'SIGNED' | 'REJECTED' | 'ERROR';
}
```

### 4.2. Модели данных (Prisma)

```prisma
// Профиль поставщика в ЭДО
model SupplierEdoProfile {
  id              String   @id @default(cuid())
  operatorId      String   @unique @db.Uuid
  provider        String   // DIADOK | SBIS | ...
  boxId           String?  // идентификатор ящика в ЭДО
  inn             String
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  operator Operator @relation(fields: [operatorId], references: [id])
  deliveries EdoDelivery[]
}

// Отправка документа в ЭДО
model EdoDelivery {
  id                String   @id @default(cuid())
  supplierDocumentId String
  supplierEdoProfileId String
  providerDeliveryId String?  // ID в системе оператора
  status            EdoDeliveryStatus @default(PENDING)
  sentAt            DateTime?
  deliveredAt       DateTime?
  signedAt          DateTime?
  rejectedAt        DateTime?
  errorMessage      String?  @db.Text
  metaJson          Json?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  document  SupplierDocument    @relation(fields: [supplierDocumentId], references: [id])
  edoProfile SupplierEdoProfile @relation(fields: [supplierEdoProfileId], references: [id])
}

enum EdoDeliveryStatus {
  PENDING      // в очереди
  SENT         // отправлен в ЭДО
  DELIVERED    // доставлен в ящик получателя
  SIGNED       // подписан получателем
  REJECTED     // отклонён
  ERROR        // ошибка отправки
}
```

### 4.3. Профиль платформы (Daibilet)

Платформа выступает агентом и отправителем документов. Нужен:

- Ящик Диадок (FromBoxId) — на юрлицо платформы.
- КЭП для подписания исходящих документов (либо интеграция с облачной подписью).
- Конфиг: `EDO_PROVIDER`, `EDO_API_KEY`, `EDO_BOX_ID`.

---

## 5. Этапы внедрения

### Этап 1: Инфраструктура (1–2 нед.) — ✅ РЕАЛИЗОВАН (2026-03)

| Задача | Описание | Статус |
|--------|----------|--------|
| 1.1 | Миграция Prisma: `SupplierEdoProfile`, `EdoDelivery`, `EdoDeliveryStatus`, `EdoProviderType`. | ✅ |
| 1.2 | ENV: `EDO_PROVIDER`, `EDO_API_KEY`, `EDO_BOX_ID`, `EDO_ENABLED`. | ✅ |
| 1.3 | Модуль `EdoModule` с заглушкой `NoopEdoProvider`, `EdoProviderRegistry`. | ✅ |
| 1.4 | API: `GET/PUT /admin/suppliers/:id/edo-profile` — привязка профиля ЭДО к поставщику. | ✅ |
| 1.5 | API: `GET /admin/documents/:id/edo-deliveries`, `POST send-to-edo`, `POST edo-deliveries/:id/refresh`. | ✅ |

### Этап 2: Конвертация в XML (2–3 нед.)

| Задача | Описание |
|--------|----------|
| 2.1 | Изучение XSD-схем ФНС для УПД, счёт-фактура, акт. |
| 2.2 | Сервис `EdoXmlBuilder`: преобразование `SupplierDocument.payloadJson` → XML по XSD. |
| 2.3 | Поддержка типов: `AGENT_REPORT` (акт), `UPD_1` / `UPD_2` (если потребуется). |
| 2.4 | Юнит-тесты на соответствие XSD. |

### Этап 3: Подпись и отправка (2–3 нед.)

| Задача | Описание |
|--------|----------|
| 3.1 | Интеграция с КЭП: подписание XML (CryptoPro / облачная подпись). |
| 3.2 | Реализация `DiadokEdoProvider` (HTTP-клиент к API Диадок). |
| 3.3 | `EdoDeliveryService.sendDocument(documentId)` — вызов провайдера, сохранение EdoDelivery. |
| 3.4 | Admin UI: кнопка «Отправить в ЭДО» на карточке документа. |
| 3.5 | Очередь (BullMQ) для асинхронной отправки при больших объёмах. |

### Этап 4: Webhook и статусы (1–2 нед.)

| Задача | Описание |
|--------|----------|
| 4.1 | Webhook endpoint для событий Диадок (доставка, подпись, отклонение). |
| 4.2 | Обновление `EdoDelivery.status` по webhook. |
| 4.3 | UI: отображение статуса доставки в карточке документа. |

### Этап 5: UX и аудит (1 нед.)

| Задача | Описание |
|--------|----------|
| 5.1 | ЛК поставщика: раздел «Документы в ЭДО», фильтр по статусу. |
| 5.2 | AuditLog при отправке в ЭДО (кто, когда, documentId). |
| 5.3 | Документация: runbook подключения ЭДО, настройка ящиков. |

---

## 6. Зависимости и риски

### Зависимости

- **P3 завершён** — `SupplierLegalProfile`, snapshot в отчётах.
- **P3.1** — payload НДС-документов (buildVatDocumentPayload) уже есть.
- **Юр. лицо платформы** — ящик в Диадоке, КЭП.

### Риски

| Риск | Митигация |
|------|-----------|
| Сложность XSD/XML | Использовать готовые библиотеки генерации (если есть для Node.js) или минимальный набор полей. |
| КЭП на сервере | Рассмотреть облачную подпись (Диадок, Калуга.Астрал). |
| Стоимость Диадок | Оценить тарифы, при необходимости рассмотреть СБИС/других. |

---

## 7. Альтернативный упрощённый сценарий (MVP)

Если полная интеграция с ЭДО откладывается:

1. **Email-отправка PDF** — расширить `SupplierDocumentService`: при `GENERATED` вызывать `MailService` с вложением PDF на `SupplierLegalProfile.docsEmail`. Документ уже генерируется, остаётся добавить рендер в PDF и отправку.
2. **Ссылка на скачивание** — в ЛК поставщика дать ссылку на PDF документа (временная или постоянная).
3. **ЭДО — Phase 2** — после стабилизации email/PDF перейти к полной интеграции.

---

## 8. Ссылки

- [Диадок API — документация](https://developer.kontur.ru/docs/diadoc-api)
- [Отправка сообщения с документом (PostMessage)](https://developer.kontur.ru/docs/diadoc-api/instructions/documents/senddocs.html)
- [XSD-схемы ФНС](https://developer.kontur.ru/docs/diadoc-api/docflows/formats.html#xsd)
- [finance.md](finance.md) — текущая архитектура финансового домена
