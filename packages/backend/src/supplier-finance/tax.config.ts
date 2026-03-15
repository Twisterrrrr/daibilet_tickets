import { TaxMode } from '@prisma/client';

export interface TaxBehavior {
  requiresVat: boolean;
  defaultVatRate: number | null;
  mainDocumentType: 'UPD_1' | 'ACT_NO_VAT' | 'AGENT_REPORT_ONLY';
  needsInvoice: boolean;
  needsNpdReceiptLink: boolean;
}

// P3.1: декларативная матрица поведения по налоговым режимам.
export const TAX_MATRIX: Record<TaxMode, TaxBehavior> = {
  OSNO: {
    requiresVat: true,
    defaultVatRate: 20,
    mainDocumentType: 'UPD_1',
    needsInvoice: true,
    needsNpdReceiptLink: false,
  },
  USN_6: {
    requiresVat: false,
    defaultVatRate: null,
    mainDocumentType: 'ACT_NO_VAT',
    needsInvoice: false,
    needsNpdReceiptLink: false,
  },
  USN_15: {
    requiresVat: false,
    defaultVatRate: null,
    mainDocumentType: 'ACT_NO_VAT',
    needsInvoice: false,
    needsNpdReceiptLink: false,
  },
  AUSN: {
    requiresVat: false,
    defaultVatRate: null,
    mainDocumentType: 'ACT_NO_VAT',
    needsInvoice: false,
    needsNpdReceiptLink: false,
  },
  NPD: {
    requiresVat: false,
    defaultVatRate: null,
    mainDocumentType: 'AGENT_REPORT_ONLY',
    needsInvoice: false,
    needsNpdReceiptLink: true,
  },
};

