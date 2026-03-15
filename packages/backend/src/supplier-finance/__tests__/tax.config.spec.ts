import { describe, expect, it } from 'vitest';

import { TaxMode } from '@prisma/client';

import { commissionFromGross, vatFromGross } from '../tax-calculations';
import { TAX_MATRIX } from '../tax.config';

describe('TAX_MATRIX (P3.1-2)', () => {
  describe('1. ОСНО (НДС 20%)', () => {
    it('matrix: OSNO has requiresVat true and defaultVatRate 20', () => {
      const behavior = TAX_MATRIX.OSNO;
      expect(behavior.requiresVat).toBe(true);
      expect(behavior.defaultVatRate).toBe(20);
      expect(behavior.mainDocumentType).toBe('UPD_1');
      expect(behavior.needsInvoice).toBe(true);
    });

    it('should extract VAT from gross: Base/1.2 * 0.2 and net = Base/1.2', () => {
      const gross = 1200; // сумма с НДС 20%
      const { net, vat } = vatFromGross(gross, 20);
      expect(net).toBe(1000); // база без НДС
      expect(vat).toBe(200);  // НДС = 1000 * 0.2
    });

    it('netAmount equals gross when rate 0 (OSNO formula applied with 0%)', () => {
      const { net, vat } = vatFromGross(1000, 0);
      expect(net).toBe(1000);
      expect(vat).toBe(0);
    });
  });

  describe('2. УСН (без НДС)', () => {
    it('matrix: USN_6 and USN_15 have requiresVat false, no defaultVatRate', () => {
      expect(TAX_MATRIX.USN_6.requiresVat).toBe(false);
      expect(TAX_MATRIX.USN_6.defaultVatRate).toBeNull();
      expect(TAX_MATRIX.USN_6.mainDocumentType).toBe('ACT_NO_VAT');

      expect(TAX_MATRIX.USN_15.requiresVat).toBe(false);
      expect(TAX_MATRIX.USN_15.defaultVatRate).toBeNull();
    });

    it('vatAmount is always 0 when vatRatePercent is 0', () => {
      const { net, vat } = vatFromGross(5000, 0);
      expect(vat).toBe(0);
      expect(net).toBe(5000);
    });

    it('netAmount equals full sum for USN (no VAT extraction)', () => {
      const fullSum = 10_000;
      const { net, vat } = vatFromGross(fullSum, 0);
      expect(net).toBe(fullSum);
      expect(vat).toBe(0);
    });
  });

  describe('3. Самозанятые (НПД)', () => {
    it('matrix: NPD has AGENT_REPORT_ONLY and needsNpdReceiptLink (tax paid by supplier)', () => {
      const behavior = TAX_MATRIX.NPD;
      expect(behavior.mainDocumentType).toBe('AGENT_REPORT_ONLY');
      expect(behavior.needsNpdReceiptLink).toBe(true);
      expect(behavior.requiresVat).toBe(false);
      expect(behavior.needsInvoice).toBe(false);
    });

    it('no VAT withholding on our side: requiresVat false, vatFromGross(1000,0) => vat 0', () => {
      const { vat } = vatFromGross(1000, 0);
      expect(vat).toBe(0);
    });
  });

  describe('4. Агентская схема (комиссия)', () => {
    it('matrix: OSNO has needsInvoice (document type for commission context)', () => {
      expect(TAX_MATRIX.OSNO.needsInvoice).toBe(true);
      expect(TAX_MATRIX.NPD.mainDocumentType).toBe('AGENT_REPORT_ONLY');
    });

    it('commission ДО налогов: от gross', () => {
      const gross = 1200;
      const { commission, baseForCommission } = commissionFromGross(gross, 10);
      expect(baseForCommission).toBe(1200);
      expect(commission).toBe(120); // 10% от 1200
    });

    it('commission ПОСЛЕ налогов: от net (base without VAT)', () => {
      const gross = 1200; // с НДС 20%
      const { commission, baseForCommission } = commissionFromGross(gross, 10, {
        vatRatePercent: 20,
        commissionAfterVat: true,
      });
      expect(baseForCommission).toBe(1000); // net = 1200/1.2
      expect(commission).toBe(100); // 10% от 1000
    });

    it('commission 0 when gross 0', () => {
      const { commission } = commissionFromGross(0, 10);
      expect(commission).toBe(0);
    });

    it('commission 0 when rate 0', () => {
      const { commission } = commissionFromGross(1000, 0);
      expect(commission).toBe(0);
    });
  });

  describe('5. Краевые кейсы (деление на ноль, нулевая сумма)', () => {
    it('zero gross: vatFromGross(0, 20) returns { net: 0, vat: 0 } without throw', () => {
      const { net, vat } = vatFromGross(0, 20);
      expect(net).toBe(0);
      expect(vat).toBe(0);
    });

    it('zero gross with 0% rate', () => {
      const { net, vat } = vatFromGross(0, 0);
      expect(net).toBe(0);
      expect(vat).toBe(0);
    });

    it('100% discount (gross 0): commissionFromGross(0, 15) returns commission 0', () => {
      const { commission } = commissionFromGross(0, 15);
      expect(commission).toBe(0);
    });

    it('rounding: VAT from 1000 with 20% gives consistent net+vat', () => {
      const gross = 1000;
      const { net, vat } = vatFromGross(gross, 20);
      expect(net + vat).toBeCloseTo(gross, 2);
      expect(vat).toBeCloseTo(net * 0.2, 2);
    });
  });

  describe('Matrix coverage: all TaxMode keys present', () => {
    const modes: TaxMode[] = ['OSNO', 'USN_6', 'USN_15', 'AUSN', 'NPD'];
    it.each(modes)('%s has required TaxBehavior fields', (mode) => {
      const b = TAX_MATRIX[mode];
      expect(b).toBeDefined();
      expect(typeof b.requiresVat).toBe('boolean');
      expect(b.defaultVatRate === null || typeof b.defaultVatRate === 'number').toBe(true);
      expect(['UPD_1', 'ACT_NO_VAT', 'AGENT_REPORT_ONLY']).toContain(b.mainDocumentType);
      expect(typeof b.needsInvoice).toBe('boolean');
      expect(typeof b.needsNpdReceiptLink).toBe('boolean');
    });
  });
});
