/**
 * Precomputed stats по сессиям (C6): soldLast24h, totalPaid.
 * Обновляется по крону каждые 15 мин; используется в read API для POPULAR и «Купили за 24ч».
 */
import { Cron } from '@nestjs/schedule';
import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SessionStatsService {
  private readonly logger = new Logger(SessionStatsService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('*/15 * * * *', { name: 'recompute-session-stats' })
  async runRecompute() {
    try {
      const updated = await this.recompute();
      if (updated > 0) this.logger.log(`Session stats recomputed: ${updated} rows`);
    } catch (e) {
      this.logger.error('Session stats recompute failed: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  /**
   * Агрегирует totalPaid и soldLast24h по sessionId из PackageItem и FulfillmentItem, upsert в event_session_stats.
   */
  async recompute(): Promise<number> {
    const now = new Date();
    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sessionTotals = new Map<string, { totalPaid: number; soldLast24h: number }>();

    // 1) PackageItem (Trip Planner): Package.status = PAID
    const pkgRows = await this.prisma.packageItem.findMany({
      where: { package: { status: 'PAID' } },
      select: {
        sessionId: true,
        adultTickets: true,
        childTickets: true,
        package: { select: { paidAt: true } },
      },
    });
    for (const row of pkgRows) {
      const qty = (row.adultTickets ?? 0) + (row.childTickets ?? 0);
      const entry = sessionTotals.get(row.sessionId) ?? { totalPaid: 0, soldLast24h: 0 };
      entry.totalPaid += qty;
      if (row.package?.paidAt && row.package.paidAt >= since24h) entry.soldLast24h += qty;
      sessionTotals.set(row.sessionId, entry);
    }

    // 2) FulfillmentItem CONFIRMED (widget): sessionId и quantity из offersSnapshot
    const fulfilled = await this.prisma.fulfillmentItem.findMany({
      where: { status: 'CONFIRMED' },
      select: { lineItemIndex: true, checkoutSessionId: true },
    });
    if (fulfilled.length > 0) {
      const sessions = await this.prisma.checkoutSession.findMany({
        where: { id: { in: [...new Set(fulfilled.map((f) => f.checkoutSessionId))] } },
        select: { id: true, offersSnapshot: true, completedAt: true },
      });
      const bySession = new Map(sessions.map((s) => [s.id, s]));
      for (const item of fulfilled) {
        const cs = bySession.get(item.checkoutSessionId);
        const snapshot = cs?.offersSnapshot as Array<{ sessionId?: string | null; quantity?: number }> | null;
        if (!Array.isArray(snapshot)) continue;
        const line = snapshot[item.lineItemIndex];
        const sid = line?.sessionId ?? null;
        const qty = Math.max(0, Math.floor(Number(line?.quantity ?? 0)));
        if (!sid || qty <= 0) continue;
        const entry = sessionTotals.get(sid) ?? { totalPaid: 0, soldLast24h: 0 };
        entry.totalPaid += qty;
        if (cs?.completedAt && cs.completedAt >= since24h) entry.soldLast24h += qty;
        sessionTotals.set(sid, entry);
      }
    }

    if (sessionTotals.size === 0) return 0;

    let upserted = 0;
    for (const [sessionId, v] of sessionTotals) {
      await this.prisma.eventSessionStats.upsert({
        where: { sessionId },
        create: { sessionId, totalPaid: v.totalPaid, soldLast24h: v.soldLast24h },
        update: { totalPaid: v.totalPaid, soldLast24h: v.soldLast24h },
      });
      upserted++;
    }
    return upserted;
  }
}
