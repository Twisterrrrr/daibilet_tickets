import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { PrismaService } from '../prisma/prisma.service';
import { SupplierTrustService } from './supplier-trust.service';

@Injectable()
export class SupplierTrustJob {
  private readonly logger = new Logger(SupplierTrustJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supplierTrust: SupplierTrustService,
  ) {}

  /**
   * Ежедневный пересчёт доверия поставщиков.
   * Запускается ночью, чтобы сгладить изменения и не перегружать базу.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async recalculateAllSuppliers() {
    this.logger.log('Starting daily supplier trust recalculation');

    const suppliers = await this.prisma.operator.findMany({
      where: { isSupplier: true },
      select: { id: true },
    });

    for (const s of suppliers) {
      try {
        await this.supplierTrust.recalculateSupplierTrust(s.id);
      } catch (err) {
        this.logger.error(`Failed to recalculate trust for supplier ${s.id}`, err instanceof Error ? err.stack : undefined);
      }
    }

    this.logger.log(`Supplier trust recalculation finished, processed=${suppliers.length}`);
  }
}

