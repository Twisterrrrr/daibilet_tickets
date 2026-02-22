import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import type { ScheduleType } from '@prisma/client';

export interface UpsertScheduleInput {
  offerId: string;
  type: ScheduleType;
  timezone?: string;
  durationMin?: number | null;
  salesFrom?: Date | null;
  salesTo?: Date | null;
  rule: Record<string, unknown>;
}

const DEFAULT_WINDOW_DAYS = 90;

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(private readonly prisma: PrismaService) {}

  async upsertSchedule(input: UpsertScheduleInput) {
    const offer = await this.prisma.eventOffer.findUnique({
      where: { id: input.offerId },
      include: { event: true },
    });
    if (!offer) throw new Error(`Offer ${input.offerId} not found`);

    const schedule = await this.prisma.eventSchedule.upsert({
      where: { offerId: input.offerId },
      create: {
        offerId: input.offerId,
        type: input.type,
        timezone: input.timezone ?? 'Europe/Moscow',
        durationMin: input.durationMin,
        salesFrom: input.salesFrom,
        salesTo: input.salesTo,
        isActive: true,
        rule: input.rule as object,
      },
      update: {
        type: input.type,
        timezone: input.timezone ?? 'Europe/Moscow',
        durationMin: input.durationMin,
        salesFrom: input.salesFrom,
        salesTo: input.salesTo,
        rule: input.rule as object,
        version: { increment: 1 },
      },
    });

    if (input.type === 'ONE_TIME') {
      const rule = input.rule as { startAt?: string; endAt?: string };
      const startAt = rule.startAt ? new Date(rule.startAt) : new Date();
      const endAt = rule.endAt ? new Date(rule.endAt) : null;
      await this.ensureOneTimeOccurrence(schedule.id, input.offerId, offer.eventId, startAt, endAt);
    }
    // OPEN_DATE: не создаём сессии — дата при покупке в package
    return schedule;
  }

  private async ensureOneTimeOccurrence(
    scheduleId: string,
    offerId: string,
    eventId: string,
    startAt: Date,
    endAt: Date | null,
  ) {
    const existing = await this.prisma.eventSession.findFirst({
      where: { scheduleId },
    });
    if (existing) return;

    const tcSessionId = `sch-onetime-${scheduleId.slice(0, 8)}`;
    await this.prisma.eventSession.create({
      data: {
        eventId,
        offerId,
        scheduleId,
        tcSessionId,
        startsAt: startAt,
        endsAt: endAt,
        availableTickets: 999,
        prices: [{ type: 'adult', price: 0 }],
        isActive: true,
        status: 'ACTIVE',
      },
    });
    this.logger.log(`Created ONE_TIME occurrence for schedule ${scheduleId}`);
  }

  async generateOccurrences(scheduleId: string, from: Date, to: Date): Promise<number> {
    const schedule = await this.prisma.eventSchedule.findUnique({
      where: { id: scheduleId },
      include: { offer: true },
    });
    if (!schedule) throw new Error('Schedule not found');
    if (schedule.type !== 'RECURRENCE') throw new Error('Only RECURRENCE schedules support generate');

    const rule = schedule.rule as {
      daysOfWeek?: number[];
      timeSlots?: string[];
      specificDates?: string[];
    };

    const created: Array<{ offerId: string; startAt: Date }> = [];
    const dayMs = 24 * 60 * 60 * 1000;
    let cur = new Date(from);
    cur.setUTCHours(0, 0, 0, 0);

    while (cur <= to) {
      const dayOfWeek = cur.getUTCDay();
      const dateStr = cur.toISOString().slice(0, 10);
      let includeDay = false;
      if (rule.specificDates?.includes(dateStr)) includeDay = true;
      else if (rule.daysOfWeek?.includes(dayOfWeek)) includeDay = true;

      if (includeDay && rule.timeSlots?.length) {
        for (const slot of rule.timeSlots) {
          const [h, m] = slot.split(':').map(Number);
          const startAt = new Date(cur);
          startAt.setUTCHours(h ?? 0, m ?? 0, 0, 0);
          if (startAt >= from && startAt <= to) {
            created.push({ offerId: schedule.offerId, startAt });
          }
        }
      }
      cur = new Date(cur.getTime() + dayMs);
    }

    let added = 0;
    for (const { offerId, startAt } of created) {
      const exists = await this.prisma.eventSession.findFirst({
        where: { offerId, startsAt: startAt },
      });
      if (exists) continue;

      const endsAt = schedule.durationMin
        ? new Date(startAt.getTime() + schedule.durationMin * 60 * 1000)
        : null;
      await this.prisma.eventSession.create({
        data: {
          eventId: schedule.offer.eventId,
          offerId,
          scheduleId,
          tcSessionId: `sch-rec-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          startsAt: startAt,
          endsAt,
          dateLocal: new Date(startAt.toISOString().slice(0, 10) + 'T00:00:00Z'),
          availableTickets: 999,
          prices: schedule.offer.priceFrom
            ? ([{ type: 'adult', price: schedule.offer.priceFrom }] as object)
            : ([{ type: 'adult', price: 0 }] as object),
          isActive: true,
          status: 'ACTIVE',
        },
      });
      added++;
    }

    this.logger.log(`Generated ${added} occurrences for schedule ${scheduleId}`);
    return added;
  }
}
