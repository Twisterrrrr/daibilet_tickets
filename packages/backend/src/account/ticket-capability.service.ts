import { Injectable } from '@nestjs/common';
import type { Prisma } from '@/prisma-client';

import { computeTicketAvailable } from './purchase-display.util';
import type { TicketArtifact, TicketCapabilityResult } from './ticket-capability.types';

type CheckoutSessionWithRelations = Prisma.CheckoutSessionGetPayload<{
  include: {
    paymentIntents: true;
    fulfillmentItems: true;
  };
}>;

export interface TicketCapabilityInput {
  session: CheckoutSessionWithRelations;
  appUrl: string;
}

@Injectable()
export class TicketCapabilityService {
  getTicketCapability(input: TicketCapabilityInput): TicketCapabilityResult {
    const { session, appUrl } = input;

    const hasExternalUrl = session.fulfillmentItems.some((f) => f.externalPaymentUrl);
    const hasTrack = session.status === 'COMPLETED';
    const trackUrl = hasTrack ? `${appUrl}/orders/track?code=${session.shortCode}` : null;
    const externalUrl =
      session.fulfillmentItems.find((f) => f.externalPaymentUrl)?.externalPaymentUrl ?? null;

    const ticketAvailable = computeTicketAvailable({
      sessionStatus: session.status,
      hasTrack,
      hasExternalUrl,
      trackUrl,
      externalUrl,
    });

    const artifacts: TicketArtifact[] = [];

    if (hasTrack && trackUrl) {
      artifacts.push({
        type: 'INTERNAL_TICKET',
        url: trackUrl,
        title: 'Билет в Личном кабинете',
        source: 'PLATFORM',
        lineItemIndex: null,
      });
    }

    if (hasExternalUrl && externalUrl) {
      artifacts.push({
        type: 'EXTERNAL_VOUCHER',
        url: externalUrl,
        title: 'Ваучер партнёра',
        source: 'EXTERNAL',
        lineItemIndex: null,
      });
    }

    const primaryArtifact = artifacts[0] ?? null;
    const internal = artifacts.find((a) => a.type === 'INTERNAL_TICKET') ?? null;
    const external = artifacts.find((a) => a.type === 'EXTERNAL_VOUCHER') ?? null;

    return {
      hasArtifact: ticketAvailable,
      primaryArtifact,
      allArtifacts: artifacts,
      canOpenInternalTrack: !!internal,
      canOpenExternalVoucher: !!external,
    };
  }
}

