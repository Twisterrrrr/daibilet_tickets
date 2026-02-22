import { BadRequestException, Injectable } from '@nestjs/common';


import type { DayOfWeek } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

export interface CheckAvailabilityInput {
  offerId: string;
  sessionId?: string | null;
  categoryId?: string | null;
  qty: number;
  openDate?: Date | null;
}

/**
 * AvailabilityService — единая проверка «можно ли купить».
 * Используется в POST /checkout и admin bulk.
 * T5: categoryId, TicketSalesCounter vs quota, allowedDays, ADDON rules.
 */
@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async checkOrThrow(input: CheckAvailabilityInput): Promise<void> {
    const { offerId, sessionId, categoryId, qty, openDate } = input;

    const offer = await this.prisma.eventOffer.findUnique({
      where: { id: offerId },
      include: {
        schedule: true,
        ticketCategories: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      },
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

    // ADDON rule: ADDON categories can only be bought together with PRIMARY
    if (categoryId && offer.ticketCategories.length > 0) {
      const cat = offer.ticketCategories.find((c) => c.id === categoryId);
      if (cat && cat.kind === 'ADDON') {
        throw new BadRequestException(
          'Категория ADDON доступна только вместе с PRIMARY. Выберите основную категорию.',
        );
      }
    }

    // allowedDays: if category has allowedDays, session's weekday must be in the list
    if (sessionId && categoryId && offer.ticketCategories.length > 0) {
      const cat = offer.ticketCategories.find((c) => c.id === categoryId);
      if (cat && cat.allowedDays && cat.allowedDays.length > 0) {
        const session = await this.prisma.eventSession.findFirst({
          where: { id: sessionId, offerId },
        });
        if (session) {
          const dayIdx = session.startsAt.getDay();
          const jsToDay: DayOfWeek[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
          const sessionDay = jsToDay[dayIdx];
          if (!cat.allowedDays.includes(sessionDay)) {
            throw new BadRequestException(
              `Категория "${cat.title}" недоступна в этот день недели`,
            );
          }
        }
      }
    }

    if (sessionId) {
      const session = await this.prisma.eventSession.findFirst({
        where: { id: sessionId, offerId },
        include: {
          quotaOverrides: true,
          salesCounters: true,
        },
      });
      if (!session) throw new BadRequestException('Сеанс не найден');
      if (session.status !== 'ACTIVE') throw new BadRequestException('Сеанс недоступен');
      if (session.startsAt && session.startsAt <= new Date()) {
        throw new BadRequestException('Сеанс уже начался');
      }

      // Category-specific quota: TicketSalesCounter vs TicketQuotaOverride / TicketQuotaDefault
      if (categoryId) {
        const available = await this.getCategoryAvailable(offerId, sessionId, categoryId);
        if (available !== null && available < qty) {
          throw new BadRequestException(`Недостаточно мест. Доступно: ${available}`);
        }
      } else {
        const available = this.getSessionAvailable(session);
        if (available !== null && available < qty) {
          throw new BadRequestException(`Недостаточно мест. Доступно: ${available}`);
        }
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

  private async getCategoryAvailable(
    offerId: string,
    sessionId: string,
    categoryId: string,
  ): Promise<number | null> {
    const [override, defaultQuota, counter] = await Promise.all([
      this.prisma.ticketQuotaOverride.findUnique({
        where: { sessionId_categoryId: { sessionId, categoryId } },
      }),
      this.prisma.ticketQuotaDefault.findFirst({
        where: { offerId, categoryId, isActive: true },
      }),
      this.prisma.ticketSalesCounter.findUnique({
        where: { sessionId_categoryId: { sessionId, categoryId } },
      }),
    ]);

    const capacity =
      override?.capacityTotal ?? defaultQuota?.capacityTotal ?? null;
    if (capacity == null) return null;
    const sold = counter?.soldQty ?? 0;
    return Math.max(0, capacity - sold);
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
