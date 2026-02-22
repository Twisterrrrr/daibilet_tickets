import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import type { RescheduleReason } from '@prisma/client';

@Injectable()
export class OccurrencePolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async canDelete(sessionId: string): Promise<boolean> {
    const count = await this.prisma.checkoutPackageItem.count({
      where: { sessionId, package: { status: { in: ['CREATED', 'LOCKED', 'PAID'] } } },
    });
    return count === 0;
  }

  async deleteOrThrow(sessionId: string): Promise<void> {
    const ok = await this.canDelete(sessionId);
    if (!ok) throw new BadRequestException('Нельзя удалить сеанс с существующими заказами');
    await this.prisma.eventSession.update({
      where: { id: sessionId },
      data: { isActive: false },
    });
  }

  async cancel(sessionId: string, reason: string): Promise<void> {
    await this.prisma.eventSession.update({
      where: { id: sessionId },
      data: {
        status: 'CANCELLED',
        rescheduleNote: reason,
      },
    });
  }

  async reschedule(
    sessionId: string,
    newStartsAt: Date,
    reason: RescheduleReason,
    note?: string,
  ): Promise<string> {
    const old = await this.prisma.eventSession.findUnique({ where: { id: sessionId } });
    if (!old) throw new BadRequestException('Сеанс не найден');
    if (old.status === 'RESCHEDULED') throw new BadRequestException('Сеанс уже перенесён');

    const newSession = await this.prisma.eventSession.create({
      data: {
        eventId: old.eventId,
        offerId: old.offerId,
        scheduleId: old.scheduleId,
        tcSessionId: `reschedule-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        startsAt: newStartsAt,
        endsAt: old.endsAt,
        dateLocal: new Date(newStartsAt.toISOString().slice(0, 10) + 'T00:00:00Z'),
        status: 'ACTIVE',
        availableTickets: old.availableTickets,
        capacityTotal: old.capacityTotal,
        capacitySold: old.capacitySold,
        prices: old.prices as object,
        isActive: true,
      },
    });

    await this.prisma.eventSession.update({
      where: { id: sessionId },
      data: {
        status: 'RESCHEDULED',
        rescheduledToId: newSession.id,
        rescheduleReason: reason,
        rescheduleNote: note ?? undefined,
      },
    });

    return newSession.id;
  }
}
