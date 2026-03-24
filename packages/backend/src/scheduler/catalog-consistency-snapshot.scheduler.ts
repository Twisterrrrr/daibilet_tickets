import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { CatalogGuardService } from '../catalog/catalog-guard.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Ежедневный снимок sellability в catalog_consistency_snapshots.
 */
@Injectable()
export class CatalogConsistencySnapshotSchedulerService {
  private readonly logger = new Logger(CatalogConsistencySnapshotSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalogGuard: CatalogGuardService,
  ) {}

  @Cron('0 30 5 * * *', { name: 'catalog-consistency-snapshot' })
  async takeDailySnapshot(): Promise<void> {
    try {
      const report = await this.catalogGuard.getSellabilityReport();
      const snapshotDate = new Date();
      snapshotDate.setUTCHours(0, 0, 0, 0);
      const issuesJson = {
        breakdown: report.breakdown,
        total: report.total,
        sellable: report.sellable,
      };
      await this.prisma.catalogConsistencySnapshot.upsert({
        where: { snapshotDate },
        create: {
          snapshotDate,
          sellablePercent: report.sellablePercent,
          issuesJson,
        },
        update: {
          sellablePercent: report.sellablePercent,
          issuesJson,
        },
      });
      this.logger.log({
        msg: 'catalog.snapshot.saved',
        snapshotDate: snapshotDate.toISOString().slice(0, 10),
        sellablePercent: report.sellablePercent,
      });
    } catch (e) {
      this.logger.warn(`catalog.snapshot.failed ${(e as Error).message}`);
    }
  }
}
