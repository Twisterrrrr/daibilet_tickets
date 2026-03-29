import { Injectable } from '@nestjs/common';
import { mkdir, stat, writeFile } from 'fs/promises';
import { join } from 'path';

import { FinanceHtmlPdfService } from './finance-html-pdf.service';
import { FinanceDocumentStorageService } from './finance-document-storage.service';
import { injectPrintCss } from './templates/finance-html-shell';
import {
  renderAgentReportHtml,
  renderInvoiceHtml,
  renderServiceActHtml,
  renderUpdHtml,
  renderVatInvoiceHtml,
} from './templates/finance-document-templates';

export type DemoDocType = 'AGENT_REPORT' | 'SERVICE_ACT' | 'UPD' | 'INVOICE' | 'VAT_INVOICE';

export interface DemoFinancePayload {
  number: string;
  date: string;
  periodStart: string;
  periodEnd: string;
  supplierName: string;
  supplierInn: string;
  supplierKpp?: string | null;
  customerName: string;
  customerInn?: string | null;
  customerKpp?: string | null;
  items: Array<{
    title: string;
    quantity: number;
    price: number;
    vatRate: number;
    vatAmount: number;
    operationDate?: string | null;
  }>;
  grossAmount: number;
  commissionAmount: number;
  netAmount: number;
  vatRate: number;
  vatAmount: number;
  /** Банк получателя (для бланка счёта) */
  bankRecipientName?: string | null;
  bankBik?: string | null;
  bankCorrespondentAccount?: string | null;
  bankSettlementAccount?: string | null;
  supplierLegalAddress?: string | null;
  customerLegalAddress?: string | null;
  agentAgreementNumber?: string | null;
  agentAgreementDate?: string | null;
  /** Срок оплаты (текст для бланка счёта), иначе — дефисы */
  invoicePaymentDueText?: string | null;
}

@Injectable()
export class FinanceDocumentRenderService {
  private readonly root = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
  constructor(
    private readonly storage: FinanceDocumentStorageService,
    private readonly pdf: FinanceHtmlPdfService,
  ) {}

  async renderDemoDocument(params: {
    operatorId: string;
    type: DemoDocType;
    fileBaseName: string;
    payload: DemoFinancePayload;
  }): Promise<{
    htmlPath: string;
    htmlSize: number;
    pdfPath: string | null;
    pdfSize: number | null;
    pdfError: string | null;
  }> {
    const { operatorId, type, fileBaseName, payload } = params;
    const dir = join(this.root, 'documents', 'demo', operatorId, type);
    await mkdir(dir, { recursive: true });

    const html = this.renderHtml(type, payload);
    const htmlPathAbs = join(dir, `${fileBaseName}.html`);
    await writeFile(htmlPathAbs, html, 'utf-8');
    const htmlStats = await stat(htmlPathAbs);

    const pdfPathAbs = join(dir, `${fileBaseName}.pdf`);
    try {
      const pdfBytes = await this.buildPdfFromPayload(type, payload);
      await writeFile(pdfPathAbs, pdfBytes);
      const pdfStats = await stat(pdfPathAbs);
      return {
        htmlPath: this.toRelative(htmlPathAbs),
        htmlSize: htmlStats.size,
        pdfPath: this.toRelative(pdfPathAbs),
        pdfSize: pdfStats.size,
        pdfError: null,
      };
    } catch (e) {
      return {
        htmlPath: this.toRelative(htmlPathAbs),
        htmlSize: htmlStats.size,
        pdfPath: null,
        pdfSize: null,
        pdfError: e instanceof Error ? e.message : 'PDF generation failed',
      };
    }
  }

  /**
   * Образцы для ЛК: те же HTML-шаблоны, что и при реальном выпуске; данные вымышленные.
   */
  getSampleDocumentsForSupplierPreview(): Array<{
    kind: DemoDocType;
    title: string;
    html: string;
  }> {
    const basePayload = this.buildSampleFinancePayload();
    const agentPayload = this.buildSampleAgentReportPayload();
    const order: DemoDocType[] = ['INVOICE', 'VAT_INVOICE', 'AGENT_REPORT', 'SERVICE_ACT', 'UPD'];
    const titles: Record<DemoDocType, string> = {
      AGENT_REPORT: 'Отчёт агента',
      SERVICE_ACT: 'Акт оказанных услуг',
      UPD: 'УПД',
      INVOICE: 'Счёт на оплату',
      VAT_INVOICE: 'Счёт-фактура',
    };
    return order.map((kind) => {
      let payload: DemoFinancePayload =
        kind === 'AGENT_REPORT' ? agentPayload : basePayload;
      if (kind === 'UPD') payload = this.withUpdDemoLineTitle(payload);
      return {
        kind,
        title: titles[kind],
        html: this.renderHtml(kind, payload),
      };
    });
  }

  /**
   * Образец PDF: тот же HTML+Puppeteer, что при выпуске (кириллица).
   */
  getSampleDocumentPdf(kind: DemoDocType): Promise<Uint8Array> {
    let payload: DemoFinancePayload =
      kind === 'AGENT_REPORT' ? this.buildSampleAgentReportPayload() : this.buildSampleFinancePayload();
    if (kind === 'UPD') payload = this.withUpdDemoLineTitle(payload);
    return this.buildPdfFromPayload(kind, payload);
  }

  private buildSampleFinancePayload(): DemoFinancePayload {
    return {
      number: 'DEMO-0001',
      date: '2026-03-29',
      periodStart: '2026-03-01',
      periodEnd: '2026-03-31',
      supplierName: 'ООО «Пример Поставщик»',
      supplierInn: '7700000000',
      supplierKpp: '770001001',
      customerName: 'ООО «Daibilet»',
      customerInn: '7800000000',
      customerKpp: '780101001',
      items: [
        {
          title: 'Агентское вознаграждение по отчету № DEMO-0001 от 29.03.2026',
          quantity: 1,
          price: 8000,
          vatRate: 20,
          vatAmount: 1333.33,
        },
      ],
      grossAmount: 8000,
      commissionAmount: 1600,
      netAmount: 6400,
      vatRate: 20,
      vatAmount: 1333.33,
      bankRecipientName: 'Наименование банка Агента',
      bankBik: '044030000',
      bankCorrespondentAccount: '30101810000000000000',
      bankSettlementAccount: '40702810000000000000',
      supplierLegalAddress: '123456, г. Москва, ул. Примерная, д. 1',
      customerLegalAddress: '190000, г. Санкт-Петербург, пр. Тестовый, д. 2',
      agentAgreementNumber: '123',
      agentAgreementDate: '2026-01-01',
    };
  }

  /** Для образца УПД — формулировка периода как в демо-макете. */
  private withUpdDemoLineTitle(p: DemoFinancePayload): DemoFinancePayload {
    const [y, m] = p.periodEnd.split('-').map(Number);
    const months = [
      'Январь',
      'Февраль',
      'Март',
      'Апрель',
      'Май',
      'Июнь',
      'Июль',
      'Август',
      'Сентябрь',
      'Октябрь',
      'Ноябрь',
      'Декабрь',
    ];
    const label = m >= 1 && m <= 12 ? `${months[m - 1]} ${y}` : p.periodEnd;
    return {
      ...p,
      items: p.items.map((it, idx) =>
        idx === 0 ? { ...it, title: `Агентское вознаграждение за ${label}` } : it,
      ),
    };
  }

  /** Демо отчёта агента: строки — сделки; счёт/прочие образцы используют buildSampleFinancePayload. */
  private buildSampleAgentReportPayload(): DemoFinancePayload {
    const base = this.buildSampleFinancePayload();
    return {
      ...base,
      items: [
        {
          title: 'Реализация услуг по бронированию (Заказ №445)',
          quantity: 1,
          price: 40000,
          vatRate: 20,
          vatAmount: 6666.67,
          operationDate: '2026-03-15',
        },
        {
          title: 'Реализация услуг по бронированию (Заказ №446)',
          quantity: 1,
          price: 10000,
          vatRate: 20,
          vatAmount: 1666.67,
          operationDate: '2026-03-20',
        },
      ],
      grossAmount: 50000,
      commissionAmount: 8000,
      netAmount: 42000,
      vatRate: 20,
      vatAmount: 1333.33,
      agentAgreementNumber: '123',
      agentAgreementDate: '2026-01-01',
    };
  }

  private renderHtml(type: DemoDocType, payload: DemoFinancePayload): string {
    const inner = this.renderHtmlInner(type, payload);
    return injectPrintCss(inner);
  }

  private renderHtmlInner(type: DemoDocType, payload: DemoFinancePayload): string {
    if (type === 'AGENT_REPORT') return renderAgentReportHtml(payload);
    if (type === 'SERVICE_ACT') return renderServiceActHtml(payload);
    if (type === 'INVOICE') return renderInvoiceHtml(payload);
    if (type === 'VAT_INVOICE') return renderVatInvoiceHtml(payload);
    return renderUpdHtml(payload);
  }

  async renderProductionDocument(params: {
    operatorId: string;
    type: DemoDocType;
    documentNumber: string;
    documentDate: Date;
    payload: DemoFinancePayload;
  }): Promise<{
    htmlPath: string;
    htmlSize: number;
    pdfPath: string | null;
    pdfSize: number | null;
    pdfError: string | null;
  }> {
    const baseDir = this.storage.buildBaseDir({
      operatorId: params.operatorId,
      documentType: params.type,
      documentNumber: params.documentNumber,
      documentDate: params.documentDate,
    });
    const html = this.renderHtml(params.type, params.payload);
    const htmlPath = await this.storage.saveText(baseDir, 'preview.html', html);
    const htmlSize = Buffer.byteLength(html, 'utf-8');
    try {
      const pdfBytes = await this.buildPdfFromPayload(params.type, params.payload);
      const pdfPath = await this.storage.saveBinary(baseDir, 'final.pdf', pdfBytes);
      return { htmlPath, htmlSize, pdfPath, pdfSize: pdfBytes.byteLength, pdfError: null };
    } catch (e) {
      return {
        htmlPath,
        htmlSize,
        pdfPath: null,
        pdfSize: null,
        pdfError: e instanceof Error ? e.message : 'PDF generation failed',
      };
    }
  }

  private async buildPdfFromPayload(type: DemoDocType, payload: DemoFinancePayload): Promise<Uint8Array> {
    const html = this.renderHtml(type, payload);
    return this.pdf.renderHtmlToPdf(html);
  }

  private toRelative(absPath: string): string {
    const normalized = absPath.replace(/\\/g, '/');
    const marker = '/uploads/';
    const idx = normalized.indexOf(marker);
    if (idx >= 0) return normalized.slice(idx + 1);
    return normalized;
  }
}

