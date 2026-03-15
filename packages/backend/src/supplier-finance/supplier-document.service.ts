import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { DocumentNumberService } from './document-number.service';

@Injectable()
export class SupplierDocumentService {
  constructor(private readonly prisma: PrismaService) {}

  async generateDocumentsForReport(reportId: string) {
    const report = await this.prisma.supplierReport.findUnique({
      where: { id: reportId },
      include: { operator: true, lines: true },
    });
    if (!report) return null;

    const payload = {
      supplier: report.snapshotJson?.operator ?? {
        id: report.operatorId,
        name: report.operator.name,
        inn: report.operator.inn,
        commissionRate: report.operator.commissionRate,
      },
      legalProfile: (report.snapshotJson as any)?.legalProfile ?? report.legalProfileSnapshot ?? null,
      period: {
        start: report.periodStart.toISOString(),
        end: report.periodEnd.toISOString(),
      },
      totals: {
        grossAmount: report.grossAmount,
        commissionAmount: report.commissionAmount,
        refundAmount: report.refundAmount,
        netAmount: report.netAmount,
      },
      lines: report.lines.map((l) => ({
        type: l.type,
        referenceType: l.referenceType,
        referenceId: l.referenceId,
        amount: l.amount,
        netAmount: l.netAmount,
      })),
    };

    // P3.1: каркас VAT-пейлоада (пока не используется в прод-коде).
    const vatPayloadExample = {
      supplier: {
        legalName: (payload.legalProfile as any)?.legalName ?? payload.supplier.name,
        inn: (payload.legalProfile as any)?.inn ?? payload.supplier.inn,
        kpp: (payload.legalProfile as any)?.kpp ?? null,
        address: (payload.legalProfile as any)?.legalAddress ?? null,
        taxMode: (payload.legalProfile as any)?.taxMode ?? null,
        isVatPayer: (payload.legalProfile as any)?.isVatPayer ?? null,
        vatRate: (payload.legalProfile as any)?.defaultVatRate ?? null,
      },
      customer: {
        // Для простоты здесь не заполняем, в реальной интеграции данные берутся из профиля Daibilet/контрагента.
      },
      document: {
        number: null,
        date: report.createdAt.toISOString(),
        type: 'UPD_1' as const,
        periodStart: payload.period.start,
        periodEnd: payload.period.end,
        basis: null,
      },
      lines: [
        {
          description: 'Услуги по реализации билетов',
          quantity: 1,
          unit: 'усл.',
          price: payload.totals.netAmount,
          amount: payload.totals.netAmount,
          vatRate: (payload.legalProfile as any)?.defaultVatRate ?? null,
          vatAmount: null,
          amountWithVat: payload.totals.netAmount,
        },
      ],
      totals: {
        amount: payload.totals.netAmount,
        vatAmount: null,
        amountWithVat: payload.totals.netAmount,
        vatText: (payload.legalProfile as any)?.isVatPayer ? 'в т.ч. НДС' : 'Без НДС',
      },
      npd: null,
    };
    void vatPayloadExample;

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
<p>Поставщик: ${payload.supplier.name}</p>
<p>Период: ${payload.period.start} — ${payload.period.end}</p>
<p>Итого к выплате: ${payload.totals.netAmount}</p>
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
            ...(payload as any).document,
            number: documentNumber,
            date: now.toISOString(),
            type: 'AGENT_REPORT',
          },
        },
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

