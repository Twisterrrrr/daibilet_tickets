# Архитектура Supplier vs Operator

> Разделение ролей: Operator (юрлицо) vs Supplier (аккаунт в ЛК).

---

## 1. Разделение сущностей

| Сущность | Что это | Роль в системе |
|----------|---------|-----------------|
| **Operator** | Юридическое лицо / правообладатель услуги | ООО/ИП, договор, реквизиты, выплаты, комиссия |
| **SupplierUser** | Аккаунт в системе (ЛК поставщика) | Логин/пароль, доступ к ЛК, создаёт Venue/Event, управляет Offers |
| **Provider** | Источник инвентаря | TC, TEPLOHOD, MANUAL — откуда данные |
| **WidgetProvider** | Механизм покупки | TC, RADARIO, REDIRECT — как покупатель платит |
| **Offer** | Конкретное предложение | EventOffer — цена, deeplink, виджет |

**Operator ≠ SupplierUser.** Это разные таблицы.

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
- Контент (Event, Venue) привязан к Operator через `operatorId` / `supplierId` (владелец = юрлицо).

---

## 3. Два операционных режима

### A. Operator-модель (вы ведёте контент)

- Поставщик = контрагент, даёт API или данные.
- Карточки Venue/Event создаёте вы (админка) или автоимпорт.
- SupplierUser может не создаваться.
- Подходит: крупные музеи, teplohod, чисто техническая интеграция.

### B. Supplier-модель (поставщик ведёт контент)

- SupplierUser получает доступ в ЛК.
- Создаёт DRAFT Venue/Event, отправляет на модерацию.
- Админ подтверждает → APPROVED → в каталог.
- Подходит: частные музеи, экскурсионные операторы, маркетплейс.

### Совместная модель

- Оба режима в одной системе.
- Event/Venue имеют `moderationStatus`, `createdByType` (ADMIN | SUPPLIER | IMPORT).

---

## 4. Модерация контента

```
DRAFT → PENDING_REVIEW → APPROVED / REJECTED
              ↓
        AUTO_APPROVED (при trustLevel 1–2)
```

- **DRAFT** — черновик, видит только Supplier и модераторы.
- **PENDING_REVIEW** — отправлено на модерацию.
- **APPROVED** — в каталоге.
- **REJECTED** — отклонено (с причиной в moderationNote).
- **AUTO_APPROVED** — для доверенных поставщиков (trustLevel 1–2).

---

## 5. Роли SupplierUser

| Роль | Права |
|------|-------|
| **OWNER** | Полный доступ, настройки Operator, управление пользователями |
| **MANAGER** | Управление событиями/офферами/заявками |
| **CONTENT** | Создание и правка контента (Event, Venue), без финансов |
| **ACCOUNTANT** | Отчёты, выплаты (read-only или export) |

---

## 6. Operator.status (архивация)

| Статус | Описание |
|--------|----------|
| **ACTIVE** | Активный контрагент |
| **ARCHIVED** | Юрлицо закрыто, контент можно передать другому Operator |
| **SUSPENDED** | Временно приостановлен |

При архивации:
- Не удаляем Operator (для истории заказов/выплат).
- Можно отключить SupplierUser (`isActive = false`).
- Контент можно перенести на другого Operator (обновить `operatorId`).

---

## 7. Связь с Offers

SupplierUser (через Operator) может:

- создавать Event, Venue;
- создавать Offer (MANUAL, deeplink, widget);
- загружать фото;
- менять цены (для MANUAL provider).

SupplierUser **не может**:

- менять комиссию (commissionRate);
- менять provider config (API-ключи, webhook);
- видеть контент других Operator.

---

## 8. Текущая реализация в коде

- `Operator` — бизнес-сущность + поля маркетплейса (isSupplier, trustLevel, commission).
- `SupplierUser` — аккаунт (email, passwordHash, role), FK → Operator.
- `Event.supplierId`, `Event.operatorId` — ссылка на Operator (владелец).
- `Event.moderationStatus` — DRAFT | PENDING_REVIEW | APPROVED | REJECTED | AUTO_APPROVED.
- `SupplierRole` — OWNER | MANAGER (расширить до CONTENT | ACCOUNTANT).
