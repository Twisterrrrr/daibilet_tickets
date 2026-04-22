import type { SeedContext } from './_types';
import { FixtureScenario } from './_types';
import { asKopecks, register } from './_helpers';

export async function seedOrders(ctx: SeedContext): Promise<void> {
  ctx.log.step('12 orders (checkout sessions + payment intents + fulfillment)');

  const userPower = ctx.registry.getRequired('user_power_buyer').id;
  const userRefunds = ctx.registry.getRequired('user_with_refunds').id;

  const offerNeva = await ctx.prisma.eventOffer.findUnique({
    where: { source_externalEventId: { source: 'MANUAL', externalEventId: 'fixture-offer-fixture-neva-cruise' } },
  });
  if (!offerNeva) {
    ctx.log.warn('fixture offer not found for event_neva_cruise; orders seed will be partial');
  }

  const makeSnapshot = (title: string, offerId?: string | null) => [
    {
      lineItemIndex: 0,
      offerId: offerId ?? null,
      eventTitle: title,
      unitPrice: asKopecks(1200),
      quantity: 1,
      lineTotal: asKopecks(1200),
      priceCurrency: 'RUB',
      purchaseFlow: 'PLATFORM',
    },
  ];

  const sessions: Array<{
    stableKey: string;
    shortCode: string;
    userId: string | null;
    email: string;
    name: string;
    status: any;
    scenario: FixtureScenario;
    comment: string;
  }> = [
    {
      stableKey: 'order_paid_happy',
      shortCode: 'CS-FX-PAID-001',
      userId: userPower,
      email: 'power.buyer@daibilet.ru',
      name: 'Power Buyer',
      status: 'COMPLETED',
      scenario: FixtureScenario.HAPPY,
      comment: 'PAID happy-path (COMPLETED).',
    },
    {
      stableKey: 'order_awaiting_payment',
      shortCode: 'CS-FX-AWAIT-001',
      userId: userPower,
      email: 'power.buyer@daibilet.ru',
      name: 'Power Buyer',
      status: 'AWAITING_PAYMENT',
      scenario: FixtureScenario.HAPPY,
      comment: 'Awaiting payment (pending intent).',
    },
    {
      stableKey: 'order_failed',
      shortCode: 'CS-FX-FAIL-001',
      userId: userRefunds,
      email: 'refunds.user@daibilet.ru',
      name: 'Refunds User',
      status: 'CANCELLED',
      scenario: FixtureScenario.BROKEN,
      comment: 'Failed/cancelled checkout.',
    },
  ];

  for (const s of sessions) {
    const existing = await ctx.prisma.checkoutSession.findFirst({ where: { shortCode: s.shortCode } });
    const row = existing
      ? await ctx.prisma.checkoutSession.update({
          where: { id: existing.id },
          data: {
            userId: s.userId,
            customerName: s.name,
            customerEmail: s.email,
            status: s.status,
            totalPrice: asKopecks(1200),
            offersSnapshot: makeSnapshot('Прогулка по Неве (fixtures)', offerNeva?.id ?? null) as unknown,
            cartSnapshot: {} as unknown,
            validatedSnapshot: {} as unknown,
          },
        })
      : await ctx.prisma.checkoutSession.create({
          data: {
            shortCode: s.shortCode,
            userId: s.userId,
            customerName: s.name,
            customerEmail: s.email,
            customerPhone: '+7 999 000-00-00',
            status: s.status,
            totalPrice: asKopecks(1200),
            offersSnapshot: makeSnapshot('Прогулка по Неве (fixtures)', offerNeva?.id ?? null) as unknown,
            cartSnapshot: {} as unknown,
            validatedSnapshot: {} as unknown,
          },
        });

    register(ctx, 'CheckoutSession', row.id, {
      stableKey: s.stableKey,
      scenario: s.scenario,
      comment: s.comment,
    });

    // Payment intents (idempotent by idempotencyKey)
    if (s.stableKey === 'order_paid_happy') {
      const intent = await ctx.prisma.paymentIntent.upsert({
        where: { idempotencyKey: 'fx-intent-paid-001' },
        update: { checkoutSessionId: row.id, amount: asKopecks(1200), status: 'PAID', provider: 'STUB', providerPaymentId: 'stub_paid_001' },
        create: { checkoutSessionId: row.id, idempotencyKey: 'fx-intent-paid-001', amount: asKopecks(1200), status: 'PAID', provider: 'STUB', providerPaymentId: 'stub_paid_001' },
      });

      if (offerNeva) {
        const existingFi = await ctx.prisma.fulfillmentItem.findFirst({
          where: { checkoutSessionId: row.id, offerId: offerNeva.id, lineItemIndex: 0 },
        });
        const fi = existingFi
          ? await ctx.prisma.fulfillmentItem.update({
              where: { id: existingFi.id },
              data: { status: 'CONFIRMED', amount: asKopecks(1200), purchaseFlow: 'PLATFORM' },
            })
          : await ctx.prisma.fulfillmentItem.create({
              data: {
                checkoutSessionId: row.id,
                lineItemIndex: 0,
                offerId: offerNeva.id,
                purchaseFlow: 'PLATFORM',
                provider: 'INTERNAL',
                status: 'CONFIRMED',
                amount: asKopecks(1200),
              },
            });

        register(ctx, 'FulfillmentItem', fi.id, {
          stableKey: 'fulfillment_paid_item_1',
          scenario: FixtureScenario.HAPPY,
          comment: 'Fulfillment item for paid order (used for refunds).',
        });
      }

      register(ctx, 'PaymentIntent', intent.id, {
        stableKey: 'payment_intent_paid_1',
        scenario: FixtureScenario.HAPPY,
        comment: 'PAID intent for happy-path order.',
      });
    }

    if (s.stableKey === 'order_awaiting_payment') {
      const intent = await ctx.prisma.paymentIntent.upsert({
        where: { idempotencyKey: 'fx-intent-pending-001' },
        update: { checkoutSessionId: row.id, amount: asKopecks(1200), status: 'PENDING', provider: 'STUB', providerPaymentId: 'stub_pending_001' },
        create: { checkoutSessionId: row.id, idempotencyKey: 'fx-intent-pending-001', amount: asKopecks(1200), status: 'PENDING', provider: 'STUB', providerPaymentId: 'stub_pending_001' },
      });
      register(ctx, 'PaymentIntent', intent.id, {
        stableKey: 'payment_intent_pending_1',
        scenario: FixtureScenario.HAPPY,
        comment: 'PENDING intent for awaiting-payment session.',
      });
    }
  }
}

