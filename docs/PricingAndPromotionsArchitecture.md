# Pricing & Promotions Architecture (Phase 6)

> MVP: promo codes, rule-based. Без динамического ценообразования.

## Goal
Промокоды (code, %, fix). Early bird / last minute — LATER. Featured placements — через PromoBlock.

## PromoCode Model (Prisma)
- code (unique), type (PERCENT|FIXED), value (number)
- operatorId?, eventIds[] (optional scope)
- validFrom, validTo
- maxUses, usedCount
- isActive

## Conflict Policy
Один промокод на checkout. При нескольких применимых — первый по приоритету. Детерминированно.

## Checkout
Валидация в PaymentService или CheckoutService. Body: { promoCode?: string }. Response: discountedTotal, appliedPromo.

## Backend
- PromoCodeService: validate(code, checkoutContext)
- PromoCode model + migration

## Frontend
Supplier: PromoCodes CRUD. Admin: promo moderation.

## Definition of Done
- PromoCode CRUD
- Checkout применяет промокод
- Конфликт policy документирована
