import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

export interface CheckAvailabilityInput {
  offerId: string;
  sessionId?: string | null;
  qty: number;
  openDate?: Date | null;
}

/**
 * AvailabilityService — единая проверка «можно ли купить».
 * Используется в POST /checkout и admin bulk.
 */
@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async checkOrThrow(input: CheckAvailabilityInput): Promise<void> {
    const { offerId, sessionId, qty, openDate } = input;

    const offer = await this.prisma.eventOffer.findUnique({
      where: { id: offerId },
      include: { schedule: true },
    });
    if (!offer) throw new BadRequestException('Оффер не найден');
    if (offer.status !== 'ACTIVE') throw new BadRequestException('Оффер недоступен для покупки');

    if (offer.schedule) {
      if (!offer.schedule.isActive) throw new BadRequestException('Расписание приостановлено');
      const now = new Date();
      if (offer.schedule.salesFrom && now < offer.schedule.salesFrom) {
        throw new BadRequestException('Продажи ещё не начались');
      }
      if (offer.schedule.salesTo && now > offer.schedule.salesTo) {
        throw new BadRequestException('Продажи закончились');
      }
    }

    if (sessionId) {
      const session = await this.prisma.eventSession.findFirst({
        where: { id: sessionId, offerId },
      });
      if (!session) throw new BadRequestException('Сеанс не найден');
      if (session.status !== 'ACTIVE') throw new BadRequestException('Сеанс недоступен');
      if (session.startsAt && session.startsAt <= new Date()) {
        throw new BadRequestException('Сеанс уже начался');
      }

      const available = this.getSessionAvailable(session);
      if (available !== null && available < qty) {
        throw new BadRequestException(`Недостаточно мест. Доступно: ${available}`);
      }
    }

    if (openDate) {
      if (!offer.schedule || offer.schedule.type !== 'OPEN_DATE') {
        throw new BadRequestException('Открытая дата не поддерживается для этого оффера');
      }
      const rule = offer.schedule.rule as { allowedFrom?: string; allowedTo?: string };
      const day = new Date(openDate);
      day.setUTCHours(0, 0, 0, 0);
      if (rule.allowedFrom && new Date(rule.allowedFrom) > day) {
        throw new BadRequestException('Дата вне окна продаж');
      }
      if (rule.allowedTo && new Date(rule.allowedTo) < day) {
        throw new BadRequestException('Дата вне окна продаж');
      }
    }
  }

  private getSessionAvailable(session: {
    capacityTotal: number | null;
    capacitySold: number;
    availableTickets: number;
  }): number | null {
    if (session.capacityTotal != null) {
      return Math.max(0, session.capacityTotal - session.capacitySold);
    }
    return session.availableTickets ?? null;
  }
}
