import { Injectable } from '@nestjs/common';
import type { Prisma, TicketProviderCode } from '@prisma/client';
import { ProviderLinkStatus, ProviderSyncMode } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

/**
 * Сервис записи EventProviderLink: при isPrimary сбрасывает остальные primary у события (транзакция).
 */
@Injectable()
export class EventProviderLinkService {
  constructor(private readonly prisma: PrismaService) {}

  async createLinkWithPrimaryGuard(args: {
    eventId: string;
    provider: TicketProviderCode;
    externalEventId: string;
    syncMode?: ProviderSyncMode;
    status?: ProviderLinkStatus;
    isPrimary?: boolean;
    priority?: number;
    configJson?: Prisma.InputJsonValue;
    rawSnapshotJson?: Prisma.InputJsonValue;
  }) {
    const {
      eventId,
      isPrimary,
      provider,
      externalEventId,
      syncMode = ProviderSyncMode.PULL,
      status = ProviderLinkStatus.ACTIVE,
      priority = 0,
      configJson,
      rawSnapshotJson,
    } = args;

    return this.prisma.$transaction(async (tx) => {
      if (isPrimary) {
        await tx.eventProviderLink.updateMany({
          where: { eventId },
          data: { isPrimary: false },
        });
      }
      return tx.eventProviderLink.create({
        data: {
          eventId,
          provider,
          externalEventId,
          syncMode,
          status,
          isPrimary: isPrimary ?? false,
          priority,
          configJson: configJson ?? undefined,
          rawSnapshotJson: rawSnapshotJson ?? undefined,
        },
      });
    });
  }

  /** Удобный фабричный метод для тестов. */
  seedActivePrimaryLink(eventId: string, provider: TicketProviderCode, externalEventId: string) {
    return this.createLinkWithPrimaryGuard({
      eventId,
      provider,
      externalEventId,
      syncMode: ProviderSyncMode.PULL,
      status: ProviderLinkStatus.ACTIVE,
      isPrimary: true,
      priority: 0,
    });
  }
}
