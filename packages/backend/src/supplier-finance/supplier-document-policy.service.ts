import { Injectable } from '@nestjs/common';
import { ClosingDocumentMode, TaxMode } from '@/prisma-client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SupplierDocumentPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async getRequiredDocumentsForSettlement(settlementId: string): Promise<{
    required: Array<'AGENT_REPORT' | 'SERVICE_ACT' | 'UPD' | 'INVOICE' | 'VAT_INVOICE'>;
    skipped: Array<{ type: 'AGENT_REPORT' | 'SERVICE_ACT' | 'UPD' | 'INVOICE' | 'VAT_INVOICE'; reason: string }>;
  }> {
    const settlement = await this.prisma.supplierSettlement.findUnique({
      where: { id: settlementId },
      include: { operator: { include: { legalProfile: true } } },
    });
    if (!settlement) {
      return { required: [], skipped: [{ type: 'AGENT_REPORT', reason: 'Settlement not found' }] };
    }

    const profile = settlement.operator.legalProfile;
    const required: Array<'AGENT_REPORT' | 'SERVICE_ACT' | 'UPD' | 'INVOICE' | 'VAT_INVOICE'> = ['AGENT_REPORT'];
    const skipped: Array<{ type: 'AGENT_REPORT' | 'SERVICE_ACT' | 'UPD' | 'INVOICE' | 'VAT_INVOICE'; reason: string }> = [];

    const closingMode = profile?.closingDocumentMode ?? ClosingDocumentMode.UPD;
    required.push(closingMode === ClosingDocumentMode.ACT ? 'SERVICE_ACT' : 'UPD');

    if (profile?.generateInvoiceDocuments) {
      required.push('INVOICE');
      const vatAllowed =
        profile.isVatPayer &&
        profile.defaultVatRate != null &&
        profile.taxMode !== TaxMode.NPD;
      if (vatAllowed) {
        required.push('VAT_INVOICE');
      } else {
        skipped.push({
          type: 'VAT_INVOICE',
          reason: 'VAT invoice skipped: supplier is not eligible by tax profile',
        });
      }
    }

    return { required, skipped };
  }
}

