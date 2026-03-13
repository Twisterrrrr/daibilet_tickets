# Архитектура Supplier vs Operator

> Разделение ролей: Operator (юрлицо) vs Supplier (контрагент) vs SupplierUser (аккаунт в ЛК).  
> Последнее обновление: 2026-03-01

> **См. также:** `docs/SupplierModel.md` — нормализованная модель Supplier (type OPERATOR|VENUE, accessMode NONE|READONLY|LK).

---

## 1. Разделение сущностей

| Сущность | Что это | Роль в системе |
|----------|---------|-----------------|
| **Operator** | Юридическое лицо / правообладатель услуги | ООО/ИП, договор, реквизиты, выплаты, комиссия |
| **SupplierUser** | Аккаунт в системе (ЛК поставщика) | Логин/пароль, доступ к ЛК, создаёт Venue/Event, управляет Offers |
| **Provider** | Источник инвентаря | TC, TEPLOHOD, MANUAL — откуда данные |
| **WidgetProvider** | Механизм покупки | TC, RADARIO, REDIRECT — как покупатель платит |
| **Offer** | Конкретное предложение | EventOffer — цена, deeplink, виджет |

**Operator ≠ SupplierUser.** Это разные таблицы. Не смешивать бизнес-сущность и аккаунт.

---

## 2. Связь Operator — SupplierUser

```
Operator (1) ─────< SupplierUser (N)
   │
   └── владелец контента (Event, Venue, Offer)
       комиссия, выплаты, YooKassa sub-merchant
```

- Один Operator может иметь несколько SupplierUser (OWNER, MANAGER, CONTENT, ACCOUNTANT).
- SupplierUser привязан к Operator через `operatorId`.
- Контент (Event, Venue) привязан к Operator через `operatorId` (владелец = юрлицо).
- Operator с `isSupplier = true` — доступен Supplier Portal (ЛК).

**Важно:** нельзя «переключать Operator в Supplier» — это разные сущности. Создаёшь SupplierUser, привязываешь к Operator.

---

## 3. Два операционных режима

### A. Operator-модель (вы ведёте контент)

- Поставщик = контрагент, даёт API или данные.
- Карточки Venue/Event создаёте вы (админка) или автоимпорт.
- SupplierUser может **не создаваться**.
- Подходит: крупные музеи, teplohod, чисто техническая интеграция.

**Если Operator даёт только API** — Supplier не обязателен. Supplier (ЛК) нужен, если поставщик хочет сам править карточки, видеть продажи, обновлять расписание.

### B. Supplier-модель (поставщик ведёт контент)

- SupplierUser получает доступ в ЛК **на вашем сайте**.
- Создаёт DRAFT Venue/Event, отправляет на модерацию.
- Админ подтверждает → APPROVED → в каталог.
- Подходит: частные музеи, экскурсионные операторы, маркетплейс.

### C. Ручной поставщик (без API)

- Provider = MANUAL.
- Supplier создаёт события вручную в ЛК.
- Классическая модель маркетплейса.

### Совместная модель

- Оба режима в одной системе.
- Event/Venue имеют `moderationStatus` и (рекомендуется) `createdByType` (ADMIN | SUPPLIER | IMPORT).

---

## 4. Практическая логика

| Вариант | Описание | Supplier нужен? |
|---------|----------|-----------------|
| **A. Полный контроль у вас** | API от оператора, вы создаёте карточки | Нет |
| **B. Совместная** | API есть, контент правит Supplier, вы модерируете | Да |
| **C. Без API** | Supplier заводит события вручную | Да |

**Стратегия по умолчанию:**
- Operator-модель для «якорей» (Эрмитаж, Исаакий) — контент только через вас.
- Supplier-модель для длинного хвоста — self-serve + модерация.

---

## 5. Модерация контента

```
DRAFT → PENDING_REVIEW → APPROVED / REJECTED
              ↓
        AUTO_APPROVED (при trustLevel 1–2)
```

| Статус | Описание |
|--------|----------|
| **DRAFT** | Черновик, видит только Supplier и модераторы |
| **PENDING_REVIEW** | Отправлено на модерацию |
| **APPROVED** | В каталоге |
| **REJECTED** | Отклонено (причина в moderationNote) |
| **AUTO_APPROVED** | Для доверенных поставщиков (trustLevel 1–2) |

После публикации: правки Supplier не сразу в прод, а через «изменения на модерации» (опционально).

---

## 6. Роли SupplierUser

| Роль | Права |
|------|-------|
| **OWNER** | Полный доступ, настройки Operator, управление пользователями |
| **MANAGER** | Управление событиями/офферами/заявками |
| **CONTENT** | Создание и правка контента (Event, Venue), без финансов |
| **ACCOUNTANT** | Отчёты, выплаты (read-only или export) |

---

## 7. Operator.status (архивация)

| Статус | Описание |
|--------|----------|
| **ACTIVE** | Активный контрагент |
| **ARCHIVED** | Юрлицо закрыто, контент можно передать другому Operator |
| **SUSPENDED** | Временно приостановлен |

При архивации:
- **Не удаляем** Operator (для истории заказов/выплат).
- Можно отключить SupplierUser (`isActive = false`).
- Контент можно перенести на другого Operator (обновить `venue.operatorId` / `event.operatorId`).

**Миграция «закрыли юрлицо»:**
- Опция A: создать новый Operator, перенести `operatorId` на него, старый → ARCHIVED.
- Опция B: owner'ом становится ваш Operator (daibilet), старый → ARCHIVED (осторожно юридически).

---

## 8. Связь с Offers

SupplierUser может:
- создавать Event, Venue;
- создавать Offer (MANUAL, deeplink, widget);
- загружать фото;
- менять цены (для MANUAL provider).

SupplierUser **не может**:
- менять комиссию (commissionRate);
- менять provider config (API-ключи, webhook);
- видеть контент других Operator.

**Принцип:** Supplier управляет контентом. Provider и WidgetProvider — инфраструктура продаж, не связывать с Supplier.

---

## 9. Рекомендация: createdByType

Для разделения происхождения контента добавить в Event и Venue:

```prisma
enum CreatedByType {
  ADMIN   // Создано через админку
  SUPPLIER // Создано через ЛК поставщика
  IMPORT  // Импорт (TC, Teplohod, скрипты)
}

model Event {
  // ...
  createdByType  CreatedByType? @default(IMPORT)  // ADMIN | SUPPLIER | IMPORT
  createdById    String?        @db.Uuid          // adminUserId | supplierUserId | null при IMPORT
}

model Venue {
  // ...
  createdByType  CreatedByType? @default(ADMIN)
  createdById    String?        @db.Uuid
}
```

**План миграции:**
1. Добавить enum и поля.
2. Для существующих: `createdByType = IMPORT` (events из sync), `createdByType = ADMIN` (venues).
3. При создании через Supplier — `createdByType = SUPPLIER`, `createdById = supplierUserId`.

---

## 10. RBAC-чеклист для Supplier

### Разрешения по ролям

| Действие | OWNER | MANAGER | CONTENT | ACCOUNTANT |
|----------|-------|---------|---------|------------|
| Просмотр своих Event/Venue | ✓ | ✓ | ✓ | ✓ |
| Создание DRAFT Event/Venue | ✓ | ✓ | ✓ | — |
| Редактирование своих DRAFT | ✓ | ✓ | ✓ | — |
| Отправка на модерацию | ✓ | ✓ | ✓ | — |
| Редактирование APPROVED (→ DRAFT или PENDING_CHANGES) | ✓ | ✓ | ✓ | — |
| Создание/редактирование Offer | ✓ | ✓ | — | — |
| Управление SupplierUser (добавление/удаление) | ✓ | — | — | — |
| Настройки Operator (реквизиты, комиссия) | ✓ | — | — | — |
| Просмотр отчётов/продаж | ✓ | ✓ | — | ✓ |
| Экспорт выплат | ✓ | — | — | ✓ |

### Проверки доступа

- [ ] Supplier видит только контент своего Operator (`where: { operatorId: supplier.operatorId }`).
- [ ] Supplier не может менять `operatorId`, `commissionRate`, provider config.
- [ ] При создании Event/Venue автоматически подставляется `operatorId` из `supplier.operatorId`.
- [ ] DRAFT/REJECTED видны только Supplier и модераторам; в публичном каталоге — только APPROVED/AUTO_APPROVED.
- [ ] Guard `SupplierAuthGuard` проверяет JWT и загружает `supplier` с `operator`.
- [ ] Роль проверяется через `@Roles(SupplierRole.OWNER)` и т.п.

### API-эндпоинты (Supplier)

- [ ] `GET /supplier/events` — список событий своего Operator.
- [ ] `POST /supplier/events` — создать DRAFT.
- [ ] `PATCH /supplier/events/:id` — редактировать (только свои).
- [ ] `POST /supplier/events/:id/submit` — отправить на модерацию.
- [ ] Аналогично для Venue, Offers.
- [ ] `GET /supplier/dashboard` — сводка продаж.
- [ ] `GET /supplier/reports/sales` — отчёт по продажам.

---

## 11. Текущая реализация в коде

- `Operator` — бизнес-сущность + поля маркетплейса (isSupplier, trustLevel, commission, status).
- `SupplierUser` — аккаунт (email, passwordHash, role), FK → Operator.
- `Event.operatorId`, `Event.supplierId` — владелец (supplierId может дублировать operatorId, уточнить семантику).
- `Event.moderationStatus` — DRAFT | PENDING_REVIEW | APPROVED | REJECTED | AUTO_APPROVED.
- `Venue.operatorId` — партнёр-музей.
- `SupplierRole` — OWNER | MANAGER | CONTENT | ACCOUNTANT.
- `OperatorStatus` — ACTIVE | ARCHIVED | SUSPENDED.
- Модули: `SupplierModule`, `SupplierAuthController`, `SupplierEventsController`, `SupplierDashboardController`, `SupplierReportsController`, `SupplierSettingsController`.
