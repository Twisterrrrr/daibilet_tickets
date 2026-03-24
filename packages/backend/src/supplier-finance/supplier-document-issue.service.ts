import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { DocumentNumberService } from './document-number.service';
import { FinanceDocumentRenderService } from './finance-document-render.service';
import { SupplierDocumentPolicyService } from './supplier-document-policy.service';

type SettlementWithProfile = {
  operator: {
    name: string;
    legalProfile: {
      legalName: string | null;
      inn: string | null;
      kpp: string | null;
      defaultVatRate: Prisma.Decimal | null;
      bankAccounts: Array<{ isPrimary: boolean }>;
      status: string;
    } | null;
  };
  operatorId: string;
  id: string;
  status: string;
  periodStart: Date;
  periodEnd: Date;
  grossAmount: Prisma.Decimal;
  commissionAmount: Prisma.Decimal;
  netAmount: Prisma.Decimal;
};

type IssueDocType = 'AGENT_REPORT' | 'SERVICE_ACT' | 'UPD' | 'INVOICE' | 'VAT_INVOICE';

@Injectable()
export class SupplierDocumentIssueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: SupplierDocumentPolicyService,
    private readonly numberService: DocumentNumberService,
    private readonly renderService: FinanceDocumentRenderService,
  ) {}

  async issueDocumentsForSettlement(settlementId: string) {
    const settlement = await this.prisma.supplierSettlement.findUnique({
      where: { id: settlementId },
      include: {
        operator: {
          include: {
            legalProfile: { include: { bankAccounts: true } },
          },
        },
      },
    });
    if (!settlement) throw new NotFoundException('Settlement not found');
    const settlementData = settlement as unknown as SettlementWithProfile;
    if (settlementData.status !== 'FINALIZED') {
      throw new BadRequestException('Only FINALIZED settlement can issue documents');
    }
    const profile = settlementData.operator.legalProfile;
    if (!profile || profile.status !== 'VERIFIED') {
      throw new BadRequestException('VERIFIED finance profile is required');
    }
    if (!profile.bankAccounts.some((a) => a.isPrimary)) {
      throw new BadRequestException('Primary bank account is required');
    }

    const policy = await this.policy.getRequiredDocumentsForSettlement(settlementId);
    const now = new Date();
    const year = now.getUTCFullYear();
    const results: Array<{ type: IssueDocType; status: string; number: string; reason?: string }> = [];

    for (const type of policy.required) {
      const prefix = this.getPrefix(type);
      const numberType = this.getNumberType(type);
      const number = `${prefix}-${await this.numberService.nextNumber({
        operatorId: settlementData.operatorId,
        year,
        type: numberType,
      })}`;
      const payload = this.buildPayload(settlementData, number, type);

      const doc = await this.prisma.supplierDocument.create({
        data: {
          operatorId: settlementData.operatorId,
          settlementId: settlementData.id,
          type,
          title: `${type} ${number}`,
          status: 'DRAFT',
          payloadJson: payload as unknown as Prisma.InputJsonValue,
        },
      });

      const rendered = await this.renderService.renderProductionDocument({
        operatorId: settlementData.operatorId,
        type,
        documentNumber: number,
        documentDate: now,
        payload: payload,
      });

      await this.prisma.supplierDocument.update({
        where: { id: doc.id },
        data: {
          status: rendered.pdfPath ? 'ISSUED' : 'FAILED',
          payloadJson: {
            ...payload,
            storage: {
              htmlPath: rendered.htmlPath,
              pdfPath: rendered.pdfPath,
              pdfError: rendered.pdfError,
              generatedAt: now.toISOString(),
            },
          } as Prisma.InputJsonValue,
          files: {
            create: [
              {
                kind: 'JSON_SNAPSHOT',
                storageKey: rendered.htmlPath,
                fileName: 'preview.html',
                mimeType: 'text/html',
                sizeBytes: rendered.htmlSize,
              },
              ...(rendered.pdfPath
                ? [
                    {
                      kind: 'PDF' as const,
                      storageKey: rendered.pdfPath,
                      fileName: 'final.pdf',
                      mimeType: 'application/pdf',
                      sizeBytes: rendered.pdfSize ?? undefined,
                    },
                  ]
                : []),
            ],
          },
        },
      });

      results.push({
        type,
        status: rendered.pdfPath ? 'ISSUED' : 'FAILED',
        number,
        ...(rendered.pdfError ? { reason: rendered.pdfError } : {}),
      });
    }

    for (const skipped of policy.skipped) {
      results.push({ type: skipped.type, status: 'SKIPPED', number: '-', reason: skipped.reason });
    }
    return { settlementId, results };
  }

  async regenerateDocument(documentId: string) {
    const doc = await this.prisma.supplierDocument.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.status === 'SIGNED' || doc.status === 'SENT') {
      throw new BadRequestException('Cannot overwrite sent/signed document');
    }
    if (!doc.settlementId) throw new BadRequestException('Only settlement documents can be regenerated');
    return this.issueDocumentsForSettlement(doc.settlementId);
  }

  async cancelDocument(documentId: string) {
    const doc = await this.prisma.supplierDocument.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Document not found');
    return this.prisma.supplierDocument.update({
      where: { id: documentId },
      data: { status: 'CANCELED' },
    });
  }

  private getPrefix(type: IssueDocType): string {
    if (type === 'AGENT_REPORT') return 'AR';
    if (type === 'SERVICE_ACT') return 'ACT';
    if (type === 'UPD') return 'UPD';
    if (type === 'INVOICE') return 'INV';
    return 'SF';
  }

  private getNumberType(type: IssueDocType): 'AGENT_REPORT' | 'INVOICE' | 'UPD_1' | 'UPD_2' {
    if (type === 'AGENT_REPORT') return 'AGENT_REPORT';
    if (type === 'UPD') return 'UPD_2';
    if (type === 'VAT_INVOICE') return 'UPD_1';
    return 'INVOICE';
  }

  private buildPayload(settlement: SettlementWithProfile, number: string, type: IssueDocType) {
    const profile = settlement.operator.legalProfile;
    if (!profile) {
      throw new BadRequestException('Tax profile is required');
    }
    const grossAmount = Number(settlement.grossAmount);
    const commissionAmount = Number(settlement.commissionAmount);
    const netAmount = Number(settlement.netAmount);
    const vatRate = profile.defaultVatRate ? Number(profile.defaultVatRate) : 0;
    const vatAmount = vatRate > 0 ? Number((grossAmount * vatRate / (100 + vatRate)).toFixed(2)) : 0;
    return {
      number,
      date: new Date().toISOString().slice(0, 10),
      periodStart: settlement.periodStart.toISOString().slice(0, 10),
      periodEnd: settlement.periodEnd.toISOString().slice(0, 10),
      supplierName: profile.legalName || settlement.operator.name,
      supplierInn: profile.inn || '',
      supplierKpp: profile.kpp || null,
      customerName: 'ООО Daibilet',
      customerInn: '7700000000',
      items: [
        {
          title: `${type} за расчетный период`,
          quantity: 1,
          price: grossAmount,
          vatRate,
          vatAmount,
        },
      ],
      grossAmount,
      commissionAmount,
      netAmount,
      vatRate,
      vatAmount,
    };
  }
}

