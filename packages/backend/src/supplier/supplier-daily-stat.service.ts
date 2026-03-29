import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

export interface SupplierSalesTotals {
  totalOrders: number;
  grossRevenue: number;
  platformFee: number;
  netRevenue: number;
}

/** Одна строка для графика: день + агрегаты (копейки). */
export interface SupplierDailyStatRow {
  date: string;
  ordersCount: number;
  grossRevenue: number;
  platformFee: number;
  netRevenue: number;
}

/**
 * Витрина Phase 5: предрасчитанная дневная статистика по поставщику.
 * Источник истины — PaymentIntent (status PAID, paidAt). Заполняется кроном в 00:05 за вчера.
 */
@Injectable()
export class SupplierDailyStatService {
  private readonly logger = new Logger(SupplierDailyStatService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Суммарные продажи по оператору из витрины (все дни).
   * Возвращает null, если в витрине нет ни одной строки — тогда дашборд может использовать fallback на PaymentIntent.
   */
  async getTotalsForOperator(operatorId: string): Promise<SupplierSalesTotals | null> {
    try {
      const result = await this.prisma.$queryRaw<
        { total_orders: bigint; gross_revenue: number; platform_fee: number; net_revenue: number }[]
      >`
        SELECT
          COALESCE(SUM("ordersCount"), 0)::bigint AS total_orders,
          COALESCE(SUM("grossAmountCents"), 0)::int AS gross_revenue,
          COALESCE(SUM("platformFeeCents"), 0)::int AS platform_fee,
          COALESCE(SUM("supplierAmountCents"), 0)::int AS net_revenue
        FROM supplier_daily_stats
        WHERE "operatorId" = ${operatorId}::uuid
      `;

      const row = result[0];
      if (!row) return null;

      const totalOrders = Number(row.total_orders ?? 0);
      const grossRevenue = Number(row.gross_revenue ?? 0);
      const platformFee = Number(row.platform_fee ?? 0);
      const netRevenue = Number(row.net_revenue ?? 0);

      if (totalOrders === 0 && grossRevenue === 0 && platformFee === 0 && netRevenue === 0) {
        return null;
      }

      return {
        totalOrders,
        grossRevenue,
        platformFee,
        netRevenue,
      };
    } catch (e) {
      this.logger.warn(
        `supplier_daily_stats totals unavailable (${e instanceof Error ? e.message : String(e)}); using PaymentIntent fallback`,
      );
      return null;
    }
  }

  /**
   * Агрегировать данные из PaymentIntent за указанный день (UTC) и записать в витрину.
   * Границы суток заданы явно в UTC (dayStart 00:00:00 — dayEnd 00:00:00 следующего дня), чтобы данные не «плыли» из-за пояса.
   * Идемпотентно: повторный вызов перезаписывает строки за этот день.
   */
  async aggregateForDate(date: Date): Promise<{ upserted: number }> {
    const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    type Row = { supplier_id: string; orders_count: bigint; gross: number; fee: number; net: number };
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT
        "supplierId" AS supplier_id,
        COUNT(*)::bigint AS orders_count,
        COALESCE(SUM("grossAmount"), 0)::int AS gross,
        COALESCE(SUM("platformFee"), 0)::int AS fee,
        COALESCE(SUM("supplierAmount"), 0)::int AS net
      FROM payment_intents
      WHERE status = 'PAID'
        AND "supplierId" IS NOT NULL
        AND "paidAt" >= ${dayStart}
        AND "paidAt" < ${dayEnd}
      GROUP BY "supplierId"
    `;

    let upserted = 0;
    for (const r of rows) {
      const operatorId = r.supplier_id;
      await this.prisma.supplierDailyStat.upsert({
        where: {
          operatorId_date: {
            operatorId,
            date: dayStart,
          },
        },
        create: {
          operatorId,
          date: dayStart,
          ordersCount: Number(r.orders_count),
          grossAmountCents: r.gross,
          platformFeeCents: r.fee,
          supplierAmountCents: r.net,
        },
        update: {
          ordersCount: Number(r.orders_count),
          grossAmountCents: r.gross,
          platformFeeCents: r.fee,
          supplierAmountCents: r.net,
          updatedAt: new Date(),
        },
      });
      upserted++;
    }

    return { upserted };
  }

  /**
   * Инкрементальное обновление строки «сегодня» при переходе платежа в PAID (real-time дашборд).
   * Атомарный upsert: если строки нет — создаём с заданными значениями, иначе увеличиваем счётчики.
   */
  async incrementToday(
    operatorId: string,
    delta: {
      ordersCount: number;
      grossAmountCents: number;
      platformFeeCents: number;
      supplierAmountCents: number;
    },
  ): Promise<void> {
    const today = new Date();
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0));

    await this.prisma.$executeRaw`
      INSERT INTO supplier_daily_stats (
        id, "operatorId", date,
        "ordersCount", "grossAmountCents", "platformFeeCents", "supplierAmountCents",
        "viewsCount", "conversionRate", "createdAt", "updatedAt"
      )
      VALUES (
        gen_random_uuid(), ${operatorId}::uuid, ${date}::date,
        ${delta.ordersCount}, ${delta.grossAmountCents}, ${delta.platformFeeCents}, ${delta.supplierAmountCents},
        0, 0, now(), now()
      )
      ON CONFLICT ("operatorId", date)
      DO UPDATE SET
        "ordersCount" = supplier_daily_stats."ordersCount" + ${delta.ordersCount},
        "grossAmountCents" = supplier_daily_stats."grossAmountCents" + ${delta.grossAmountCents},
        "platformFeeCents" = supplier_daily_stats."platformFeeCents" + ${delta.platformFeeCents},
        "supplierAmountCents" = supplier_daily_stats."supplierAmountCents" + ${delta.supplierAmountCents},
        "updatedAt" = now()
    `;
  }

  /**
   * Серия по дням для графиков (Chart.js и т.п.): последние N дней или диапазон from/to.
   * Данные только из витрины; пустые дни не возвращаются (или можно дополнить нулями на фронте).
   */
  async getDailySeries(
    operatorId: string,
    from: Date,
    to: Date,
  ): Promise<SupplierDailyStatRow[]> {
    const rows = await this.prisma.supplierDailyStat.findMany({
      where: {
        operatorId,
        date: { gte: from, lte: to },
      },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        ordersCount: true,
        grossAmountCents: true,
        platformFeeCents: true,
        supplierAmountCents: true,
      },
    });
    return rows.map((r) => ({
      date: r.date.toISOString().slice(0, 10),
      ordersCount: r.ordersCount,
      grossRevenue: r.grossAmountCents,
      platformFee: r.platformFeeCents,
      netRevenue: r.supplierAmountCents,
    }));
  }

  /**
   * Backfill витрины за диапазон дней (для первого запуска или пересчёта).
   * Передайте from/to в UTC; итерация по каждому календарному дню (батч = 1 день), чтобы не блокировать payment_intents одним большим GROUP BY.
   * На продакшене при истории 1–2 года можно вызывать с паузами между днями или чанками по 30 дней.
   */
  async backfillDateRange(from: Date, to: Date): Promise<{ daysProcessed: number; totalUpserted: number }> {
    let daysProcessed = 0;
    let totalUpserted = 0;
    const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), 0, 0, 0, 0));
    const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate(), 0, 0, 0, 0));
    while (cursor.getTime() <= end.getTime()) {
      const { upserted } = await this.aggregateForDate(cursor);
      daysProcessed++;
      totalUpserted += upserted;
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return { daysProcessed, totalUpserted };
  }
}
