# Runbook: Payment.succeeded, но заказа нет

## Симптом

Клиент оплатил в YooKassa, webhook `payment.succeeded` пришёл, но в системе нет заказа / пакета / ваучера.

## Проверки

1. **Админка → Reconciliation → Платежи:** найти PaymentIntent по `providerPaymentId` (ID из YooKassa)
2. **Админка → Reconciliation → Webhooks:** был ли webhook обработан (ProcessedWebhookEvent)
3. **Админка → Reconciliation → Расхождения:** есть ли алерт по этому платежу
4. **Админка → Jobs → Failed:** есть ли failed job `yookassa-webhook` или `fulfill-package`

## Диагностика

- **PaymentIntent:** статус PAID, привязан ли к CheckoutSession/Package?
- **ProcessedWebhookEvent:** если запись есть с `result=PAID` — webhook отработал; если нет — webhook не дошёл или был отклонён
- **Логи:** `[provider=YOOKASSA] [eventId=...] [intent=...]` — искать по payment.id из YooKassa

## Действия в админке

1. **Если webhook не обработан:** проверить IP whitelist YooKassa, повторить платёж через YooKassa (retry notification) или вручную вызвать `markPaid` (если есть такой endpoint)
2. **Если fulfilled job failed:** Admin → Jobs → Failed → Retry по `jobId`
3. **Если PaymentIntent в PAID, но Package не создан:** эскалация (нужен ручной create или скрипт)

## Эскалация

- Нет записи в ProcessedWebhookEvent при повторной доставке webhook
- Failed job не исправляется после retry
- Нужно вручную создавать Package/Voucher по оплаченному платежу
