import { Injectable } from '@nestjs/common';
import { EventCategory, EventSource } from '@/prisma-client';

import { ReportsRepository } from './reports.repository';
import { ReportQueryDto } from './dto/report-query.dto';

const DEFAULT_RANGE_DAYS = 30;

function parseDate(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

@Injectable()
export class ReportsService {
  constructor(private readonly repo: ReportsRepository) {}

  private resolveRange(dto: ReportQueryDto): { from: Date; to: Date } {
    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setDate(defaultFrom.getDate() - DEFAULT_RANGE_DAYS);

    const from = parseDate(dto.from, defaultFrom);
    const to = parseDate(dto.to, now);

    return { from, to };
  }

  async getSalesByOperatorDay(dto: ReportQueryDto) {
    const { from, to } = this.resolveRange(dto);

    const rows = await this.repo.getSalesByOperatorDay({
      from,
      to,
      cityId: dto.cityId,
      operatorId: dto.operatorId,
      source: dto.source as EventSource | undefined,
      category: dto.category as EventCategory | undefined,
    });

    return rows.map((r) => ({
      day: r.day,
      operatorId: r.operatorId,
      source: r.source,
      ordersCount: Number(r.ordersCount),
      ticketsSold: Number(r.ticketsSold),
      grossRevenue: Number(r.grossRevenue),
      commissionAmount: Number(r.commissionAmount),
      netAmount: Number(r.netAmount),
    }));
  }

  async getSalesByEvent(dto: ReportQueryDto) {
    const { from, to } = this.resolveRange(dto);

    const rows = await this.repo.getSalesByEvent({
      from,
      to,
      cityId: dto.cityId,
      operatorId: dto.operatorId,
      source: dto.source as EventSource | undefined,
      category: dto.category as EventCategory | undefined,
    });

    return rows.map((r) => ({
      eventId: r.eventId,
      title: r.title,
      cityId: r.cityId,
      operatorId: r.operatorId,
      source: r.source,
      ticketsSold: Number(r.ticketsSold),
      revenue: Number(r.revenue),
      avgTicketPrice: r.avgTicketPrice,
      lastSaleAt: r.lastSaleAt,
    }));
  }

  async getSessionOccupancy(dto: ReportQueryDto & { from?: string; to?: string }) {
    const now = new Date();
    const defaultFrom = parseDate(dto.from, now);
    const defaultTo = parseDate(
      dto.to,
      new Date(now.getTime() + DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000),
    );

    const rows = await this.repo.getSessionOccupancy({
      from: defaultFrom,
      to: defaultTo,
      operatorId: dto.operatorId,
      cityId: dto.cityId,
      category: dto.category as EventCategory | undefined,
    });

    return rows.map((r) => ({
      sessionId: r.sessionId,
      startsAt: r.startsAt,
      title: r.title,
      operatorId: r.operatorId,
      capacityTotal: r.capacityTotal,
      soldQty: Number(r.soldQty),
      availableQty: Number(r.availableQty),
      occupancyPct: r.occupancyPct,
    }));
  }

  async getSupplierDashboard(operatorId: string) {
    const { from, to } = this.resolveRange({});

    const [salesByDay, salesByEvent, upcomingSessions] = await Promise.all([
      this.repo.getSalesByOperatorDay({ from, to, operatorId, cityId: undefined, source: undefined, category: undefined }),
      this.repo.getSalesByEvent({ from, to, operatorId, cityId: undefined, source: undefined, category: undefined }),
      this.repo.getSessionOccupancy({
        from: new Date(),
        to: new Date(Date.now() + DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000),
        operatorId,
        cityId: undefined,
        category: undefined,
      }),
    ]);

    const ticketsSold = salesByDay.reduce((acc, r) => acc + Number(r.ticketsSold), 0);
    const grossRevenue = salesByDay.reduce((acc, r) => acc + Number(r.grossRevenue), 0);
    const commissionAmount = salesByDay.reduce((acc, r) => acc + Number(r.commissionAmount), 0);
    const netAmount = salesByDay.reduce((acc, r) => acc + Number(r.netAmount), 0);

    const topEvents = salesByEvent
      .sort((a, b) => Number(b.revenue) - Number(a.revenue))
      .slice(0, 5)
      .map((e) => ({
        eventId: e.eventId,
        title: e.title,
        ticketsSold: Number(e.ticketsSold),
        revenue: Number(e.revenue),
        lastSaleAt: e.lastSaleAt,
      }));

    const upcoming = upcomingSessions
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
      .slice(0, 10);

    return {
      ticketsSold,
      grossRevenue,
      commissionAmount,
      netAmount,
      topEvents,
      upcomingSessions: upcoming,
    };
  }
}

