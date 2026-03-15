import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { SupplierLedgerService } from '../ledger/supplier-ledger.service';

@Injectable()
export class SupplierFinanceSummaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: SupplierLedgerService,
  ) {}

  async getSummary(operatorId: string) {
    const balance = await this.ledgerService.getBalance(operatorId);

    const pendingPayouts = await this.prisma.supplierPayoutRequest.aggregate({
      where: {
        operatorId,
        status: { in: ['NEW', 'APPROVED'] },
      },
      _sum: { amount: true },
    });

    const lastReports = await this.prisma.supplierReport.findMany({
      where: { operatorId },
      orderBy: { periodEnd: 'desc' },
      take: 3,
      include: {
        documents: {
          select: { id: true, type: true, status: true },
        },
      },
    });

    return {
      currentBalance: balance,
      pendingPayoutsAmount: pendingPayouts._sum.amount ?? 0,
      lastReports: lastReports.map((r) => ({
        id: r.id,
        period: `${r.periodStart.toISOString()} - ${r.periodEnd.toISOString()}`,
        netAmount: r.netAmount,
        status: r.status,
        hasConflict: r.hasConflict,
        documents: r.documents,
      })),
    };
  }
}

