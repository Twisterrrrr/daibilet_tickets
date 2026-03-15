import { Injectable } from '@nestjs/common';
import { EventCategory, EventSource } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

type NullableString = string | null;

interface SalesByOperatorDayRow {
  day: Date;
  operatorId: NullableString;
  source: EventSource;
  ordersCount: bigint;
  ticketsSold: bigint;
  grossRevenue: bigint;
  commissionAmount: bigint;
  netAmount: bigint;
}

interface SalesByEventRow {
  eventId: string;
  title: string;
  cityId: string;
  operatorId: NullableString;
  source: EventSource;
  ticketsSold: bigint;
  revenue: bigint;
  avgTicketPrice: number;
  lastSaleAt: Date | null;
}

interface SessionOccupancyRow {
  sessionId: string;
  startsAt: Date;
  title: string;
  operatorId: NullableString;
  capacityTotal: number | null;
  soldQty: bigint;
  availableQty: bigint;
  occupancyPct: number;
}

@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getSalesByOperatorDay(query: {
    from: Date;
    to: Date;
    cityId?: string;
    operatorId?: string;
    source?: EventSource;
    category?: EventCategory;
  }): Promise<SalesByOperatorDayRow[]> {
    const { from, to, cityId, operatorId, source, category } = query;

    const rows = await this.prisma.$queryRaw<SalesByOperatorDayRow[]>`
      SELECT
        DATE_TRUNC('day', p."paidAt") AS day,
        e."operatorId" AS "operatorId",
        e."source" AS source,
        COUNT(DISTINCT p.id) AS "ordersCount",
        SUM((pi."adultTickets" + pi."childTickets")) AS "ticketsSold",
        SUM(pi."subtotal") AS "grossRevenue",
        -- commission and net are derived from operator.commissionRate, fallback 0
        SUM(
          pi."subtotal"
          * COALESCE(o."commissionRate", 0)
        ) AS "commissionAmount",
        SUM(
          pi."subtotal"
          - pi."subtotal" * COALESCE(o."commissionRate", 0)
        ) AS "netAmount"
      FROM "packages" p
      JOIN "package_items" pi ON pi."packageId" = p.id
      JOIN "event_sessions" s ON s.id = pi."sessionId"
      JOIN "events" e ON e.id = s."eventId"
      LEFT JOIN "operators" o ON o.id = e."operatorId"
      WHERE p."status" = 'PAID'
        AND p."paidAt" >= ${from}
        AND p."paidAt" < ${to}
        AND (${cityId} IS NULL OR e."cityId" = ${cityId}::uuid)
        AND (${operatorId} IS NULL OR e."operatorId" = ${operatorId}::uuid)
        AND (${source} IS NULL OR e."source" = ${source}::"EventSource")
        AND (${category} IS NULL OR e."category" = ${category}::"EventCategory")
      GROUP BY 1, 2, 3
      ORDER BY 1 DESC
    `;

    return rows;
  }

  async getSalesByEvent(query: {
    from: Date;
    to: Date;
    cityId?: string;
    operatorId?: string;
    source?: EventSource;
    category?: EventCategory;
  }): Promise<SalesByEventRow[]> {
    const { from, to, cityId, operatorId, source, category } = query;

    const rows = await this.prisma.$queryRaw<SalesByEventRow[]>`
      SELECT
        e.id AS "eventId",
        e.title AS title,
        e."cityId" AS "cityId",
        e."operatorId" AS "operatorId",
        e.source AS source,
        SUM((pi."adultTickets" + pi."childTickets")) AS "ticketsSold",
        SUM(pi."subtotal") AS revenue,
        CASE
          WHEN SUM((pi."adultTickets" + pi."childTickets")) > 0 THEN
            SUM(pi."subtotal")::float / SUM((pi."adultTickets" + pi."childTickets"))::float
          ELSE 0
        END AS "avgTicketPrice",
        MAX(p."paidAt") AS "lastSaleAt"
      FROM "packages" p
      JOIN "package_items" pi ON pi."packageId" = p.id
      JOIN "event_sessions" s ON s.id = pi."sessionId"
      JOIN "events" e ON e.id = s."eventId"
      WHERE p."status" = 'PAID'
        AND p."paidAt" >= ${from}
        AND p."paidAt" < ${to}
        AND (${cityId} IS NULL OR e."cityId" = ${cityId}::uuid)
        AND (${operatorId} IS NULL OR e."operatorId" = ${operatorId}::uuid)
        AND (${source} IS NULL OR e."source" = ${source}::"EventSource")
        AND (${category} IS NULL OR e."category" = ${category}::"EventCategory")
      GROUP BY e.id
      ORDER BY revenue DESC
    `;

    return rows;
  }

  async getSessionOccupancy(query: {
    from: Date;
    to: Date;
    operatorId?: string;
    cityId?: string;
    category?: EventCategory;
  }): Promise<SessionOccupancyRow[]> {
    const { from, to, operatorId, cityId, category } = query;

    const rows = await this.prisma.$queryRaw<SessionOccupancyRow[]>`
      SELECT
        s.id AS "sessionId",
        s."startsAt" AS "startsAt",
        e.title AS title,
        e."operatorId" AS "operatorId",
        s."capacityTotal" AS "capacityTotal",
        COALESCE(SUM(
          CASE
            WHEN p."status" = 'PAID' THEN (pi."adultTickets" + pi."childTickets")
            ELSE 0
          END
        ), 0) AS "soldQty",
        COALESCE(s."capacityTotal", 0)
          - COALESCE(SUM(
            CASE
              WHEN p."status" = 'PAID' THEN (pi."adultTickets" + pi."childTickets")
              ELSE 0
            END
          ), 0) AS "availableQty",
        CASE
          WHEN s."capacityTotal" IS NOT NULL AND s."capacityTotal" > 0 THEN
            ROUND(
              100.0 * COALESCE(SUM(
                CASE
                  WHEN p."status" = 'PAID' THEN (pi."adultTickets" + pi."childTickets")
                  ELSE 0
                END
              ), 0) / s."capacityTotal",
              2
            )
          ELSE 0
        END AS "occupancyPct"
      FROM "event_sessions" s
      JOIN "events" e ON e.id = s."eventId"
      LEFT JOIN "package_items" pi ON pi."sessionId" = s.id
      LEFT JOIN "packages" p ON p.id = pi."packageId"
      WHERE s."startsAt" >= ${from}
        AND s."startsAt" < ${to}
        AND (${operatorId} IS NULL OR e."operatorId" = ${operatorId}::uuid)
        AND (${cityId} IS NULL OR e."cityId" = ${cityId}::uuid)
        AND (${category} IS NULL OR e."category" = ${category}::"EventCategory")
      GROUP BY s.id, e.title, e."operatorId", s."capacityTotal"
      ORDER BY s."startsAt" ASC
    `;

    return rows;
  }
}

