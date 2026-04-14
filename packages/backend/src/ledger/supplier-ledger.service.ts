import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@/prisma-client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SupplierLedgerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private isEnabled(): boolean {
    const flag = this.config.get<string>('SUPPLIER_LEDGER_ENABLED');
    return flag === 'true' || flag === '1';
  }

  /** Единственный источник баланса: сумма amount по книге проводок. */
  async getBalance(operatorId: string): Promise<number> {
    if (!this.isEnabled()) return 0;
    const agg = await this.prisma.supplierLedgerEntry.aggregate({
      where: { operatorId },
      _sum: { amount: true },
    });
    return Number(agg._sum.amount ?? 0);
  }

  async recordSale(operatorId: string, amount: number, referenceType?: string, referenceId?: string, note?: string) {
    if (!this.isEnabled()) return;
    await this.prisma.supplierLedgerEntry.create({
      data: {
        operatorId,
        type: 'SALE',
        amount,
        referenceType: referenceType ?? null,
        referenceId: referenceId ?? null,
        note: note ?? null,
      },
    });
  }

  async recordCommission(operatorId: string, amount: number, referenceType?: string, referenceId?: string, note?: string) {
    if (!this.isEnabled()) return;
    await this.prisma.supplierLedgerEntry.create({
      data: {
        operatorId,
        type: 'COMMISSION',
        amount,
        referenceType: referenceType ?? null,
        referenceId: referenceId ?? null,
        note: note ?? null,
      },
    });
  }

  async recordPayout(operatorId: string, amount: number, referenceType?: string, referenceId?: string, note?: string) {
    if (!this.isEnabled()) return;
    await this.prisma.supplierLedgerEntry.create({
      data: {
        operatorId,
        type: 'PAYOUT',
        amount,
        referenceType: referenceType ?? null,
        referenceId: referenceId ?? null,
        note: note ?? null,
      },
    });
  }

  /** Записать проводку PAYOUT внутри транзакции (для атомарности при admin PAID). */
  async recordPayoutWithTx(
    tx: Prisma.TransactionClient,
    operatorId: string,
    amount: number,
    referenceType?: string,
    referenceId?: string,
    note?: string,
  ) {
    if (!this.isEnabled()) return;
    await tx.supplierLedgerEntry.create({
      data: {
        operatorId,
        type: 'PAYOUT',
        amount,
        referenceType: referenceType ?? null,
        referenceId: referenceId ?? null,
        note: note ?? null,
      },
    });
  }
}

