import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@/prisma-client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SupplierSettlementService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateDraftSettlement(operatorId: string, periodStart: Date, periodEnd: Date) {
    if (periodEnd <= periodStart) {
      throw new BadRequestException('periodEnd must be greater than periodStart');
    }
    const ledger = await this.prisma.supplierLedgerEntry.findMany({
      where: { operatorId, createdAt: { gte: periodStart, lt: periodEnd } },
    });
    if (ledger.length === 0) {
      throw new BadRequestException('No ledger entries for settlement period');
    }
    let grossAmount = new Prisma.Decimal(0);
    let commissionAmount = new Prisma.Decimal(0);
    let adjustmentAmount = new Prisma.Decimal(0);
    let netAmount = new Prisma.Decimal(0);

    for (const entry of ledger) {
      if (entry.type === 'SALE') grossAmount = grossAmount.plus(entry.amount);
      if (entry.type === 'COMMISSION') commissionAmount = commissionAmount.plus(entry.amount);
      if (entry.type === 'ADJUSTMENT') adjustmentAmount = adjustmentAmount.plus(entry.amount);

      if (entry.type === 'SALE') netAmount = netAmount.plus(entry.amount);
      if (entry.type === 'COMMISSION' || entry.type === 'PAYOUT' || entry.type === 'REFUND') {
        netAmount = netAmount.minus(entry.amount.abs());
      }
      if (entry.type === 'ADJUSTMENT') netAmount = netAmount.plus(entry.amount);
    }

    return this.prisma.supplierSettlement.create({
      data: {
        operatorId,
        periodStart,
        periodEnd,
        grossAmount,
        commissionAmount,
        adjustmentAmount,
        netAmount,
        status: 'CALCULATED',
      },
    });
  }

  async approveSettlement(settlementId: string) {
    const settlement = await this.assertExists(settlementId);
    this.assertTransition(settlement.status, 'APPROVED');
    return this.prisma.supplierSettlement.update({
      where: { id: settlementId },
      data: { status: 'APPROVED', approvedAt: new Date() },
    });
  }

  async finalizeSettlement(settlementId: string) {
    const settlement = await this.assertExists(settlementId);
    this.assertTransition(settlement.status, 'FINALIZED');
    return this.prisma.supplierSettlement.update({
      where: { id: settlementId },
      data: { status: 'FINALIZED', finalizedAt: new Date() },
    });
  }

  async markSettlementPaid(settlementId: string, payoutId?: string) {
    const settlement = await this.assertExists(settlementId);
    this.assertTransition(settlement.status, 'PAID');
    return this.prisma.supplierSettlement.update({
      where: { id: settlementId },
      data: { status: 'PAID', paidAt: new Date(), payoutId: payoutId ?? null },
    });
  }

  private async assertExists(settlementId: string) {
    const settlement = await this.prisma.supplierSettlement.findUnique({ where: { id: settlementId } });
    if (!settlement) throw new NotFoundException('Settlement not found');
    return settlement;
  }

  private assertTransition(current: string, next: 'APPROVED' | 'FINALIZED' | 'PAID') {
    const allowed: Record<string, string[]> = {
      DRAFT: ['CALCULATED', 'CANCELED'],
      CALCULATED: ['APPROVED', 'CANCELED'],
      APPROVED: ['FINALIZED', 'CANCELED'],
      FINALIZED: ['PAID', 'CANCELED'],
      PAID: [],
      CANCELED: [],
    };
    if (!(allowed[current] ?? []).includes(next)) {
      throw new BadRequestException(`Invalid settlement status transition: ${current} -> ${next}`);
    }
  }
}

