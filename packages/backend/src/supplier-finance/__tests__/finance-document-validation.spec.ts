import { describe, expect, it } from 'vitest';

import type { DemoFinancePayload } from '../finance-document-render.service';
import { getBlockingFinanceIssues, validateFinanceDocumentPayload } from '../finance-document-validation';

const basePayload = (): DemoFinancePayload => ({
  number: 'T-1',
  date: '2026-03-29',
  periodStart: '2026-03-01',
  periodEnd: '2026-03-31',
  supplierName: 'ООО Тест',
  supplierInn: '7700000000',
  supplierKpp: '770001001',
  customerName: 'ООО Покупатель',
  customerInn: '7800000000',
  customerKpp: null,
  items: [{ title: 'Услуга', quantity: 1, price: 1000, vatRate: 0, vatAmount: 0 }],
  grossAmount: 1000,
  commissionAmount: 100,
  netAmount: 900,
  vatRate: 0,
  vatAmount: 0,
  bankRecipientName: 'Банк',
  bankBik: '044525225',
  bankCorrespondentAccount: '30101810400000000225',
  bankSettlementAccount: '40702810000000000000',
  supplierLegalAddress: 'Адрес 1',
  customerLegalAddress: 'Адрес 2',
  agentAgreementNumber: null,
  agentAgreementDate: null,
});

describe('finance-document-validation', () => {
  it('flags missing bank requisites for INVOICE', () => {
    const p = basePayload();
    p.bankBik = '';
    p.bankSettlementAccount = '';
    const issues = validateFinanceDocumentPayload('INVOICE', p);
    const blocking = getBlockingFinanceIssues(issues);
    expect(blocking.some((i) => i.field === 'bankBik')).toBe(true);
    expect(blocking.some((i) => i.field === 'bankSettlementAccount')).toBe(true);
  });

  it('allows INVOICE when bank fields set', () => {
    const issues = validateFinanceDocumentPayload('INVOICE', basePayload());
    expect(getBlockingFinanceIssues(issues)).toEqual([]);
  });

  it('requires customer INN for UPD', () => {
    const p = basePayload();
    p.customerInn = '';
    const blocking = getBlockingFinanceIssues(validateFinanceDocumentPayload('UPD', p));
    expect(blocking.some((i) => i.field === 'customerInn')).toBe(true);
  });
});
