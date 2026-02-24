# Runbook: Заказ есть, ваучер не создан

## Симптом

Package/заказ в статусе PAID или FULFILLING, но ваучер (Voucher) не создан, клиент не получил письмо с билетами.

## Проверки

1. **Админка → Orders / Packages:** найти заказ по коду, email, paymentId
2. **Статус Package:** PAID → FULFILLING → FULFILLED?
3. **Voucher:** есть ли запись Voucher для Package?
4. **Админка → Jobs → Failed:** failed job `fulfill-package` или `send-order-completed`?
5. **Mail queue:** письмо ушло? (если есть лог отправки)

## Диагностика

- **Package.status = FULFILLING** — job в процессе, подождать или проверить BullMQ
- **Package.status = PAID** — fulfill job не запустился или упал до начала
- **Voucher создан, письмо не доставлено** — проблема SMTP / MailService

## Действия в админке

1. **Retry fulfill job:** Admin → Jobs → Failed → Retry `fulfill-package` для `packageId`
2. **Resend email:** Admin → Order detail → кнопка «Отправить письмо повторно» (если реализовано)
3. **Вручную:** сформировать и отправить ваучер клиенту (если UI/скрипт есть)

## Эскалация

- Retry не помогает (job снова падает)
- Нет кнопки resend / скрипта для ручной отправки
- Нужно восстанавливать данные из бэкапа
