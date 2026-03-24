## Finance — Buyer, Supplier, Admin

> Последнее обновление: 2026-03-15

### 1. Обзор домена

Финансовый контур Daibilet строится вокруг нескольких слоёв:

- **Buyer**: покупатель и его заказы/платежи/билеты.
- **Checkout & Payments**: `CheckoutSession`, `PaymentIntent`, `FulfillmentItem`.
- **Ledger**: внутренний учёт по поставщику (`SupplierLedgerEntry`, `SupplierLedgerService`).
- **Supplier Reports & Documents**: агрегированные отчёты, акты, payout‑statement.
- **Payouts**: заявки на вывод (`SupplierPayoutRequest`) и их админ‑обработка.
- **ЭДО (P4 foundation)**: оператор электронного документооборота как транспорт и подпись; реализован каркас (SupplierEdoProfile, EdoDelivery, EdoProvider, stub), реальная интеграция — следующий этап.

Все три перспективы (buyer, supplier, admin) смотрят на один и тот же поток денег, но с разной стороны.

---

### Настройки и права (кто управляет финансовыми потоками)

| Объект                | Источник истины            | Кто может менять           | Примечание                                      |
|-----------------------|----------------------------|----------------------------|------------------------------------------------|
| `OperatorPaymentSettings` | `Operator` (1–1) / таблица настроек | Только ADMIN / SUPERUSER в админке | Поля: `paymentMode`, `agentSchemeEnabled`, `splitEnabled`; напрямую влияют на налоговый контур платформы и схему выплат. |
| `SupplierLegalProfile`    | `SupplierLegalProfile` + snapshot в отчётах | Admin + (ограниченно) поставщик | Юридические реквизиты, налоговый режим; снапшоты в отчётах/документах неизменны. |
| `SupplierBankAccount`     | `SupplierBankAccount` + snapshot payout | Admin + поставщик (с проверками) | Банковские реквизиты и primary‑счёт; snapshot в payout’ах не переписывается. |

**Инвариант:** поставщик **никогда** не может самостоятельно менять `paymentMode`/`agentSchemeEnabled`/`splitEnabled`; эти настройки определяют налоговую модель и clearing‑схему на уровне всей платформы и доступны для изменения только через админку.

---

### 2. Buyer Finance (ЛК покупателя)

**Сущности:**

- `CheckoutSession` — Order‑подобный агрегат:
  - `userId`, `status` (`STARTED`…`COMPLETED`), `totalPrice`,
  - `offersSnapshot` — immutable снимок позиций.
- `PaymentIntent` — Payment:
  - `status` (`PENDING`/`PAID`/`REFUNDED`…), `amount`, `provider`, `paymentUrl`,
  - split‑поля: `supplierId`, `supplierAmount`, `platformFee`, `commissionRate`.
- `FulfillmentItem` — Fulfillment per line:
  - `purchaseFlow` (`PLATFORM`/`EXTERNAL`), `status`, `externalOrderId`, `externalPaymentUrl`.

**Buyer Account:**

- `/account/purchases`:
  - read‑model `PurchaseListItemDto` собирается через `PurchaseReadService.mapSessionToPurchase`,
  - тип карточки (`INTERNAL_TICKET`/`EXTERNAL_VOUCHER`/`BOOKING_CONFIRMATION`/`AWAITING_PAYMENT`/`MANUAL_CONFIRMATION`) и status вычисляются через `getPurchaseDisplayType`,
  - действия (открыть билет/ваучер/трекинг/оплатить) — через `derivePurchaseActions`,
  - наличие «артефакта билета» нормализовано helper’ом `computeTicketAvailable` + `TicketCapabilityService`.
- `/orders/track` и `/checkout/track/:shortCode` — гостевой трекинг по коду без авторизации.

Buyer‑слой опирается напрямую на Checkout/Payments/Fulfillment и НЕ знает про леджер и supplier‑отчёты.

---

### 3. Supplier Finance (ЛК поставщика)

#### 3.1. Ledger

- `SupplierLedgerEntry`:
  - `type`: `SALE` / `COMMISSION` / `REFUND` / `PAYOUT` / `ADJUSTMENT` / `CHARGEBACK_ADJUSTMENT` / `FEE_RECHARGE`,
  - `operatorId` (поставщик), `amount` (`Decimal`), `currency`,
  - ссылки `referenceType`/`referenceId` (PaymentIntent/Order/Manual и т.д.).
- `SupplierLedgerService`:
  - считает баланс поставщика как сумму ledger‑движений,
  - уже используется в:
    - `/supplier/balance` (текущий баланс, pending заявки, доступно к выводу),
    - админском контроллере выплат.

Ledger — источник истины для supplier‑баланса, отчёты и документы строятся поверх него.

**Дополнительные типы для чарджбеков и PSP‑корректировок (C‑блок):**

- `CHARGEBACK_ADJUSTMENT`:
  - отдельный тип записей и строк отчёта (`SupplierLedgerEntry.type`, `SupplierReportLine.type`),
  - используется для корректировок, вызванных возвратами/chargeback’ами PSP, в том числе за прошлые периоды,
  - в P1–P2 сценарий: админ создаёт отрицательное движение в леджере за прошлый период, следующий отчёт включает эту строку как отдельный line‑item.
- `FEE_RECHARGE`:
  - зарезервирован для будущих сценариев перекладки части/всей PSP‑комиссии на поставщика (режимы `pspFeeMode ≠ PLATFORM_PAYS`),
  - в текущей версии (3.2+) используется только как структурный тип для аналитики и подготовки логики; экономическое поведение не меняется.

**Примечание по миграциям:** при добавлении новых enum‑значений (`SupplierReportLineType`, `SupplierLedgerEntryType`) и полей акцепта отчёта (`supplierAcceptedAt`, `acceptedBySupplierUserId`) изменения в Prisma всегда сопровождаются миграцией БД и проверкой:

- корректности SQL для enum‑типов,
- успешного `prisma generate`,
- отсутствия breaking‑изменений для существующих данных (см. Gate «Supplier Reports Acceptance & Disputes» в `Tasktracker.md`).

#### 3.2. Payments & Clearing — YooKassa Strategy: From Single to Split

- **Эволюция режимов (paymentMode):**
  - `SINGLE_MERCHANT` — стартовый режим: деньги проходят через счёт платформы, чек от Daibilet как продавца.
  - `AGENT_SINGLE_PAYOUT` — следующий шаг: деньги по‑прежнему на счёт платформы, но в чеке ставится признак агента (Daibilet как агент, оператор как принципал; реквизиты принципала берутся из snapshot `SupplierLegalProfile`).
  - `SPLIT_MERCHANT` — целевой режим: split‑платежи (разделение суммы между счётом платформы и счётом поставщика через возможности YooKassa).
- **Инвариант леджера (Clearing):**
  - `SupplierLedgerEntry` и расчёт `SupplierReport` **не зависят** от того, использует ли YooKassa split или нет:
    - ledger всегда отражает фактические движения между платформой и оператором в одной и той же модели (`SALE`/`COMMISSION`/`PAYOUT` и т.д.),
    - разница между SINGLE/AGENT/SPLIT — только в том, как деньги доходят до платформы/поставщика и какие теги уходят в чек.
- **Настройки (Operator / Payment Settings):**
  - `paymentMode` — один из трёх режимов выше,
  - `agentSchemeEnabled Boolean` — включает формирование агентского чека (для режимов, где это допустимо),
  - `splitEnabled Boolean` — gate для включения split‑платежей на уровне оператора.
- **Где настраивается:**
  - только в админке (SupplierDetail → «Финансы/Платежи»), через `GET/PUT /admin/suppliers/:id/payment-settings`;
  - в ЛК поставщика настройки доступны **только для чтения** (`GET /supplier/finance/settings`) и отображаются как текстовая схема («Деньги на счёт платформы», «Агентская схема», «Подготовка к split»).


#### 3.2. P1 — Reports & Documents (реализовано)

**Модели:**

- `SupplierReport`:
  - ключ: `operatorId`, `periodStart`, `periodEnd`, `basis` (`SOLD`/`COMPLETED`),
  - статусы: `DRAFT` / `FINAL` (в P1 пока фактически используется `DRAFT` как сгенерированный отчёт),
  - суммы: `grossAmount`, `commissionAmount`, `refundAmount`, `netAmount`,
  - `snapshotJson`: срез `Operator` (name/inn/commissionRate) и периода на момент генерации,
  - флаг `hasConflict` и `metaJson` (для P2 — см. ниже).
- `SupplierReportLine`:
  - `supplierReportId` → `SupplierReport.id`,
  - `type`: `SALE` / `COMMISSION` / `REFUND` / `PAYOUT` / `ADJUSTMENT`,
  - `referenceType`/`referenceId` на источник (в т.ч. PaymentIntent),
  - `amount`, `netAmount`, `metaJson` (например, заметки).
- `SupplierDocument`:
  - `operatorId`, `reportId`, `type` (`AGENT_REPORT`/`COMMISSION_ACT`/`PAYOUT_STATEMENT` — в P1 используется `AGENT_REPORT`),
  - `status`: `DRAFT` / `GENERATED`,
  - `title`, `payloadJson` (готовый payload для шаблона).
- `SupplierDocumentFile`:
  - `supplierDocumentId`, `kind` (`JSON_SNAPSHOT`/`PDF`),
  - `storageKey`, `fileName`, `mimeType`, `sizeBytes`.

**Сервисы:**

- `SupplierReportCalculationService.generateReport(operatorId, periodStart, periodEnd, basis)`:
  - читает `SupplierLedgerEntry` за период,
  - строит `SupplierReportLine` и агрегаты,
  - создаёт `SupplierReport` + `lines` в транзакции,
  - пишет `snapshotJson` с supplier‑профилем на момент отчёта,
  - использует уникальный ключ `[operatorId, periodStart, periodEnd, basis]` для идемпотентности.
- `SupplierDocumentService.generateDocumentsForReport(reportId)`:
  - подтягивает `SupplierReport` + `Operator` + `lines`,
  - собирает payload `{ supplier, period, totals, lines }`,
  - рендерит stub‑HTML отчёта агента (пока хранится как `text/html` вместо реального PDF),
  - создаёт `SupplierDocument` c двумя файлами: `JSON_SNAPSHOT` и `HTML` как placeholder PDF.

**Seed‑сценарий P1 (`prisma/seed-supplier-finance.ts`):**

1. Создаёт тестового поставщика (`Operator.isSupplier=true`).
2. Создаёт `CheckoutSession` (COMPLETED) + `PaymentIntent` (PAID, split‑поля).
3. Выписывает три `SupplierLedgerEntry` (SALE/COMMISSION/PAYOUT).
4. Вызывает `generateReport` за текущий месяц.
5. Вызывает `generateDocumentsForReport`, создавая отчёт агента и файлы.

После сидера в БД есть полноценный пример supplier‑отчёта и документа.

#### 3.3. P2 — Disputes, Reconciliation, Summary (в процессе)

**Споры по отчётам (`SupplierDispute`):**

- `SupplierDispute`:
  - `supplierReportId`, `operatorId`,
  - `status`: `OPEN` / `UNDER_REVIEW` / `RESOLVED` / `REJECTED`,
  - `reasonCategory`: `WRONG_COMMISSION` / `MISSING_SALE` / `WRONG_DETAILS` / `OTHER`,
  - `reasonText` / `resolutionText`,
  - ссылки на автора спора (SupplierUser) и админа, дату разрешения.
- `SupplierDisputeService`:
  - `openDispute(reportId, operatorId, reasonCategory, reasonText, openedBy)`:
    - проверяет владение отчётом,
    - создаёт `SupplierDispute` со статусом `OPEN`,
    - обновляет `SupplierReport.metaJson` (disputeId/status),
    - помечает все активные `SupplierPayoutRequest` для этого оператора `isBlockedByDispute = true`.
  - `resolveDispute(disputeId, resolvedByAdminId, status, resolutionText)`:
    - обновляет статус и тексты,
    - снимает `isBlockedByDispute` с payout‑заявок,
    - обновляет `SupplierReport.metaJson` (status/disputeId).

**Блокировка выплат (`SupplierPayoutRequest`):**

- Добавлено поле `isBlockedByDispute Boolean @default(false)`.
- В админ‑сервисе выплат/контроллере:
  - перед переводом заявки в `APPROVED`/`PAID` выполняется проверка `if (isBlockedByDispute) throw`.

**Reconciliation (сверка отчёта и леджера):**

- `SupplierReconciliationService.reconcileReport(reportId)`:
  - берёт `SupplierReport` + `lines`,
  - суммирует `netAmount` по `lines` (`sumLines`),
  - считает `sumLedger` как сумму `SupplierLedgerEntry.amount` за период отчёта (в будущем — по `reportId`, когда будет добавлено поле),
  - сверяет:
    - `expectedNet = report.netAmount`,
    - `expectedNet == sumLines == sumLedger`,
  - пишет в `SupplierReport`:
    - `hasConflict = !ok`,
    - в `metaJson.reconciliation` сохраняет `expectedNet`, `sumLines`, `sumLedger`, `ok`.
- Периодический job (cron) может прогонять сверку для свежих отчётов и помечать проблемные.

**Supplier Finance Summary (`/supplier/finance/summary`):**

- `SupplierFinanceSummaryService.getSummary(operatorId)`:
  - `currentBalance` — через `SupplierLedgerService`,
  - `pendingPayoutsAmount` — сумма заявок на вывод в статусах `NEW`/`APPROVED`,
  - `lastReports` — последние 3 `SupplierReport` с:
    - `id`, периодом, `netAmount`, `status`, `hasConflict`, привязанными `SupplierDocument`,
  - в будущем — будет расширено полями:
    - `reservedAmount` (суммы в отчётах c `hasConflict` или открытыми спорами),
    - `availableToRequest` (баланс минус pending/зарезервированные).

**API P2:**

- Supplier:
  - `GET /supplier/finance/summary` → данные для дашборда «Где мои деньги?»,
  - `POST /supplier/finance/reports/:id/disputes` → открыть спор по отчёту.
- Admin:
  - `GET /admin/supplier-disputes` → список споров,
  - `PATCH /admin/supplier-disputes/:id/resolve` → завершить спор (RESOLVED/REJECTED).

#### Acceptance Flow (Supplier Reports)

- `SupplierReport` дополнительно хранит:
  - `supplierAcceptedAt: DateTime?` — дату/время явного акцепта отчёта поставщиком,
  - `acceptedBySupplierUserId: String?` — идентификатор `SupplierUser`, выполнившего акцепт.
- Логические статусы отчёта определяются комбинацией полей:
  - **Draft** — отчёт создан и рассчитан (`status = DRAFT`), ещё не утверждён админом.
  - **Final** — админ утвердил отчёт (`status = FINAL`), но поставщик его ещё не принял и не оспорил.
  - **Accepted** — `status = FINAL` и `supplierAcceptedAt != null`, при этом нет открытого `SupplierDispute`.
  - **Disputed** — по отчёту есть открытый `SupplierDispute` (статусы `OPEN` или `UNDER_REVIEW`), независимо от наличия `supplierAcceptedAt`.
- Edge‑cases:
  - **Блокировка акцепта при споре:** endpoint `POST /supplier/finance/reports/:id/accept` запрещён, если по отчёту существует `SupplierDispute` в статусе, отличном от `RESOLVED`/`REJECTED`. В этом случае акцепт завершается ошибкой и поля `supplierAcceptedAt`/`acceptedBySupplierUserId` не изменяются.
  - **Dispute после Accept:** если после акцепта поставщик открывает спор (`POST /supplier/finance/reports/:id/disputes`), отчёт де‑факто считается `DISPUTED`, даже если `supplierAcceptedAt` уже установлен. Дата акцепта не обнуляется и используется для аудита; при вычислении текущего статуса приоритет отдаётся наличию открытого спора.
  - **Отсутствие auto‑accept:** в текущей версии акцепт отчёта возможен только явным действием поставщика через ЛК. Правило silent acceptance (авто‑акцепт по истечении N дней после `FINAL`) рассматривается как будущая опция и не применяется в P2.

##### History (metaJson.history)

- Для аудита `SupplierReport.metaJson.history` может содержать массив записей о смене состояний отчёта; каждая запись имеет вид:
  ```json
  {
    "status": "DRAFT | FINAL | ACCEPTED | DISPUTED | RESOLVED",
    "changedAt": "ISO8601",
    "changedByUserId": "uuid",
    "changedByRole": "ADMIN | SUPPLIER",
    "comment": "optional string"
  }
  ```
- История должна быть плоским массивом, пригодным для прямого отображения на фронтенде (timeline без сложного парсинга) и не требующим сложной десериализации на клиенте.

---

### 4. Admin Finance

**Выплаты:**

- `AdminPayoutsController`:
  - `GET /admin/payouts` — список `SupplierPayoutRequest` c фильтрами по статусу,
  - `PATCH /admin/payouts/:id/status` — переходы между `NEW`/`APPROVED`/`REJECTED`/`PAID`,
  - при смене статуса:
    - движения в леджере фиксируются через `SupplierLedgerService`,
    - с учётом флага `isBlockedByDispute` (P2).

**Отчёты и споры:**

- Админский обзор по `SupplierReport`:
  - период, суммы, статус, `hasConflict`, наличие спора,
  - доступ к `SupplierDocument` (отчёт/акт) по reportId.
- `AdminSupplierDisputesController` (P2):
  - список споров по отчётам,
  - просмотр деталей и причины,
  - резолв с указанием исхода и комментария.

**Мониторинг:**

- Потенциальное расширение:
  - экран «Finance health» с агрегатами по:
    - total ledger vs total reports vs total payouts,
    - числу конфликтных отчётов (`hasConflict=true`),
  - числу открытых споров.

---

### 5. P3 — Legal profile & bank snapshot

**Модели (Prisma):**

- `SupplierLegalProfile` (1–1 к `Operator`):
  - ключ: `operatorId` (unique),
  - поля: `legalName`, `legalAddress`, `inn`, `kpp`, `ogrn`,
  - налоговый режим: `taxMode: SupplierTaxMode` (`NONE` / `USN` / `OSN` / `NPD` / `VAT_EXEMPT`),
  - `vatPercent` (опционально),
  - подписант: `signerFullName`, `signerPosition`,
  - каналы связи: `financeEmail`, `docsEmail`,
  - статус верификации: `status: SupplierLegalProfileStatus` (`DRAFT` / `INCOMPLETE` / `VERIFIED` / `REJECTED`).
- `SupplierBankAccount` (N–1 к `SupplierLegalProfile`):
  - реквизиты: `bankName`, `bik`, `accountNumber`, `correspondentAccount`,
  - `isPrimary` — основной счёт для выплат.

**Snapshot‑логика (Вариант A):**

- В `SupplierReport` добавлено поле `legalProfileSnapshot Json?`:
  - при генерации отчёта `SupplierReportCalculationService` читает `SupplierLegalProfile` по `operatorId` и строит срез
    (`legalName`, `inn`, `kpp`, `ogrn`, `legalAddress`, `taxMode`, `vatPercent`, `signerFullName`, `signerPosition`);
  - этот же блок дублируется в `snapshotJson.legalProfile` для удобства чтения из payload документа.
- В `SupplierPayoutRequest` добавлено поле `bankAccountSnapshot Json?`:
  - при создании payout‑заявки (`POST /supplier/payout-requests`) выбирается основной `SupplierBankAccount` (или первый по списку)
    и сохраняется срез (`bankName`, `bik`, `accountNumber`, `correspondentAccount`).
- **Ключевой инвариант P3:** исторические юридические данные **неизменны и живут только в снапшотах отчётов/выплат**:
  - изменения в `SupplierLegalProfile` и `SupplierBankAccount` **не меняют** уже созданные отчёты, документы и выплаты;
  - любые юридически значимые операции (повторная выгрузка отчёта, audit, ЭДО) читают реквизиты только из
    `SupplierReport.snapshotJson.legalProfile` / `SupplierReport.legalProfileSnapshot` и `SupplierPayoutRequest.bankAccountSnapshot`.

**API (MVP):**

- Supplier:
  - `GET /supplier/payout-requests` и `POST /supplier/payout-requests` уже используют снапшот банковских реквизитов,
    автоматически привязывая текущий основной счёт из `SupplierBankAccount` на момент создания заявки.
- Admin:
  - экраны `/admin/payouts` и `/admin/suppliers/:id` могут отображать реквизиты именно из snapshot‑полей,
    независимо от текущего состояния `SupplierLegalProfile`.

P3 делает финконтур юридически чистым: всегда можно показать, по каким именно реквизитам и на какие счета был сформирован отчёт и проведена выплата, без зависимости от текущего состояния профиля поставщика.

---

### 6. P3.1 — Tax & VAT Layer (декларативный налоговый контур)

**Цель:** добавить юридически значимую НДС‑детализацию (режим налогообложения, ставка, НДС «в том числе», тип документа) поверх уже существующих P1–P3, не усложняя леджер.

#### 6.1. Налоговый профиль поставщика

- Расширенный профиль (`SupplierLegalProfile`):
  - `taxMode: TaxMode` — enum (например: `OSNO`, `USN_6`, `USN_15`, `AUSN`, `NPD`),
  - `isVatPayer: Boolean` — главный флаг: является ли поставщик плательщиком НДС,
  - `defaultVatRate: Decimal?` — ставка НДС (0/10/20), если применяется.
- Эти поля попадают в snapshot:
  - `SupplierReport.snapshotJson.legalProfile.taxMode / isVatPayer / defaultVatRate`,
  - далее дублируются в `SupplierDocument.payloadJson.supplier` для НДС‑документов.

#### 6.2. Tax Matrix (декларативное поведение)

Вместо каскада `if (USN) ... else if (OSNO) ...` система опирается на матрицу поведения по режимам.

**Таблица (пример):**

| TaxMode | isVatPayer | Основной тип документа | VatRate | Особенности |
|--------|------------|------------------------|---------|------------|
| OSNO   | true       | `UPD_1` + при необходимости `INVOICE` | 20 / 10 | классический плательщик НДС |
| USN_6  | false      | `AGENT_REPORT` / `ACT_NO_VAT`        | 0 / null | «Без НДС», счёт‑фактура не выставляется |
| USN_15 | false      | `AGENT_REPORT` / `ACT_NO_VAT`        | 0 / null | то же, что USN_6 |
| AUSN   | false      | `AGENT_REPORT` / `ACT_NO_VAT`        | 0 / null | «Без НДС» |
| NPD    | false      | `AGENT_REPORT` + ссылка на чек НПД  | 0 / null | в payload нужен `npd.receiptUrl` |

На уровне кода это оформляется как конфиг (например, `TAX_MATRIX: Record<TaxMode, TaxBehavior>`), где для каждого режима зафиксировано:

- `requiresVat` (да/нет),
- `defaultVatRate`,
- `mainDocumentType` (`UPD_1` / `ACT_NO_VAT` / `AGENT_REPORT_ONLY`),
- `needsInvoice` (отдельный счёт‑фактура),
- `needsNpdReceiptLink` (для NPD).

#### 6.3. Расчёт НДС и payload НДС‑документов

- **Леджер остаётся «чистым»**: `SupplierLedgerEntry.amount` и агрегаты `SupplierReport.netAmount`/`grossAmount` **не** расширяются особыми полями для НДС.
- НДС считается в слое отчёта/документа:
  - для плательщика НДС (`isVatPayer=true`) считаем, что `amountWithVat` = сумма к выплате по отчёту,
  - раскладываем НДС «в том числе» по формуле:
    - \( base = amountWithVat \times \frac{100}{100 + rate} \),
    - \( vat = amountWithVat - base \).
  - для неплательщика (`isVatPayer=false`) все суммы считаются «без НДС», а в документах явно указывается «Без НДС».
- НДС‑payload для счёта‑фактуры/УПД (упрощённо):
  - `supplier` — реквизиты поставщика из snapshot (имя, ИНН/КПП, адрес, режим, ставка);
  - `customer` — реквизиты Daibilet/покупателя (конфиг/профиль платформы);
  - `document` — номер/дата/период/основание (номер генерируется отдельным `DocumentNumberService` с последовательностями по оператору и году);
  - `lines` — 1..N строк с полями: `description`, `quantity`, `unit`, `price`, `amount`, `vatRate`, `vatAmount`, `amountWithVat`;
  - `totals` — агрегаты `amount`, `vatAmount`, `amountWithVat`, текстовое поле `vatText` («в т.ч. НДС 20%» или «Без НДС»);
  - `npd` — опциональный блок `{ receiptUrl, receiptNumber }` для самозанятых.
- Округление:
  - все вычисления делаются в Decimal,
  - отображение в документах — до 2 знаков (математическое округление), с суммированием по округлённым линиям (акт/счёт‑фактура согласованы сами с собой),
  - при расхождении на 1 копейку между суммой позиций и агрегатом приоритетным считается итоговое значение `netAmount` из леджера/отчёта,
  - reconciliation P2 по‑прежнему опирается на `netAmount`/ledger, а не на разложенные VAT‑части.

#### 6.4. Нумерация НДС‑документов

- Вводится простой sequence‑сервис (например, `DocumentNumberService`) с хранением последних номеров в таблице (`operatorId` + год + тип документа).
- Для каждого нового `INVOICE`/`UPD_1`/`UPD_2` номер берётся транзакционно, форматируется как `ГГГГ-000001` и попадает в:
  - `SupplierDocument.payloadJson.document.number`,
  - при необходимости — в отдельное текстовое поле `documentNumber` для поиска/фильтрации.

#### 6.5. Налоговый слой и документы (реализация P3.1)

**Точка сборки:** расчёты налогов и формирование payload документов автоматизированы и опираются на Tax Matrix и единый модуль формул. Ниже — как это устроено в коде и что попадает в snapshot для фронта.

**Источники истины:**

- **`tax.config.ts`** — `TAX_MATRIX: Record<TaxMode, TaxBehavior>`: для каждого режима (OSNO, USN_6, USN_15, AUSN, NPD) заданы `requiresVat`, `defaultVatRate`, `mainDocumentType`, `needsInvoice`, `needsNpdReceiptLink`. Логика «какой документ и как считать НДС» не размазана по коду, а декларирована в матрице.
- **`tax-calculations.ts`** — единственное место формул:
  - `vatFromGross(grossAmount, vatRatePercent)` → `{ net, vat }` (формула: net = gross / (1 + rate/100), vat = gross - net; краевые кейсы: нулевая сумма, rate=0);
  - `commissionFromGross(grossAmount, commissionPercent, options?)` → комиссия до налогов (от gross) или после (от net при `commissionAfterVat: true`).
- Юнит-тесты **`tax.config.spec.ts`** (22 теста) фиксируют ОСНО (выделение НДС), УСН (vat=0), НПД (флаг «налог у поставщика»), агентскую комиссию до/после налогов и краевые кейсы (деление на ноль, нулевая сумма).

**`buildVatDocumentPayload` (P3.1-4):**

- **Вход:** `grossAmount`, `commissionRatePercent`, `legalProfile` (snapshot из отчёта: taxMode, isVatPayer, defaultVatRate и др.).
- **Логика:** по `legalProfile.taxMode` выбирается поведение из TAX_MATRIX; net/vat считаются через `vatFromGross`, комиссия — через `commissionFromGross` (для ОСНО комиссия считается после выделения НДС).
- **Выход:** `{ totals, lines }`:
  - `totals`: `grossAmount`, `netAmount`, `vatAmount`, `commissionAmount`, `vatText` («в т.ч. НДС» / «Без НДС»), `documentType` (UPD_1 / ACT_NO_VAT / AGENT_REPORT_ONLY);
  - `lines`: массив строк документа с полями `description`, `quantity`, `unit`, `price`, `amount`, `vatRate`, `vatAmount`, `amountWithVat`.
- Вызов: в `SupplierDocumentService.generateDocumentsForReport(reportId)` payload и итоги документа формируются через `buildVatDocumentPayload`; эти же значения попадают в `payloadJson` и в файл `JSON_SNAPSHOT` (snapshot для фронта и шаблонов).

**Нумерация документов (P3.1-3):**

- **`DocumentNumberService.nextNumber({ operatorId, year, type })`** возвращает строку формата **`ГГГГ-XXXXXX`** (год + 6 цифр с ведущими нулями).
- Типы: `INVOICE`, `UPD_1`, `UPD_2`, `AGENT_REPORT` — у каждого своя последовательность в разрезе (operatorId, year).
- Хранение: таблица `DocumentSequence` (operatorId, year, type, lastNumber); при смене года создаётся новая запись, первый номер года — 000001.
- Изоляция: разные операторы и разные типы документов не делят один счётчик; юнит-тесты **`document-number.service.spec.ts`** (9 тестов) проверяют изоляцию по operatorId, смену года и независимость последовательностей по типу.
- При генерации AGENT_REPORT вызывается `nextNumber(..., type: 'AGENT_REPORT')`; полученный номер записывается в `payloadJson.document.number` и в заголовок документа.

**Что попадает в snapshotJson / payloadJson (для фронта и шаблонов):**

- **supplier** — id, name, inn, commissionRate (из snapshot отчёта или Operator).
- **legalProfile** — срез юр. профиля на момент отчёта (legalName, inn, kpp, ogrn, legalAddress, taxMode, isVatPayer, defaultVatRate, signerFullName, signerPosition).
- **period** — start, end (период отчёта).
- **totals** — рассчитанные по матрице: `grossAmount`, `netAmount`, `vatAmount`, `commissionAmount`, `refundAmount`, `vatText`.
- **lines** — строки отчёта (type, referenceType, referenceId, amount, netAmount).
- **vatDocument** — результат buildVatDocumentPayload: `documentType`, `lines` (строки с НДС), `totals` (дублируют итоги с vatText и documentType).
- **document** — `number` (ГГГГ-XXXXXX), `date`, `type` (AGENT_REPORT и т.д.).
- **customer** — (опционально) реквизиты контрагента/платформы для счёта/УПД; в текущей реализации — заглушка под будущее заполнение из конфига или профиля Daibilet.
- **npd** — (опционально) для режима NPD: `receiptUrl`, `receiptNumber` (ссылка на чек самозанятого); в TAX_MATRIX для NPD задано `needsNpdReceiptLink: true`, при расширении генерации документов для НПД этот блок заполняется.
- **invoicePayload** (P3.1-4) — расширенная структура для INVOICE/UPD_2: `supplier`, `tax`, `customer`, `items` (см. пример ниже).

#### Invoice / UPD payload example (P3.1-5)

Пример структуры `invoicePayload` в `SupplierDocument.payloadJson` для счёта-фактуры и УПД:

```json
{
  "supplier": {
    "name": "ООО Речные прогулки",
    "inn": "7812345678",
    "kpp": "781201001",
    "address": "г. Санкт-Петербург, Невский пр., д. 1",
    "bankAccount": {
      "bankName": "ПАО Сбербанк",
      "bik": "044525225",
      "account": "40702810000000000001",
      "corrAccount": "30101810400000000225"
    }
  },
  "tax": {
    "taxMode": "OSNO",
    "isVatPayer": true,
    "vatRate": 20
  },
  "customer": {
    "type": "LEGAL",
    "name": "ООО Покупатель",
    "inn": "7700000000"
  },
  "items": [
    {
      "title": "Билет на теплоход",
      "quantity": 2,
      "price": 1000,
      "vatRate": 20,
      "vatAmount": 333.33
    }
  ]
}
```

Для НПД: `customer.type = "NPD"`, `tax.isVatPayer = false`, `tax.vatRate = 0`. VAT считается автоматически; при `isVatPayer = false` все суммы без НДС.

Фронт может опираться на `payloadJson` (или JSON_SNAPSHOT файла документа): все суммы и НДС уже рассчитаны по матрице, номер документа уникален в разрезе оператор/год/тип.

### 7. VAT Transition Strategy (мягкое включение НДС)

Чтобы не ломать существующие отчёты и не вводить сразу полноценные НДС‑документы, применяется поэтапная стратегия:

- **Phase 1 (current)** — «тихая» нумерация:
  - `DocumentNumberService` уже используется для обычных `AGENT_REPORT` (отчётов агента): номера вида `YYYY-000001` пишутся в `payloadJson.document.number` и в заголовок документа.
  - Никаких INVOICE/UPD ещё нет, но механика генерации и sequence‑таблица (`DocumentSequence`) уже обкатаны.
- **Phase 2** — «теневой» VAT‑payload:
  - НДС рассчитывается на уровне `SupplierReportCalculationService` и сохраняется в `snapshotJson.vatDetails` и `SupplierReport.legalProfileSnapshot`.
  - Эти данные не выводятся в PDF/HTML, но доступны для проверки через snapshot’ы (SQL/админка) по разным `taxMode` и ставкам.
- **Phase 3** — включение НДС‑шаблонов:
  - В `SupplierDocumentTemplateVersion` используется флаг `requiresVatData` для шаблонов, зависящих от VAT.
  - Как только появляются реальные шаблоны `INVOICE`/`UPD_*` с `requiresVatData = true`, рендерер начинает подтягивать «теневые» значения НДС из snapshot’ов и формировать полноценные НДС‑документы.

P3.1 таким образом превращает P3 из «адресной книги» реквизитов в полноценный налоговый слой: режим, ставка, вид документов и расчёт НДС декларируются через матрицу, а сами деньги в леджере остаются простыми и легко сверяемыми.

---

### 8. Phases P1–P4 (Roadmap)

- **P1 (реализовано):**
  - Supplier ledger завершён (SALE/COMMISSION/REFUND/PAYOUT/ADJUSTMENT),
  - добавлены `SupplierReport`/`SupplierReportLine`,
  - добавлены `SupplierDocument`/`SupplierDocumentFile`,
  - сид‑сценарий: поставщик → продажа → леджер → отчёт → документ.
- **P2 (в процессе):**
  - `SupplierDispute`, флаг `hasConflict`, блокировка выплат флагом `isBlockedByDispute`,
  - сервис сверки отчёта и леджера,
  - `/supplier/finance/summary` и admin‑API для споров.
- **P3 (план):**
  - `SupplierLegalProfile` и `SupplierBankAccount` (юридические реквизиты и snapshot банковских данных на момент payout/report),
  - вынесение settlement‑правил (SOLD vs COMPLETED) и payout‑частоты в профиль,
  - API для редактирования профиля и счетов (admin + supplier), при этом источником истины для уже созданных документов остаются snapshot’ы.
- **P4 (foundation реализован):**
  - Реализовано: Prisma `SupplierEdoProfile`, `EdoDelivery`, `EdoProviderType`, `EdoDeliveryStatus`; `EdoProvider`, `NoopEdoProvider`, `EdoProviderRegistry`; `EdoProfileService`, `EdoDeliveryService`; Admin API (edo-profile, edo-deliveries, send-to-edo, refresh).
  - Остаётся: интеграция с Диадок (HTTP, XML, КЭП), webhook, очередь BullMQ.

Этот файл фиксирует общую архитектуру финансового домена и текущее состояние реализаций P1–P3 (Buyer/Supplier/Admin). При изменениях в коде (новые статусы, модели или фичи) Finance‑архитектура должна обновляться здесь в первую очередь.

---

### Demo generation of supplier documentsДля локальной проверки шаблонов и файловой генерации добавлен demo-flow.

- Команда запуска: `pnpm --filter @daibilet/backend db:seed:finance-docs-demo`
- Что создаётся:
  - demo поставщик `demo-finance-supplier`
  - 3 документа: `AGENT_REPORT`, `SERVICE_ACT`, `UPD`
  - для каждого: HTML и PDF (если PDF не собрался, сохраняется HTML и причина в payload)
- Где лежат файлы: `packages/backend/uploads/documents/demo/<operatorId>/<documentType>/...`
- Как открыть локально:
  - при запущенном backend: `http://localhost:4000/uploads/documents/demo/...`
  - индекс demo документов: `GET /api/v1/admin/dev/finance-documents-demo`

| Document type | Template source | Storage path | Preview method |
|---|---|---|---|
| AGENT_REPORT | `src/supplier-finance/templates/finance-document-templates.ts` | `uploads/documents/demo/<operatorId>/AGENT_REPORT/` | `/uploads/...` + admin dev endpoint |
| SERVICE_ACT | `src/supplier-finance/templates/finance-document-templates.ts` | `uploads/documents/demo/<operatorId>/SERVICE_ACT/` | `/uploads/...` + admin dev endpoint |
| UPD | `src/supplier-finance/templates/finance-document-templates.ts` | `uploads/documents/demo/<operatorId>/UPD/` | `/uploads/...` + admin dev endpoint |

### Settlement lifecycle foundation (manual-first)

Добавлен этап foundation без очередей и без авто-отправки в ЭДО:- `SupplierSettlement`: статусы `DRAFT -> CALCULATED -> APPROVED -> FINALIZED -> PAID`.
- Настройки в профиле поставщика:
  - `generateInvoiceDocuments` (default: `false`)
  - `closingDocumentMode` (`UPD`/`ACT`)
- Policy resolver определяет пакет:
  - всегда `AGENT_REPORT`
  - closing doc: `UPD` или `SERVICE_ACT`
  - `INVOICE` и `VAT_INVOICE` — только по opt-in
  - `VAT_INVOICE` только для валидного VAT-профиля (иначе skip c reason, без падения пакета)
- Manual API:
  - Supplier: `GET/PATCH /supplier/finance/document-settings`
  - Supplier: `POST /supplier/finance/settlements/:id/issue-documents`
  - Admin: manual settlement lifecycle + policy preview + manual issue/regenerate (`/admin/finance/...`)
- Storage layout для production paths:
  - `uploads/documents/{operatorId}/{year}/{month}/{type}/{documentNumber}/preview.html`
  - `uploads/documents/{operatorId}/{year}/{month}/{type}/{documentNumber}/final.pdf`

#### Smoke checklist (manual API)

Примерный smoke run (локально, после авторизации admin/supplier):

```bash
# 1) Admin: calculate settlement
curl -X POST "http://localhost:4000/api/v1/admin/finance/settlements/calculate" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"operatorId":"<OPERATOR_ID>","periodStart":"2026-03-01T00:00:00.000Z","periodEnd":"2026-04-01T00:00:00.000Z"}'

# 2) Admin: approve/finalize
curl -X POST "http://localhost:4000/api/v1/admin/finance/settlements/<SETTLEMENT_ID>/approve" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
curl -X POST "http://localhost:4000/api/v1/admin/finance/settlements/<SETTLEMENT_ID>/finalize" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"

# 3) Admin: policy preview
curl "http://localhost:4000/api/v1/admin/finance/settlements/<SETTLEMENT_ID>/document-policy-preview" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"

# 4) Supplier: settings (default / opt-in)
curl "http://localhost:4000/api/v1/supplier/finance/document-settings" \
  -H "Authorization: Bearer <SUPPLIER_TOKEN>"
curl -X PATCH "http://localhost:4000/api/v1/supplier/finance/document-settings" \
  -H "Authorization: Bearer <SUPPLIER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"generateInvoiceDocuments":true,"closingDocumentMode":"UPD"}'

# 5) Manual issue documents
curl -X POST "http://localhost:4000/api/v1/admin/finance/settlements/<SETTLEMENT_ID>/issue-documents" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

Ожидаемые сценарии:

- **default (toggle off):** `AGENT_REPORT` + `UPD`/`SERVICE_ACT`
- **toggle on + VAT:** + `INVOICE` + `VAT_INVOICE`
- **toggle on без VAT:** + `INVOICE`, а `VAT_INVOICE` в `skipped` с reason

#### Endpoints quick map

| Endpoint | Role | Purpose |
|---|---|---|
| `GET /api/v1/supplier/finance/document-settings` | Supplier OWNER | Получить настройки генерации документов |
| `PATCH /api/v1/supplier/finance/document-settings` | Supplier OWNER | Изменить `generateInvoiceDocuments` и `closingDocumentMode` |
| `POST /api/v1/supplier/finance/settlements/:id/issue-documents` | Supplier OWNER | Ручной выпуск пакета документов по settlement |
| `POST /api/v1/admin/finance/settlements/calculate` | Admin | Рассчитать settlement за период |
| `POST /api/v1/admin/finance/settlements/:id/approve` | Admin | Перевести settlement в APPROVED |
| `POST /api/v1/admin/finance/settlements/:id/finalize` | Admin | Перевести settlement в FINALIZED |
| `POST /api/v1/admin/finance/settlements/:id/mark-paid` | Admin | Отметить settlement как PAID |
| `GET /api/v1/admin/finance/settlements/:id/document-policy-preview` | Admin/Editor | Предпросмотр обязательного набора документов по policy |
| `POST /api/v1/admin/finance/settlements/:id/issue-documents` | Admin | Ручной выпуск документов |
| `POST /api/v1/admin/finance/documents/:id/regenerate` | Admin | Регенерация документа |