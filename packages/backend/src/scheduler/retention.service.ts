/**
 * E1 — Retention jobs (cleanup).
 *
 * Удаление устаревших записей:
 * - EventSession: startsAt < now - N дней (прошедшие сеансы)
 * - ProcessedWebhookEvent: processedAt < now - N дней
 * - AuditLog: createdAt < now - N дней
 *
 * Env: RETENTION_EVENTSESSIONS_DAYS, RETENTION_WEBHOOK_DAYS, RETENTION_AUDIT_DAYS
 * Dry-run: RETENTION_DRY_RUN=true — только отчёт, без удаления
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

const BATCH_SIZE = 500;
const DEFAULT_EVENTSESSIONS_DAYS = 180;
const DEFAULT_WEBHOOK_DAYS = 90;
const DEFAULT_AUDIT_DAYS = 365;

function parseDays(envKey: string, fallback: number): number {
  const raw = process.env[envKey];
  if (raw == null || raw === '') return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export interface RetentionReport {
  eventSessions: { wouldDelete: number; deleted: number };
  webhooks: { wouldDelete: number; deleted: number };
  auditLogs: { wouldDelete: number; deleted: number };
  dryRun: boolean;
}

@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private get dryRun(): boolean {
    return this.config.get('RETENTION_DRY_RUN', 'false') === 'true';
  }

  private get eventSessionsDays(): number {
    return parseDays('RETENTION_EVENTSESSIONS_DAYS', DEFAULT_EVENTSESSIONS_DAYS);
  }

  private get webhookDays(): number {
    return parseDays('RETENTION_WEBHOOK_DAYS', DEFAULT_WEBHOOK_DAYS);
  }

  private get auditDays(): number {
    return parseDays('RETENTION_AUDIT_DAYS', DEFAULT_AUDIT_DAYS);
  }

  /**
   * Прогнать retention cleanup.
   */
  async run(): Promise<RetentionReport> {
    const dryRun = this.dryRun;
    const report: RetentionReport = {
      eventSessions: { wouldDelete: 0, deleted: 0 },
      webhooks: { wouldDelete: 0, deleted: 0 },
      auditLogs: { wouldDelete: 0, deleted: 0 },
      dryRun,
    };

    this.logger.log(`Retention run (dryRun=${dryRun})`);

    // EventSession: старые сеансы
    const sessCutoff = new Date();
    sessCutoff.setDate(sessCutoff.getDate() - this.eventSessionsDays);
    const sessCount = await this.prisma.eventSession.count({
      where: { startsAt: { lt: sessCutoff } },
    });
    report.eventSessions.wouldDelete = sessCount;

    if (!dryRun && sessCount > 0) {
      let deleted = 0;
      while (true) {
        const batch = await this.prisma.eventSession.findMany({
          where: { startsAt: { lt: sessCutoff } },
          take: BATCH_SIZE,
          select: { id: true },
        });
        if (batch.length === 0) break;
        await this.prisma.eventSession.deleteMany({
          where: { id: { in: batch.map((b) => b.id) } },
        });
        deleted += batch.length;
      }
      report.eventSessions.deleted = deleted;
      this.logger.log(`EventSession: deleted ${deleted} old sessions`);
    } else if (dryRun && sessCount > 0) {
      this.logger.log(`EventSession: would delete ${sessCount} (dry-run)`);
    }

    // ProcessedWebhookEvent
    const whCutoff = new Date();
    whCutoff.setDate(whCutoff.getDate() - this.webhookDays);
    const whCount = await this.prisma.processedWebhookEvent.count({
      where: { processedAt: { lt: whCutoff } },
    });
    report.webhooks.wouldDelete = whCount;

    if (!dryRun && whCount > 0) {
      let deleted = 0;
      while (true) {
        const batch = await this.prisma.processedWebhookEvent.findMany({
          where: { processedAt: { lt: whCutoff } },
          take: BATCH_SIZE,
          select: { id: true },
        });
        if (batch.length === 0) break;
        await this.prisma.processedWebhookEvent.deleteMany({
          where: { id: { in: batch.map((b) => b.id) } },
        });
        deleted += batch.length;
      }
      report.webhooks.deleted = deleted;
      this.logger.log(`ProcessedWebhookEvent: deleted ${deleted}`);
    } else if (dryRun && whCount > 0) {
      this.logger.log(`ProcessedWebhookEvent: would delete ${whCount} (dry-run)`);
    }

    // AuditLog
    const auditCutoff = new Date();
    auditCutoff.setDate(auditCutoff.getDate() - this.auditDays);
    const auditCount = await this.prisma.auditLog.count({
      where: { createdAt: { lt: auditCutoff } },
    });
    report.auditLogs.wouldDelete = auditCount;

    if (!dryRun && auditCount > 0) {
      let deleted = 0;
      while (true) {
        const batch = await this.prisma.auditLog.findMany({
          where: { createdAt: { lt: auditCutoff } },
          take: BATCH_SIZE,
          select: { id: true },
        });
        if (batch.length === 0) break;
        await this.prisma.auditLog.deleteMany({
          where: { id: { in: batch.map((b) => b.id) } },
        });
        deleted += batch.length;
      }
      report.auditLogs.deleted = deleted;
      this.logger.log(`AuditLog: deleted ${deleted}`);
    } else if (dryRun && auditCount > 0) {
      this.logger.log(`AuditLog: would delete ${auditCount} (dry-run)`);
    }

    return report;
  }
}
