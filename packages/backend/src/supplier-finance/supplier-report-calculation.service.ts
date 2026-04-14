import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, SupplierReportBasis, SupplierReportLineType } from '@/prisma-client';
import { PrismaService } from '../prisma/prisma.service';

type Basis = SupplierReportBasis;

@Injectable()
export class SupplierReportCalculationService {
  constructor(private readonly prisma: PrismaService) {}

  async generateReport(params: {
    operatorId: string;
    periodStart: Date;
    periodEnd: Date;
    basis: Basis;
  }) {
    const { operatorId, periodStart, periodEnd, basis } = params;

    if (periodEnd <= periodStart) {
      throw new BadRequestException('periodEnd must be after periodStart');
    }

    const existing = await this.prisma.supplierReport.findUnique({
      where: {
        operatorId_periodStart_periodEnd_basis: {
          operatorId,
          periodStart,
          periodEnd,
          basis,
        },
      },
      include: { lines: true },
    });
    if (existing) {
      return existing;
    }

    const ledgerEntries = await this.prisma.supplierLedgerEntry.findMany({
      where: {
        operatorId,
        createdAt: { gte: periodStart, lt: periodEnd },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (ledgerEntries.length === 0) {
      throw new BadRequestException('No ledger entries for this period');
    }

    let grossAmount = new Prisma.Decimal(0);
    let commissionAmount = new Prisma.Decimal(0);
    let refundAmount = new Prisma.Decimal(0);
    let netAmount = new Prisma.Decimal(0);

    const linesData: Prisma.SupplierReportLineCreateManyInput[] = [];

    for (const entry of ledgerEntries) {
      const amount = entry.amount;
      let lineType: SupplierReportLineType = 'SALE';
      let lineNet = amount;

      switch (entry.type) {
        case 'SALE':
          lineType = 'SALE';
          grossAmount = grossAmount.plus(amount);
          break;
        case 'COMMISSION':
          lineType = 'COMMISSION';
          commissionAmount = commissionAmount.plus(amount);
          lineNet = amount.negated();
          break;
        case 'REFUND':
          lineType = 'REFUND';
          refundAmount = refundAmount.plus(amount.abs());
          lineNet = amount.negated();
          break;
        case 'PAYOUT':
          lineType = 'PAYOUT';
          lineNet = amount.negated();
          break;
        case 'ADJUSTMENT':
          lineType = 'ADJUSTMENT';
          break;
        case 'CHARGEBACK_ADJUSTMENT':
          lineType = 'CHARGEBACK_ADJUSTMENT' as SupplierReportLineType;
          // отрицательная корректировка в пользу платформы
          lineNet = amount;
          break;
        case 'FEE_RECHARGE':
          lineType = 'FEE_RECHARGE' as SupplierReportLineType;
          lineNet = amount;
          break;
        default:
          lineType = 'ADJUSTMENT';
      }

      netAmount = netAmount.plus(lineNet);

      linesData.push({
        supplierReportId: 'TO_BE_REPLACED',
        type: lineType,
        ledgerEntryId: null,
        referenceType: entry.referenceType ?? null,
        referenceId: entry.referenceId ?? null,
        amount,
        netAmount: lineNet,
        metaJson: entry.note ? { note: entry.note } : Prisma.JsonNull,
        createdAt: entry.createdAt,
      });
    }

    const operator = await this.prisma.operator.findUniqueOrThrow({
      where: { id: operatorId },
    });

    const legalProfile = await this.prisma.supplierLegalProfile.findUnique({
      where: { operatorId },
    });

    const legalSnapshotObj =
      legalProfile &&
      {
        legalName: legalProfile.legalName,
        inn: legalProfile.inn,
        kpp: legalProfile.kpp,
        ogrn: legalProfile.ogrn,
        legalAddress: legalProfile.legalAddress,
        taxMode: legalProfile.taxMode,
        isVatPayer: legalProfile.isVatPayer,
        defaultVatRate: legalProfile.defaultVatRate,
        signerFullName: legalProfile.signerFullName,
        signerPosition: legalProfile.signerPosition,
      };

    const vatDetails =
      legalSnapshotObj && legalSnapshotObj.isVatPayer && legalSnapshotObj.defaultVatRate
        ? (() => {
            const rate = Number(legalSnapshotObj.defaultVatRate);
            // netAmount трактуем как сумма с НДС (amountWithVat) для плательщиков НДС.
            const amountWithVat = netAmount;
            const base = amountWithVat.mul(100).div(100 + rate);
            const vat = amountWithVat.minus(base);
            return {
              amountWithVat,
              amountWithoutVat: base,
              vatAmount: vat,
              vatRate: rate,
            };
          })()
        : null;

    const snapshot = {
      operator: {
        id: operator.id,
        name: operator.name,
        inn: operator.inn,
        commissionRate: operator.commissionRate,
      },
      legalProfile: legalSnapshotObj,
      vatDetails,
      period: {
        start: periodStart.toISOString(),
        end: periodEnd.toISOString(),
        basis,
      },
    };

    return this.prisma.$transaction(async (tx) => {
      const report = await tx.supplierReport.create({
        data: {
          operatorId,
          periodStart,
          periodEnd,
          basis,
          status: 'DRAFT',
          grossAmount,
          commissionAmount,
          refundAmount,
          netAmount,
          snapshotJson: snapshot,
          legalProfileSnapshot: (legalSnapshotObj ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        },
      });

      await tx.supplierReportLine.createMany({
        data: linesData.map((l) => ({
          ...l,
          supplierReportId: report.id,
        })),
      });

      return tx.supplierReport.findUnique({
        where: { id: report.id },
        include: { lines: true },
      });
    });
  }
}

