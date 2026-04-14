import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@/prisma-client';

import type { DemoDocType, DemoFinancePayload } from './finance-document-render.service';

const DAIBILET_CUSTOMER_ADDRESS =
  '190000, г. Санкт-Петербург, пр. Невский, д. 1 (юр. адрес платформы — уточняйте в договоре)';

export type SettlementWithProfile = {
  operator: {
    name: string;
    legalProfile: {
      legalName: string | null;
      inn: string | null;
      kpp: string | null;
      legalAddress: string | null;
      defaultVatRate: Prisma.Decimal | null;
      bankAccounts: Array<{
        isPrimary: boolean;
        bankName: string | null;
        bik: string;
        accountNumber: string;
        correspondentAccount: string | null;
      }>;
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

/**
 * Нормализованный payload для HTML-шаблонов (без прямой привязки к ORM в шаблоне).
 */
export function buildFinanceDocumentPayload(
  settlement: SettlementWithProfile,
  number: string,
  type: DemoDocType,
): DemoFinancePayload {
  const profile = settlement.operator.legalProfile;
  if (!profile) {
    throw new BadRequestException('Tax profile is required');
  }
  const grossAmount = Number(settlement.grossAmount);
  const commissionAmount = Number(settlement.commissionAmount);
  const netAmount = Number(settlement.netAmount);
  const vatRate = profile.defaultVatRate ? Number(profile.defaultVatRate) : 0;
  const vatAmount = vatRate > 0 ? Number(((grossAmount * vatRate) / (100 + vatRate)).toFixed(2)) : 0;
  const primary = profile.bankAccounts.find((a) => a.isPrimary);
  if (!primary) {
    throw new BadRequestException('Primary bank account is required');
  }
  const ps = settlement.periodStart.toISOString().slice(0, 10);
  const pe = settlement.periodEnd.toISOString().slice(0, 10);
  const agentLineTitle =
    type === 'AGENT_REPORT'
      ? `Услуги агента по приёму платежей и организации взаиморасчётов с покупателями (сводно за период ${ps} — ${pe})`
      : `${type} за расчетный период`;
  // В шаблонах агентской схемы: customer* — платформа (агент по отношению к принципалу), supplier* — оператор (принципал).
  return {
    number,
    date: new Date().toISOString().slice(0, 10),
    periodStart: ps,
    periodEnd: pe,
    supplierName: profile.legalName || settlement.operator.name,
    supplierInn: profile.inn || '',
    supplierKpp: profile.kpp || null,
    customerName: 'ООО Daibilet',
    customerInn: '7700000000',
    customerKpp: null,
    items: [
      {
        title: agentLineTitle,
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
    bankRecipientName: primary.bankName ?? '',
    bankBik: primary.bik,
    bankCorrespondentAccount: primary.correspondentAccount ?? '',
    bankSettlementAccount: primary.accountNumber,
    supplierLegalAddress: profile.legalAddress ?? '',
    customerLegalAddress: DAIBILET_CUSTOMER_ADDRESS,
    agentAgreementNumber: null,
    agentAgreementDate: null,
    invoicePaymentDueText: null,
  };
}
