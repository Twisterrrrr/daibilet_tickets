import { Injectable } from '@nestjs/common';

import type { PaymentStatus, Prisma } from '@prisma/client';

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

    const { purchaseType, displayStatus } = getPurchaseDisplayType({
      sessionStatus: session.status,
      paymentStatus,
      isExternalFlow,
      hasExternalUrl,
      hasTrack,
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

