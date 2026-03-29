import { describe, expect, it } from 'vitest';



import type { DemoFinancePayload } from '../finance-document-render.service';

import { injectPrintCss } from '../templates/finance-html-shell';

import {

  renderAgentReportHtml,

  renderInvoiceHtml,

  renderServiceActHtml,

  renderUpdHtml,

  renderVatInvoiceHtml,

} from '../templates/finance-document-templates';



const samplePayload = (): DemoFinancePayload => ({

  number: 'T-1',

  date: '2026-03-29',

  periodStart: '2026-03-01',

  periodEnd: '2026-03-31',

  supplierName: 'ООО Поставщик',

  supplierInn: '7700000000',

  supplierKpp: '770001001',

  customerName: 'ООО Покупатель',

  customerInn: '7800000000',

  customerKpp: '780001001',

  items: [

    {

      title: 'Услуга тест',

      quantity: 2,

      price: 500,

      vatRate: 20,

      vatAmount: 166.67,

      operationDate: '2026-03-15',

    },

  ],

  grossAmount: 1000,

  commissionAmount: 150,

  netAmount: 850,

  vatRate: 20,

  vatAmount: 133.33,

  bankRecipientName: 'ПАО Банк',

  bankBik: '044525225',

  bankCorrespondentAccount: '30101810400000000225',

  bankSettlementAccount: '40702810000000000000',

  supplierLegalAddress: 'г. Москва, ул. Тестовая, 1',

  customerLegalAddress: 'г. Санкт-Петербург, пр. Примерный, 2',

  agentAgreementNumber: 'АГ-1',

  agentAgreementDate: '2026-01-15',

});



function withPrintCss(innerHtml: string): string {

  return injectPrintCss(innerHtml);

}



describe('finance-document-templates (render smoke)', () => {

  it('renders agent report with table, totals and signatures', () => {

    const html = withPrintCss(renderAgentReportHtml(samplePayload()));

    expect(html).toContain('id="finance-print-global"');

    expect(html).toContain('fn-doc');

    expect(html).toContain('Отчёт агента');

    expect(html).toContain('Расшифровка операций');

    expect(html).toContain('Вознаграждение');

    expect(html).toContain('fn-total-box');

    expect(html).toContain('fn-total-pay');

    expect(html).toContain('Услуга тест');

    expect(html).toMatch(/1\s*000,00/);

  });



  it('renders service act with claim waiver line', () => {

    const html = withPrintCss(renderServiceActHtml(samplePayload()));

    expect(html).toContain('Акт №');

    expect(html).toContain('Исполнитель:');

    expect(html).toContain('Вышеперечисленные услуги');

    expect(html).toContain('претензий');

    expect(html).toContain('fn-table');

  });



  it('renders invoice with bank block and pay line', () => {

    const html = withPrintCss(renderInvoiceHtml(samplePayload()));

    expect(html).toContain('Счёт');

    expect(html).toContain('fn-bank');

    expect(html).toContain('044525225');

    expect(html).toContain('Всего к оплате');

    expect(html).toContain('fn-total-pay');

    expect(html).toContain('Поставщик / (Исполнитель)');

    expect(html).toContain('Оплатить не позднее');

  });



  it('renders UPD with seller/buyer and numeric columns', () => {

    const html = withPrintCss(renderUpdHtml(samplePayload()));

    expect(html).toContain('УПД');

    expect(html).toMatch(/Продавец|Поставщик/);

    expect(html).toContain('Покупатель');

    expect(html).toContain('Продавец (2)');

    expect(html).toContain('fn-table-1137');

    expect(html).toContain('numeric');

  });



  it('renders VAT invoice with unified fn layout', () => {

    const html = withPrintCss(renderVatInvoiceHtml(samplePayload()));

    expect(html).toContain('Счёт-фактура');

    expect(html).toContain('Приложение № 1');

    expect(html).toContain('Продавец (2)');

    expect(html).toContain('Покупатель');

    expect(html).toContain('fn-table-1137');

    expect(html).toContain('Всего к оплате');

    expect(html).toContain('Главный бухгалтер');

  });

});


