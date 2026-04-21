# Entity: Users / Orders / Checkout

## Domain role

Покупательский контур и зеркала заказов; критичные инварианты оплаты и webhook.

## Канон

- [`../core/checkout.md`](../core/checkout.md) — инварианты checkout/виджета.
- [`../product/finance.md`](../product/finance.md) — финансовый контур (приоритет UI см. [`../PROJECT-FOUNDATION.md`](../PROJECT-FOUNDATION.md)).

## Admin

- Заказы, возвраты, логи платежей — по мере покрытия в Admin V3; ops и RBAC — [`../runbooks/infra.md`](../runbooks/infra.md).

## Relations

- CheckoutSession, PaymentIntent, fulfillment — см. backend и `core/checkout.md`.
