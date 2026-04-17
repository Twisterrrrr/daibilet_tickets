import type { SeedContext } from './_types';
import { FixtureScenario } from './_types';
import { asKopecks, register } from './_helpers';

export async function seedRefunds(ctx: SeedContext): Promise<void> {
  ctx.log.step('13 refunds');

  const fiRef = ctx.registry.getOptional('fulfillment_paid_item_1');
  const intentRef = ctx.registry.getOptional('payment_intent_paid_1');
  if (!fiRef || !intentRef) {
    ctx.log.warn('Refund seeds skipped: missing fulfillment/payment intent fixtures');
    return;
  }

  const amount = asKopecks(1200);

  const refunds: Array<{
    stableKey: string;
    status: any;
    scenario: FixtureScenario;
    comment: string;
  }> = [
    { stableKey: 'refund_new', status: 'CREATED', scenario: FixtureScenario.HAPPY, comment: 'Новая заявка на возврат.' },
    { stableKey: 'refund_approved', status: 'APPROVED', scenario: FixtureScenario.HAPPY, comment: 'Одобрена админом.' },
    { stableKey: 'refund_rejected', status: 'REJECTED', scenario: FixtureScenario.HAPPY, comment: 'Отклонена.' },
    { stableKey: 'refund_processed', status: 'COMPLETED', scenario: FixtureScenario.HAPPY, comment: 'Выполнена (completed).' },
  ];

  for (const r of refunds) {
    // idempotent: find first by (fulfillmentItemId, status) is not unique → use reasonNote marker.
    const marker = `fixture:${r.stableKey}`;
    const existing = await ctx.prisma.refundRequest.findFirst({
      where: { fulfillmentItemId: fiRef.id, paymentIntentId: intentRef.id, reasonNote: marker },
    });

    const row = existing
      ? await ctx.prisma.refundRequest.update({
          where: { id: existing.id },
          data: { status: r.status, amount, reason: 'OTHER', reasonNote: marker },
        })
      : await ctx.prisma.refundRequest.create({
          data: {
            fulfillmentItemId: fiRef.id,
            paymentIntentId: intentRef.id,
            amount,
            currency: 'RUB',
            reason: 'OTHER',
            reasonNote: marker,
            status: r.status,
            createdByType: 'ADMIN',
          },
        });

    register(ctx, 'RefundRequest', row.id, {
      stableKey: r.stableKey,
      scenario: r.scenario,
      comment: r.comment,
    });
  }
}

