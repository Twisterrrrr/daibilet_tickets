# Supplier Trust System — Спецификация MVP

> Последнее обновление: 2026-03-12  
> Объём: Trust Score 0–100, Trust Levels 0–3, лимиты активных событий, пересчёт и override.

## 1. Цели и принципы

- **Цель:** дать простую, но объяснимую систему доверия к поставщикам (Operator), которая:
  - ограничивает риски на старте (лимиты активных событий);
  - поощряет заполнение профиля и качественный каталог;
  - использует реальные операционные и репутационные сигналы;
  - остаётся управляемой вручную через override в редких кейсах.
- **Принципы:**
  - score и level **не видны** конечному покупателю, только поставщикам и админам;
  - для поставщика важны **конкретные действия**, а не «магическое число»;
  - система должна быть **монотонной в среднем**: нормальное поведение → рост или стабильность, злоупотребления → снижение;
  - расчёт использует только уже имеющиеся данные (`Operator`, `Event`, `PaymentIntent`, `Review`) без тяжёлых новых подсистем.

## 2. Trust Score и Levels

### 2.1. Уровни доверия (Trust Levels)

Уровни — дискретные ступени, которые используются во внешнем поведении:

- **0 — Новый (NEW)**: только что зарегистрирован, жёсткие лимиты.
- **1 — Базовый (BASIC)**: минимальная история и заполненность профиля.
- **2 — Проверенный (VERIFIED)**: устойчивый профиль, хороший каталог и операции.
- **3 — Надёжный (TRUSTED)**: стабильная работа, хороший рейтинг, низкий процент возвратов.

Маппинг из score:

- score ≥ 75 → level 3
- 50 ≤ score < 75 → level 2
- 25 ≤ score < 50 → level 1
- score < 25 → level 0

Реализация: `SupplierTrustService.mapScoreToLevel(score)`.

### 2.2. Trust Score 0–100 (блоки)

Score собирается из пяти положительных блоков и одного штрафного:

- **Profile (0–20)** — заполненность профиля `Operator`:
  - +5 — заполнено базовое имя (`name`).
  - +5 — есть контакты (`contactEmail` и `contactPhone`).
  - +5 — есть юр. данные (`companyName` и `inn`).
  - +5 — есть сайт (`website`) или дефолтный текст правил возврата (`defaultRefundPolicyText`).

- **Catalog (0–25)** — качество каталога по активным событиям:
  - считаются только события `Event` с `isActive=true`, `!isDeleted`, `moderationStatus in (APPROVED|AUTO_APPROVED)`;
  - для долей (0–1) по активным событиям:
    - withImage = доля событий с `imageUrl`;
    - withDescription = доля с `description.length > 100`;
    - withSchedule = доля с хотя бы одним `session`;
    - withPrice = доля с заполненным `priceFrom`.
  - за каждую долю ≥ 0.8:
    - +5 к catalog (итого до 20).
  - дополнительно по отклонённым событиям:
    - rejectedEvents = количество `Event` c `moderationStatus=REJECTED`;
    - если `rejectedEvents == 0` → +5;
    - если `rejectedEvents / eventsTotal ≤ 0.1` → +3.

- **Operations (0–25, MVP)** — платежи и модерация:
  - paid = количество `PaymentIntent` со `status=PAID` по `supplierId=operatorId`;
  - refunded = количество `PaymentIntent` со `status=REFUNDED` по `supplierId=operatorId`;
  - если paid > 0:
    - refundRate = refunded / paid;
    - refundRate ≤ 0.02 → +8;
    - 0.02 < refundRate ≤ 0.05 → +5;
  - recentRejected = количество событий с `moderationStatus=REJECTED` за последние 30 дней:
    - recentRejected == 0 → +5;
    - recentRejected ≤ 2 → +3;
  - oldDrafts = количество событий со `status=DRAFT`, `isActive=false`, созданных более 30 дней назад:
    - oldDrafts == 0 → +4;
    - иначе → +2.

- **Reputation (0–15)** — отзывы:
  - берутся `Review` со `status=APPROVED` и `supplierId=operatorId`;
  - avgRating = средний `rating`:
    - avgRating ≥ 4.7 → +6;
    - 4.3 ≤ avgRating < 4.7 → +4;
  - badShare = доля отзывов с `rating ≤ 3`:
    - badShare ≤ 0.05 → +4;
    - 0.05 < badShare ≤ 0.1 → +2.

- **Stability (0–15)** — возраст и продажи:
  - daysSinceCreated = дни с момента `Operator.createdAt`;
  - если daysSinceCreated ≥ 14 → +4;
  - если daysSinceCreated ≥ 30 → +4 (итого уже 8);
  - если daysSinceCreated ≥ 60 → +4 (итого 12);
  - если paid > 0 → +3 (итого максимум 15).

- **Penalties (штрафы, обычно ≤ 0)**:
  - если `recentRejected ≥ 3` → penalties -= 10;
  - если `refundRate > 0.1` → penalties -= 10.

Итоговый «сырой» score:

- baseScore = profile + catalog + operations + reputation + stability + penalties;
- clampedScore = `min(100, max(0, baseScore))`.

## 3. Пересчёт и сглаживание

### 3.1. Алгоритм `recalculateSupplierTrust`

1. `fresh = calculateFreshBreakdown(operatorId)` — считает свежий breakdown и авто‑level по clampedScore.
2. `existing = Operator.trustScore + trustManual*` (если есть):
   - `previousScore = existing.trustScore || 0`.
   - Проверяется, активен ли ручной override:
     - `manualActive = trustManualOverrideLevel != null && (trustManualExpiresAt is null || > now)`.
3. **Сглаживание изменения score:**
   - blendedScore = `previousScore * 0.7 + fresh.score * 0.3`.
   - deltaClamped = `min(previousScore + 10, max(previousScore - 10, blendedScore))` — ограничиваем изменение за пересчёт не более чем на 10 пунктов вверх/вниз.
   - finalScore = `min(100, max(0, deltaClamped))`.
4. autoLevel = `mapScoreToLevel(finalScore)`.
5. finalLevel:
   - если `manualActive` → `trustManualOverrideLevel`;
   - иначе → autoLevel.
6. Обновление `Operator`:
   - `trustScore = finalScore`;
   - `trustLevel = finalLevel`;
   - breakdown‑поля (`trustProfileScore`, `trustCatalogScore`, …);
   - `trustPenaltyScore = fresh.penalties`;
   - `trustLastCalculatedAt = now`.
7. Возврат breakdown с `score=finalScore`, `level=finalLevel`.

### 3.2. Периодический пересчёт

- Ежедневный job `SupplierTrustJob.recalculateAllSuppliers`:
  - cron: `EVERY_DAY_AT_3AM`;
  - выбирает всех операторов с `isSupplier=true`;
  - для каждого вызывает `recalculateSupplierTrust(operator.id)` с логированием ошибок.
- Дополнительно `SupplierController.dashboard` вызывает `recalculateSupplierTrust` on-demand для текущего поставщика (чтобы UI видел актуальное состояние).

## 4. Лимиты активных событий

### 4.1. Таблица лимитов

- Level 0 → **5** активных событий.
- Level 1 → **10** активных событий.
- Level 2 → **25** активных событий.
- Level 3 → **50** активных событий.

Реализация: `SupplierTrustService.getActiveEventsLimitByTrustLevel(level)`.

Подсчёт активных событий:

- `getActiveEventsCount(operatorId)`:
  - `Event` с:
    - `operatorId = operatorId`;
    - `isActive = true`;
    - `isDeleted = false`;
    - `moderationStatus in ('APPROVED', 'AUTO_APPROVED')`.

### 4.2. Проверка перед активацией (`assertSupplierCanActivateEvent`)

Алгоритм:

1. Параллельно читаем:
   - `operator = Operator.findUnique({ id: operatorId, select: { trustLevel } })`;
   - `activeCount = getActiveEventsCount(operatorId)`.
2. Если `operator` не найден → `BadRequestException('Operator not found')`.
3. `limit = getActiveEventsLimitByTrustLevel(operator.trustLevel || 0)`.
4. Если `activeCount >= limit`:
   - бросаем `BadRequestException` с payload:
     - `code: 'SUPPLIER_ACTIVE_EVENTS_LIMIT_REACHED'`;
     - `message: 'Достигнут лимит активных событий для текущего уровня доверия.'`;
     - `details: { activeCount, limit, trustLevel }`.

### 4.3. Точки применения лимитов

- **Admin модерация**:
  - `POST /admin/moderation/:id/approve`:
    - читает `event` по id;
    - проверяет, что `moderationStatus in (PENDING_REVIEW, AUTO_APPROVED, REJECTED)`;
    - если есть `event.operatorId`, вызывает `assertSupplierCanActivateEvent(operatorId)` до `update` с `isActive=true`.
- **Partner API**:
  - `POST /partner/events`:
    - при апдейте существующего события:
      - если `data.isActive === true` и ранее `isActive=false` → вызываем `assertSupplierCanActivateEvent(operatorId)`;
    - при создании нового события:
      - определяем `moderationStatus` по trustLevel оператора (>=1 → AUTO_APPROVED, иначе PENDING_REVIEW);
      - если `moderationStatus !== 'PENDING_REVIEW'` (т.е. событие сразу активируется), вызываем `assertSupplierCanActivateEvent(operatorId)` до `create`.
- **Supplier Dashboard**:
  - `GET /supplier/dashboard`:
    - в ответе есть блок `trust`:
      - `activeEventsLimit` = лимит по текущему level;
      - `activeEventsCount` = фактическое число активных событий;
      - это используется на фронте для визуализации.

## 5. UI‑поведение

### 5.1. Кабинет поставщика (frontend-supplier)

- **Dashboard:**
  - Плашка уровня доверия:
    - текст: «Уровень доверия: Новый/Базовый/Проверенный/Надёжный».
    - прогресс‑бар по score (0–100%).
    - подпись: «Чем выше уровень, тем больше лимиты и приоритет в модерации».
  - Карточка лимита активных событий:
    - «Активных сейчас: X из Y»;
    - прогресс‑бар с цветом:
      - зелёный при нормальной загрузке;
      - жёлтый при ≥ 80% лимита;
    - текстовое объяснение: при достижении лимита нужно либо деактивировать события, либо улучшать trust.
  - Блок «До следующего уровня»:
    - список до 4 требований из `getNextLevelRequirements` (каталог, профиль, операции, репутация, стабильность).

- **EventsList:**
  - Баннер‑предупреждение над списком:
    - текст «Лимит активных событий: X из Y».
    - если `activeEventsCount >= activeEventsLimit`:
      - красный акцент и текст «Вы достигли текущего лимита…».
    - иначе:
      - жёлтый/нейтральный акцент и текст о том, что лимит будет расти с уровнем доверия.

### 5.2. Admin панель (frontend-admin)

- **Список поставщиков:**
  - Колонка Trust показывает бейдж с русским лейблом уровня (0–3):
    - 0 — Новый;
    - 1 — Базовый;
    - 2 — Проверенный;
    - 3 — Надёжный.

- **Карточка поставщика:**
  - Панель Trust:
    - текущий уровень (число) + `score/100`;
    - дата/время последнего пересчёта;
    - разложение по блокам score;
    - если есть активный manual override — короткий текст: «Ручной override до уровня X (до YYYY-MM-DD)».
  - Форма «Настройки поставщика»:
    - select Trust Level (0–3) с русскими подписями;
    - при сохранении PATCH `/admin/suppliers/:id` с `trustLevel` и остальными полями.

## 6. Ручной override (каркас)

### 6.1. Поля схемы

В модели `Operator` (Prisma):

- `trustManualOverrideLevel Int?`
- `trustManualOverrideScore Int?`
- `trustManualReason String?`
- `trustManualExpiresAt DateTime?`

### 6.2. Семантика

- Если `trustManualOverrideLevel` задан и не истёк (`trustManualExpiresAt is null || > now`):
  - итоговый `trustLevel` фиксируется в этом значении, независимо от auto‑score;
  - score при этом всё равно пересчитывается и хранится как `trustScore` (для аналитики).
- Админ обязан оставить `trustManualReason`, объясняющую контекст override (требует отдельного UI).

### 6.3. План по UI (не реализовано в MVP)

- Admin UI: отдельная форма в карточке поставщика:
  - поля: Override Level (0–3), Override Score (опционально), Reason, ExpiresAt.
  - кнопка «Сбросить override» (очистка полей).
- Audit: логирование изменений override в AdminAudit / отдельной таблице.

## 7. Ограничения и дальнейшие шаги

### 7.1. Ограничения MVP

- Нет отдельного weighting по обороту/объёму заказов (only counts, не суммы).
- Нет учёта чарджбеков/диспутов на уровне платёжного провайдера (только REFUNDED в нашей модели).
- Нет использования ML или сложных правил — все пороги фиксированы в коде.
- Override пока доступен только через изменение `trustLevel`; полноформатный интерфейс override полей отложен.

### 7.2. Возможные улучшения

- Разделение **operational penalties** (частые отмены, SLA‑просрочки) и **financial penalties** (chargeback‑rate, fraud).
- Добавление «грейда» внутри уровня (например, 2.1, 2.2) для более точной приоритизации модерации без изменения лимитов.
- Переход от жёстких порогов к таблично‑конфигурируемой модели (хранить пороги в БД с audit).
- UI‑гайд для поставщиков: отдельная страница «Как повысить уровень доверия» с привязкой к показателям в дашборде.

