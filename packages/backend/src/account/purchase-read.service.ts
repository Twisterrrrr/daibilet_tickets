/**
 * AUDIT: Buyer Account / purchases read-layer (2026-04-14)
 *
 * Canonical DB record for a "purchase" in the cabinet: CheckoutSession (checkout_sessions),
 * not a separate CustomerPurchase table. One session = one order row in the account UI;
 * display type/status = projection via getPurchaseDisplayType + derivePurchaseActions
 * (purchase-display.util.ts).
 *
 * Where a purchase is considered recorded:
 * - Internal payment: CheckoutSession reaches terminal states and PaymentIntent.status = PAID;
 *   completion paths: payment.service.ts, fulfillment.service.ts (e.g. session COMPLETED).
 * - External widget (TC/TEP): FulfillmentItem (purchaseFlow EXTERNAL, provider, externalOrderId,
 *   externalPaymentUrl); ExternalOrderLink may mirror provider order (integrations).
 * - Webhooks: raw events in PaymentEventLog; completion still updates CheckoutSession/FulfillmentItem.
 *
 * Triggers in practice: successful payment, fulfillment confirmation, provider redirect/callback —
 * all converge on CheckoutSession + FulfillmentItem updates, not a separate "purchase insert".
 *
 * GAP vs a greenfield "CustomerPurchase" spec:
 * - No CustomerPurchase table — add as projection/materialized layer only if needed, without breaking FKs.
 * - Purchases without CheckoutSession/userId linkage do not appear in account until modeled.
 * - RefundRequest is tied to FulfillmentItem + PaymentIntent; FulfillmentRefundRequestService may call
 *   real provider refunds — broader than "request-only workflow" in the product brief.
 *
 * Single read path for "My purchases" list: this service + AccountService.getPurchases.
 * Order detail: AccountService.getOrderDetail -> CheckoutService.getOrderByIdForUser.
 */
import { Injectable } from '@nestjs/common';

import type { PaymentStatus, Prisma } from '@/prisma-client';

import type { PurchaseListItemDto } from './dto/account.dto';
import { derivePurchaseActions, getPurchaseDisplayType } from './purchase-display.util';
import { TicketCapabilityService } from './ticket-capability.service';

export type CheckoutSessionWithRelations = Prisma.CheckoutSessionGetPayload<{
  include: {
    paymentIntents: true;
    fulfillmentItems: true;
  };
}>;

export interface PurchaseReadContext {
  appUrl: string;
  sessionStartsAtMap: Map<string, string>;
}

@Injectable()
export class PurchaseReadService {
  constructor(private readonly ticketCapability: TicketCapabilityService) {}

  mapSessionToPurchase(session: CheckoutSessionWithRelations, ctx: PurchaseReadContext): PurchaseListItemDto {
    const lastIntent = session.paymentIntents[0];
    const paymentStatus = (lastIntent?.status ?? 'PENDING') as PaymentStatus;

    const snapshot =
      ((session.offersSnapshot as Array<{
        eventTitle?: string;
        sessionId?: string;
        quantity?: number;
      }>) ?? []);
    const firstSnap = snapshot[0];
    const eventTitle = firstSnap?.eventTitle ?? 'Покупка';
    const firstSessionId = firstSnap?.sessionId;
    const eventDate = firstSessionId ? ctx.sessionStartsAtMap.get(firstSessionId) ?? null : null;

    const hasExternalUrl = session.fulfillmentItems.some((f) => f.externalPaymentUrl);
    const hasTrack = session.status === 'COMPLETED';
    const trackUrl = hasTrack ? `${ctx.appUrl}/orders/track?code=${session.shortCode}` : null;
    const externalUrl =
      session.fulfillmentItems.find((f) => f.externalPaymentUrl)?.externalPaymentUrl ?? null;
    const isExternalFlow = session.fulfillmentItems.some((f) => f.purchaseFlow === 'EXTERNAL');
    const isProviderTcOrTep = session.fulfillmentItems.some(
      (f) => f.provider === 'TC' || f.provider === 'TEP',
    );

    const { purchaseType, displayStatus } = getPurchaseDisplayType({
      sessionStatus: session.status,
      paymentStatus,
      isExternalFlow,
      hasExternalUrl,
      hasTrack,
      isProviderTcOrTep,
    });

    const capability = this.ticketCapability.getTicketCapability({
      session,
      appUrl: ctx.appUrl,
    });

    const { primaryAction, secondaryAction } = derivePurchaseActions({
      purchaseType,
      lastIntentPaymentUrl: lastIntent?.paymentUrl ?? null,
      trackUrl,
      externalUrl,
    });

    return {
      purchaseId: session.id,
      shortCode: session.shortCode,
      eventTitle,
      purchaseDate: session.createdAt.toISOString(),
      eventDate,
      displayStatus,
      purchaseType,
      ticketAvailable: capability.hasArtifact,
      primaryAction,
      secondaryAction,
    };
  }
}
