import { Injectable } from '@nestjs/common';
import { Prisma, TaxMode } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { commissionFromGross, vatFromGross } from './tax-calculations';
import { TAX_MATRIX } from './tax.config';
import { DocumentNumberService } from './document-number.service';

/** Snapshot юр. профиля из отчёта (legalProfileSnapshot / snapshotJson.legalProfile). */
type LegalProfileSnapshot = {
  taxMode?: TaxMode;
  isVatPayer?: boolean;
  defaultVatRate?: number | null;
  legalName?: string;
  inn?: string;
  kpp?: string | null;
  legalAddress?: string | null;
} | null | undefined;

/** P3.1-4: итоги и строки документа, рассчитанные по Tax Matrix (tax-calculations). */
export interface VatDocumentTotals {
  grossAmount: number;
  netAmount: number;
  vatAmount: number;
  commissionAmount: number;
  vatText: string;
  documentType: 'UPD_1' | 'ACT_NO_VAT' | 'AGENT_REPORT_ONLY';
}

/** Одна строка для УПД/отчёта с честными net/vat. */
export interface VatDocumentLine {
  description: string;
  quantity: number;
  unit: string;
  price: number;
  amount: number;
  vatRate: number | null;
  vatAmount: number;
  amountWithVat: number;
}

/**
 * P3.1-4: строит payload с netAmount, vatAmount, commission по протестированной матрице (tax-calculations).
 * Используется при генерации AGENT_REPORT / UPD; результат пишется в snapshotJson.
 */
export function buildVatDocumentPayload(params: {
  grossAmount: number;
  commissionRatePercent: number;
  legalProfile: LegalProfileSnapshot;
}): { totals: VatDocumentTotals; lines: VatDocumentLine[] } {
  const { grossAmount, commissionRatePercent, legalProfile } = params;
  const taxMode: TaxMode = legalProfile?.taxMode ?? 'OSNO';
  const behavior = TAX_MATRIX[taxMode];

  const { net, vat } =
    behavior.requiresVat && behavior.defaultVatRate != null
      ? vatFromGross(grossAmount, behavior.defaultVatRate)
      : { net: grossAmount, vat: 0 };

  const { commission } = commissionFromGross(grossAmount, commissionRatePercent, {
    vatRatePercent: behavior.defaultVatRate ?? 0,
    commissionAfterVat: behavior.requiresVat,
  });

  const totals: VatDocumentTotals = {
    grossAmount,
    netAmount: net,
    vatAmount: vat,
    commissionAmount: commission,
    vatText: behavior.requiresVat ? 'в т.ч. НДС' : 'Без НДС',
    documentType: behavior.mainDocumentType,
  };

  const lines: VatDocumentLine[] = [
    {
      description: 'Услуги по реализации билетов',
      quantity: 1,
      unit: 'усл.',
      price: net,
      amount: net,
      vatRate: behavior.defaultVatRate,
      vatAmount: vat,
      amountWithVat: grossAmount,
    },
  ];

  return { totals, lines };
}

@Injectable()
export class SupplierDocumentService {
  constructor(private readonly prisma: PrismaService) {}

  async generateDocumentsForReport(reportId: string) {
    const report = await this.prisma.supplierReport.findUnique({
      where: { id: reportId },
      include: { operator: true, lines: true },
    });
    if (!report) return null;

    const snapshot = (report.snapshotJson as Record<string, unknown> | null) ?? {};
    const legalProfile = (snapshot.legalProfile ?? report.legalProfileSnapshot) as LegalProfileSnapshot;
    const grossAmountNum = Number(report.grossAmount);
    const commissionRateNum = Number(report.operator.commissionRate ?? 0);

    const { totals: vatTotals, lines: vatLines } = buildVatDocumentPayload({
      grossAmount: grossAmountNum,
      commissionRatePercent: commissionRateNum,
      legalProfile,
    });

    const legSnap = (snapshot.legalProfile ?? report.legalProfileSnapshot) as Record<string, unknown> | null | undefined;
    const vatRate = legalProfile?.isVatPayer && legalProfile?.defaultVatRate != null ? Number(legalProfile.defaultVatRate) : 0;
    const primaryBank = await this.prisma.supplierBankAccount.findFirst({
      where: {
        legalProfile: { operatorId: report.operatorId },
        isPrimary: true,
      },
    });

    const supplierBlock = {
      name: (legSnap?.legalName as string) ?? report.operator.name ?? '',
      inn: (legSnap?.inn as string) ?? report.operator.inn ?? null,
      kpp: (legSnap?.kpp as string) ?? null,
      address: (legSnap?.legalAddress as string) ?? null,
      bankAccount: primaryBank
        ? {
            bankName: primaryBank.bankName ?? null,
            bik: primaryBank.bik ?? null,
            account: primaryBank.accountNumber ?? null,
            corrAccount: primaryBank.correspondentAccount ?? null,
          }
        : null,
    };

    const taxBlock = {
      taxMode: legalProfile?.taxMode ?? 'OSNO',
      isVatPayer: legalProfile?.isVatPayer ?? false,
      vatRate,
    };

    const customerBlock: { type: string; name?: string; inn?: string } = {
      type: 'LEGAL',
      name: 'Daibilet',
    };
    if (legalProfile?.taxMode === 'NPD') {
      customerBlock.type = 'NPD';
    }

    const itemsBlock = vatLines.map((line) => ({
      title: line.description,
      quantity: line.quantity,
      price: line.price,
      vatRate: line.vatRate ?? 0,
      vatAmount: line.vatAmount,
    }));

    const payload = {
      supplier: (snapshot.operator as Record<string, unknown>) ?? {
        id: report.operatorId,
        name: report.operator.name,
        inn: report.operator.inn,
        commissionRate: report.operator.commissionRate,
      },
      legalProfile: legSnap ?? null,
      period: {
        start: report.periodStart.toISOString(),
        end: report.periodEnd.toISOString(),
      },
      totals: {
        grossAmount: vatTotals.grossAmount,
        commissionAmount: vatTotals.commissionAmount,
        refundAmount: Number(report.refundAmount),
        netAmount: vatTotals.netAmount,
        vatAmount: vatTotals.vatAmount,
        vatText: vatTotals.vatText,
      },
      lines: report.lines.map((l) => ({
        type: l.type,
        referenceType: l.referenceType,
        referenceId: l.referenceId,
        amount: l.amount,
        netAmount: l.netAmount,
      })),
      vatDocument: {
        documentType: vatTotals.documentType,
        lines: vatLines,
        totals: vatTotals,
      },
      invoicePayload: {
        supplier: supplierBlock,
        tax: taxBlock,
        customer: customerBlock,
        items: itemsBlock,
      },
      customer: customerBlock,
      npd: (legalProfile && TAX_MATRIX[legalProfile.taxMode ?? 'OSNO']?.needsNpdReceiptLink)
        ? ({ receiptUrl: null, receiptNumber: null } as { receiptUrl: string | null; receiptNumber: string | null })
        : null,
    };

    const now = new Date();
    const year = now.getFullYear();
    const docNumberService = new DocumentNumberService(this.prisma);
    const documentNumber = await docNumberService.nextNumber({
      operatorId: report.operatorId,
      year,
      type: 'AGENT_REPORT',
    });

    const html = `<html><body>
<h1>Отчёт агента</h1>
<p>Поставщик: ${(payload.supplier as { name?: string }).name}</p>
<p>Период: ${payload.period.start} — ${payload.period.end}</p>
<p>Итого к выплате: ${vatTotals.netAmount}</p>
<p>${vatTotals.vatText}${vatTotals.vatAmount > 0 ? ` НДС: ${vatTotals.vatAmount}` : ''}</p>
</body></html>`;

    const basePath = `supplier-reports/${report.id}`;

    const template = await this.prisma.supplierDocumentTemplate.findFirst({
      where: {
        type: 'AGENT_REPORT',
        isActive: true,
      },
      include: {
        versions: {
          where: { id: { not: undefined } },
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    const currentVersion = template?.versions[0];

    const document = await this.prisma.supplierDocument.create({
      data: {
        operatorId: report.operatorId,
        reportId: report.id,
        type: 'AGENT_REPORT',
        status: 'GENERATED',
        title: `Отчёт агента ${documentNumber} за период ${payload.period.start} — ${payload.period.end}`,
        payloadJson: {
          ...payload,
          document: {
            number: documentNumber,
            date: now.toISOString(),
            type: 'AGENT_REPORT',
          },
        } as unknown as Prisma.InputJsonValue,
        templateId: template?.id,
        templateVersionId: currentVersion?.id,
        files: {
          create: [
            {
              kind: 'JSON_SNAPSHOT',
              storageKey: `${basePath}/snapshot.json`,
              fileName: 'snapshot.json',
              mimeType: 'application/json',
            },
            {
              kind: 'PDF',
              storageKey: `${basePath}/agent-report.html`,
              fileName: 'agent-report.html',
              mimeType: 'text/html',
              sizeBytes: html.length,
            },
          ],
        },
      },
      include: { files: true },
    });

    return document;
  }
}

