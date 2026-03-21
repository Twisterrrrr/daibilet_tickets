## Gate 0 и Gate 1 — инфраструктура и платежи

> Краткий runbook по текущему состоянию ворот запуска.

---

## Gate 0 — окружения доступны, данные безопасны

### Gate 0a — Staging (закрыт)

- Отдельная ветка `staging`, auto‑deploy через `.github/workflows/staging-deploy.yml`.
- Сервер: VPS Timeweb Cloud, путь `/opt/daibilet`.
- DNS: `staging.daibilet.ru`, `api-staging.daibilet.ru`, `admin-staging.daibilet.ru` → IP VPS.
- SSL: Let's Encrypt (скрипты `scripts/init-letsencrypt.sh`, `scripts/enable-ssl-staging.sh`), nginx в `deploy/nginx`.
- Деплой: `scripts/remote-deploy-staging.sh` + `deploy/staging/deploy.sh`:
  - `git fetch/reset` на указанный `DEPLOY_BRANCH` (по умолчанию `staging`);
  - `docker compose -f deploy/staging/docker-compose.yml --env-file deploy/staging/.env -p daibilet-staging up -d --build`;
  - `prisma migrate deploy` + `FULL_SYNC=1 pnpm full:sync` в one‑off backend‑контейнере;
  - health‑check (`scripts/verify-staging.sh`) по фронту и `https://api-staging.daibilet.ru/api/v1/health`.
- ENV: `deploy/staging/.env` (генерируется `scripts/generate-env-staging.sh`), критично наличие `TC_API_TOKEN`, `TC_WIDGET_TOKEN`.

### Gate 0b — Production (закрыт)

- Ветка `main` = prod‑источник. Деплой:
  - вручную: `DEPLOY_BRANCH=main BACKUP_BEFORE_DEPLOY=1 bash deploy/production/deploy.sh` на сервере;
  - из CI: `.github/workflows/prod-deploy.yml` (ручной `workflow_dispatch`, SSH в `/opt/daibilet`, запуск `deploy/production/deploy.sh`).
- DNS:
  - `daibilet.ru`, `www.daibilet.ru` → фронтенд;
  - `admin.daibilet.ru` → админка;
  - `api.daibilet.ru` → backend API (`/api/v1/*`).
- SSL:
  - используется Timeweb Pro сертификат `www.daibilet.ru` (GlobalSign AlphaSSL), физически размещённый в Docker‑томе `daibilet-prod_nginx_certbot_conf` по пути `live/daibilet.ru/{fullchain.pem,privkey.pem}`;
  - один и тот же сертификат обслуживает `daibilet.ru`, `www.daibilet.ru`, `admin.daibilet.ru`, `api.daibilet.ru` через nginx в `deploy/nginx`.
- Прод‑деплой `deploy/production/deploy.sh`:
  - `git fetch origin $DEPLOY_BRANCH && git checkout -B $DEPLOY_BRANCH origin/$DEPLOY_BRANCH && git reset --hard origin/$DEPLOY_BRANCH`;
  - проверка существования `deploy/production/.env` (создаётся `scripts/generate-env-production.sh`);
  - `docker compose -f deploy/production/docker-compose.yml --env-file deploy/production/.env -p daibilet-prod up -d postgres redis` (подготовка БД/Redis);
  - при `BACKUP_BEFORE_DEPLOY=1` — `scripts/backup-production-db.sh` (дамп в `/opt/daibilet/backups/`);
  - `docker compose -f deploy/production/docker-compose.yml --env-file deploy/production/.env -p daibilet-prod up -d --build`;
  - `docker compose ... run --rm backend npx prisma migrate deploy`;
  - HTTP health‑check:
    - `https://daibilet.ru` (главная),
    - `https://admin.daibilet.ru`,
    - `https://api.daibilet.ru/api/v1/health` (ожидается `{"status":"ok","db":true,"redis":true}`).
- Временная конфигурация Gate 0:
  - в `deploy/production/docker-compose.yml` выставлено `PAYMENT_PROVIDER=STUB`, чтобы прод не требовал боевых YooKassa‑ключей и не создавал реальные платежи;
  - все реальные платежные потоки считаются **выключенными**, пока не будет явно включён Gate 1.

### Gate 0.5 — Pre-payment hardening (STUB)

> Промежуточный шаг между Gate 0 и Gate 1: убеждаемся, что checkout/fulfilment‑контур stabilен на STUB до включения реальных платежей.

**Что проверить (staging и прод):**

1. **Happy‑path checkout на STUB (как пользователь)**
   - выбрать тестовое событие (staging: `test-event-buyer-account`, prod: `test-event-prod`);
   - пройти экран выбора билетов → заполнить контакты → перейти в «оплату» (STUB);
   - вернуться в систему после «оплаты»:
     - статус `CheckoutSession`/заказа соответствует успешной оплате STUB;
     - в ЛК (`/account/purchases`, `/account/tickets`) заказ и билеты отображаются корректно;
     - гость по `shortCode` (`/orders/track/:shortCode` или `/checkout/track/:shortCode`) видит ожидаемое состояние.

2. **Edge‑cases checkout**
   - событие/сеанс без доступных слотов не даёт начать покупку (CTA отключён, backend возвращает осмысленную ошибку);
   - sold‑out сеанс блокирует покупку как на фронте, так и в backend;
   - двойной клик по CTA / повторный submit формы не создаёт дубликаты `CheckoutSession`/`PaymentIntent`;
   - refresh страницы «оплаты» и повторный вход в checkout не ломают состояние заказа (пользователь не теряет покупку / не получает дубликат).

3. **Идемпотентность seed/fulfilment**
   - повторный запуск сидов (`db:seed:buyer-test`, `seed-event-sessions-test`, `seed-prod-test.ts`) не создаёт дублирующих записей по устойчивым ключам:
     - `CheckoutSession` (по коду/slug события и e‑mail),
     - `PaymentIntent` (по внешнему paymentId/idempotencyKey),
     - `FulfillmentItem` (по связке `checkoutSessionId`/`eventSessionId`/`ticketCode`).
   - повторный вызов fulfilment‑обработчика (эмуляция повторного webhook’а) не плодит дополнительные `FulfillmentItem` и не меняет уже выданные билеты.

Gate 0.5 считается закрытым, когда все проверки выше пройдены на staging и хотя бы на тестовом сценарии на prod (с STUB).

### Скрипт оператора — Gate 0.5 (STUB)

#### 0. Что подготовить заранее

Нужно иметь:

- staging: тестовое событие `test-event-buyer-account`
- prod: тестовое событие `test-event-prod`
- доступ к:
  - сайту (staging/prod),
  - ЛК покупателя,
  - при необходимости админке
- тестовый email (который можно использовать для покупки на STUB)
- желательно открыть DevTools → `Network` и `Console`

#### 1. Проверка happy-path checkout

1.1. Открыть страницу события  

- Staging:
  - `https://staging.daibilet.ru/events/test-event-buyer-account` (или фактический URL события)
- Prod:
  - `https://daibilet.ru/events/test-event-prod` (или фактический URL события)

1.2. Что проверить на странице события  

Зафиксировать скриншот:

- заголовок события
- цена
- слоты / даты
- кнопка покупки
- рейтинг / отзывы (если видны)

1.3. Начать покупку  

Действия:

- нажать «Купить билет»
- выбрать ближайший доступный слот
- выбрать 1 билет базового типа
- перейти к checkout

1.4. На checkout-экране  

Ввести:

- имя: `Test User`
- email: свой тестовый email
- телефон: тестовый номер (если обязателен)

Зафиксировать:

- скриншот checkout до подтверждения
- event title
- дата/время
- тип билета
- количество
- сумма

1.5. Завершить STUB-оплату  

Нажать кнопку оплаты / подтверждения заказа.

Ожидаемо:

- система не падает
- происходит переход на success / order / account page
- заказ получает успешный статус по STUB-flow

Зафиксировать:

- финальный URL
- скриншот success/order page
- номер заказа / short code / checkout code (если есть)
- статус заказа

#### 2. Проверка результата в ЛК

2.1. Открыть ЛК  

Открыть:

- `/account`
- `/account/orders`
- `/account/tickets`
  - или фактические маршруты проекта

2.2. Что проверить  

Найти созданный заказ и зафиксировать скриншоты:

- заказ появился в истории
- статус оплаты успешный / `completed` / `paid`
- событие и дата совпадают с checkout
- есть билет / ваучер / бронь
- если есть QR/PDF: он доступен или хотя бы есть запись о билете в карточке

2.3. Что дополнительно записать  

Вручную зафиксировать:

- email покупателя
- `order id` / `short code`
- `checkout session id`, если виден
- `ticket/voucher id`, если виден

#### 3. Проверка fulfilment

3.1. Что нужно подтвердить  

После STUB-оплаты должно быть:

- создано не более одного `FulfillmentItem` (на успешный чек-аут для выбранного слота)
- создан билет / ваучер
- в ЛК нет дублей

3.2. Что заскриншотить  

- экран заказа в ЛК
- экран билета / ваучера
- (если есть админка/трекер заказа) экран со статусом fulfilment

#### 4. Edge cases

4.1. Нет доступных слотов  

- открыть событие без слотов (или временно событие/дату без availability)
- проверить:
  - кнопку купить нельзя пройти до успешного checkout
  - UI показывает, что слотов нет (empty state/объяснение)
- зафиксировать:
  - скриншот страницы
  - текст ошибки / пустого состояния

4.2. Sold out  

- открыть sold out слот
- попробовать купить
- проверить:
  - покупка не проходит
  - блокировка понятная
- зафиксировать:
  - скриншот
  - текст статуса / ошибки

4.3. Двойной клик по кнопке оплаты  

- на checkout выбрать билет
- быстро нажать кнопку оплаты 2 раза
- проверить:
  - не создаются 2 заказа
  - не возникает дублирования `checkout/payment`
  - кнопка либо блокируется, либо повторный submit безопасен
- зафиксировать:
  - `Network` screenshot
  - итоговый order/result screen
  - число реально созданных заказов в ЛК

4.4. Refresh страницы checkout / success  

- дойти до checkout
- обновить страницу
- затем снова завершить STUB-flow
- отдельно после успешного заказа:
  - обновить success/order page

Проверить:

- страница не ломается
- не создаётся повторный fulfilment
- заказ не дублируется

Зафиксировать:

- screenshots before/after refresh
- итоговый статус заказа

#### 5. Идемпотентность

5.1. Повторный запуск сидов  

После повторного запуска тестовых сидов проверить:

- тестовое событие не дублируется
- тестовый пользователь не дублируется
- тестовые отзывы не множатся бесконтрольно
- seeded order chain не ломается

Зафиксировать:

- короткий текстовый лог результата
- при необходимости скриншот из админки / UI

5.2. Fulfilment не дублируется  

Для одного успешного checkout проверить:

- один заказ
- один fulfilment
- один билет/ваучер на положенную quantity
- нет повторной выдачи после refresh / retry

#### Что фиксировать по итогам каждого прогона

Для каждого окружения (staging, prod) сохранить:

- минимальный набор скриншотов
  - страница события
  - checkout до оплаты
  - success/order page после оплаты
  - ЛК → история заказов
  - ЛК → билет / ваучер
  - edge-case: нет слотов или sold out
  - edge-case: двойной клик / повторный submit, если виден результат
- минимальный текстовый лог

В заметку:

- дата и время прогона
- окружение
- URL события
- email покупателя
- order code / short code
- результат happy-path
- результат edge-cases
- были ли дубли
- были ли ошибки в console/network
- итог: `PASS` / `FAIL`

#### Критерий закрытия Gate 0.5

Gate 0.5 можно считать закрытым, если:

- staging: happy-path пройден полностью
- prod: минимум один полный happy-path на STUB пройден
- нет дублей заказа / fulfilment / voucher
- нет критических ошибок на refresh / retry / double click
- сценарии без слотов / sold out отрабатывают корректно

### Прод‑тестовые данные (Gate 0b ready for Gate 1)

- Seed‑скрипт `packages/backend/prisma/seed-prod-test.ts` (запуск через `deploy/production/run-prod-test-seeds.sh`):
  - создаёт/обновляет тестовое событие `test-event-prod` (тип MANUAL, город Санкт-Петербург) с собственным venue, offer и набором будущих `EventSession`;
  - добавляет до ~2–5 отзывов `APPROVED`, чтобы PDP имела стабильный рейтинг;
  - создаёт/обновляет тестового пользователя `test.yookassa@daibilet.ru` (пароль `TestUser123!`);
  - формирует связку:
    - `CheckoutSession` со статусом `COMPLETED` (код `CS-PROD-TEST`),
    - `PaymentIntent` со статусом `PAID` и `provider='YOOKASSA'` (данные только для сценариев Gate 1),
    - `FulfillmentItem` со статусом `CONFIRMED`.
- Проверяемая цепочка на проде:
  - `https://daibilet.ru/events/test-event-prod` — страница события, расписание и отзывы;
  - логин `test.yookassa@daibilet.ru / TestUser123!` на `https://daibilet.ru/login`:
    - раздел «Мои покупки» / `GET /account/purchases` показывает тестовый заказ,
    - раздел «Билеты» / `GET /account/tickets` отражает fulfilment по `test-event-prod`.

---

## Gate 1 — включение YooKassa (пока не активирован)

### Техническая цель

- Перевести `PAYMENT_PROVIDER` в режиме production с `STUB` на `YOOKASSA`, подключив боевые ключи и обеспечив:
  - создание платежей в YooKassa (init → redirect/confirmation → оплата);
  - приём webhook’ов о статусах платежей;
  - идемпотентное fulfilment заказов (выдача билетов/ваучеров) на основе платёжных событий.

### Предпосылки (сделано в рамках Gate 0)

- Слой `PaymentIntent` + state‑machine для `CheckoutSession/OrderRequest/PaymentIntent` уже реализован.
- Поддерживается `provider: 'STUB' | 'YOOKASSA'`, логика STUB обкатана на staging и в тестовых сид‑сценариях.
- Личный кабинет (`/account/*`) строит read‑model по `CheckoutSession` + `PaymentIntent` + `FulfillmentItem` и готов к показу реальных платежей.

### Что нужно будет сделать для открытия Gate 1

- Production:
  - заполнить в `deploy/production/.env` боевые `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY` и связанные настройки (return/callback URLs);
  - сменить `PAYMENT_PROVIDER=STUB` на `PAYMENT_PROVIDER=YOOKASSA` (в .env / docker‑compose).
- Backend:
  - убедиться, что `PaymentService` при `provider=YOOKASSA` создаёт платёж через API YooKassa и сохраняет `PaymentIntent` с корректной связкой `paymentId ↔ checkoutSessionId`;
  - реализовать/проверить endpoint webhook’а YooKassa (`/webhooks/yookassa`):
    - верификация подписи/секрета,
    - идемпотентность по event/idempotencyKey,
    - логирование и хранение `PaymentEventLog`.
  - в `PaymentService.applyWebhookEvent` корректно переходить в `PAID/FAILED/CANCELLED/REFUNDED` и ставить задачу fulfilment в очередь BullMQ.
- Fulfilment:
  - убедиться, что FulfillmentProcessor и VoucherService/Account‑слой устойчивы к повторным вызовам (идемпотентность).

### Рекомендованный порядок включения Gate 1

1. **Sandbox YooKassa (staging)**:
   - настроить .env staging на sandbox‑ключи YooKassa;
   - выполнить 3–5 платёжных сценариев end‑to‑end (успешная оплата, отмена, возврат) на тестовом событии;
   - убедиться, что `/account/purchases` и `/account/tickets` корректно отображают статусы.
2. **Prod “только платёж” (ограниченный rollout)**:
   - включить YooKassa в проде с минимальным набором платёжных методов;
   - использовать `test-event-prod` и ограниченный круг реальных тестов (микроплатежи).
3. **Полный rollout**:
   - расширить спектр платёжных сценариев;
   - включить YooKassa для основной массы событий и промо‑трафика.

