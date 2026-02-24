# Runbook: Отмена заказа / платежа

## Симптом

Клиент отменил оплату, или заказ нужно отменить до/после оплаты.

## Проверки

1. **Package.status:** DRAFT, PENDING_PAYMENT, PAID?
2. **PaymentIntent:** есть ли активный платёж в YooKassa
3. **CheckoutSession:** истекла ли сессия (TTL 30 мин)

## Диагностика

- **PENDING_PAYMENT:** платёж может быть отменён на стороне YooKassa; webhook `payment.canceled` должен прийти
- **PAID:** отмена = refund (см. refund-request.md)

## Действия в админке

1. **До оплаты:** Package можно отменить/удалить, PaymentIntent — cancel
2. **После payment.canceled:** статус обновится автоматически
3. **При истечении:** cron должен переводить в EXPIRED/CANCELLED

## Эскалация

- Webhook cancel не пришёл, платёж в YooKassa отменён, у нас — PAID
- Нужна принудительная отмена
