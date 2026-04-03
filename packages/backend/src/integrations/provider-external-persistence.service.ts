import { Injectable } from '@nestjs/common';
import type { Prisma, TicketProviderCode } from '@prisma/client';
import {
  ExternalIntegrationState,
  ExternalOrderStatus,
  ProviderWebhookProcessingStatus,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProviderExternalPersistenceService {
  constructor(private readonly prisma: PrismaService) {}

  createWebhookLog(data: {
    provider: TicketProviderCode;
    payload: Prisma.InputJsonValue;
    headersJson?: Prisma.InputJsonValue | null;
  }) {
    return this.prisma.providerWebhookLog.create({
      data: {
        provider: data.provider,
        processingStatus: ProviderWebhookProcessingStatus.RECEIVED,
        payload: data.payload,
        headersJson: data.headersJson ?? undefined,
      },
    });
  }

  markWebhookNoOp(
    id: string,
    notes: string,
    status: ProviderWebhookProcessingStatus = ProviderWebhookProcessingStatus.NO_OP_UNSUPPORTED,
  ) {
    return this.prisma.providerWebhookLog.update({
      where: { id },
      data: {
        processingStatus: status,
        notes,
        processedAt: new Date(),
      },
    });
  }

  markWebhookProcessed(id: string) {
    return this.prisma.providerWebhookLog.update({
      where: { id },
      data: {
        processingStatus: ProviderWebhookProcessingStatus.PROCESSED,
        processedAt: new Date(),
      },
    });
  }

  markWebhookError(id: string, errorMessage: string) {
    return this.prisma.providerWebhookLog.update({
      where: { id },
      data: {
        processingStatus: ProviderWebhookProcessingStatus.ERROR,
        errorMessage,
        processedAt: new Date(),
      },
    });
  }

  /** Extension point: черновик внешнего заказа (checkout createExternalOrder — позже). */
  createExternalOrderPlaceholder(data: {
    provider: TicketProviderCode;
    externalOrderId: string;
    checkoutSessionId?: string | null;
    packageId?: string | null;
    packageItemId?: string | null;
    payloadJson?: Prisma.InputJsonValue | null;
  }) {
    return this.prisma.externalOrderLink.create({
      data: {
        provider: data.provider,
        externalOrderId: data.externalOrderId,
        status: ExternalOrderStatus.OPEN,
        integrationState: ExternalIntegrationState.CREATED,
        payloadJson: data.payloadJson ?? undefined,
        checkoutSessionId: data.checkoutSessionId ?? undefined,
        packageId: data.packageId ?? undefined,
        packageItemId: data.packageItemId ?? undefined,
      },
    });
  }
}
