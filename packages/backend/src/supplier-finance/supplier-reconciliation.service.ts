import { Injectable } from '@nestjs/common';
import { Prisma } from '@/prisma-client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SupplierReconciliationService {
  constructor(private readonly prisma: PrismaService) {}

  async reconcileReport(reportId: string) {
    const report = await this.prisma.supplierReport.findUnique({
      where: { id: reportId },
      include: { lines: true },
    });

    if (!report) return null;

    const ledgerSum = await this.prisma.supplierLedgerEntry.aggregate({
      where: {
        operatorId: report.operatorId,
        createdAt: {
          gte: report.periodStart,
          lt: report.periodEnd,
        },
      },
      _sum: { amount: true },
    });

    const sumLedger = ledgerSum._sum.amount ?? report.netAmount;

    const sumLines = report.lines.reduce(
      (acc, l) => acc.plus(l.netAmount),
      new Prisma.Decimal(0),
    );

    const expectedNet = report.netAmount;
    const ok = expectedNet.equals(sumLedger) && expectedNet.equals(sumLines);

    await this.prisma.supplierReport.update({
      where: { id: report.id },
      data: {
        hasConflict: !ok,
        metaJson: {
          ...(report.metaJson as Prisma.JsonObject | null),
          reconciliation: {
            expectedNet: expectedNet.toString(),
            sumLedger: sumLedger.toString(),
            sumLines: sumLines.toString(),
            ok,
          },
        },
      },
    });

    return { ok, expectedNet, sumLedger, sumLines };
  }
}

