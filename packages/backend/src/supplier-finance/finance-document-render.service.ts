import { Injectable } from '@nestjs/common';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { mkdir, stat, writeFile } from 'fs/promises';
import { join } from 'path';

import {
  renderAgentReportHtml,
  renderInvoiceHtml,
  renderServiceActHtml,
  renderUpdHtml,
  renderVatInvoiceHtml,
} from './templates/finance-document-templates';
import { FinanceDocumentStorageService } from './finance-document-storage.service';

type DemoDocType = 'AGENT_REPORT' | 'SERVICE_ACT' | 'UPD' | 'INVOICE' | 'VAT_INVOICE';

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
  items: Array<{
    title: string;
    quantity: number;
    price: number;
    vatRate: number;
    vatAmount: number;
  }>;
  grossAmount: number;
  commissionAmount: number;
  netAmount: number;
  vatRate: number;
  vatAmount: number;
}

@Injectable()
export class FinanceDocumentRenderService {
  private readonly root = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
  constructor(private readonly storage: FinanceDocumentStorageService) {}

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

  private renderHtml(type: DemoDocType, payload: DemoFinancePayload): string {
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
    const doc = await PDFDocument.create();
    const page = doc.addPage([595, 842]); // A4
    const font = await doc.embedFont(StandardFonts.Helvetica);
    let y = 800;
    const line = (text: string, size = 11) => {
      page.drawText(text, { x: 40, y, size, font });
      y -= size + 6;
    };

    line(`Daibilet Finance Demo: ${type}`, 14);
    line(`Number: ${payload.number}`);
    line(`Date: ${payload.date}`);
    line(`Period: ${payload.periodStart} - ${payload.periodEnd}`);
    line(`Supplier: ${payload.supplierName} (INN ${payload.supplierInn})`);
    line(`Customer: ${payload.customerName}`);
    line(`Gross: ${payload.grossAmount.toFixed(2)} RUB`);
    line(`Commission: ${payload.commissionAmount.toFixed(2)} RUB`);
    line(`Net: ${payload.netAmount.toFixed(2)} RUB`);
    line(`VAT: ${payload.vatRate}% (${payload.vatAmount.toFixed(2)} RUB)`);
    y -= 8;
    line('Items:', 12);
    payload.items.slice(0, 8).forEach((item, idx) => {
      line(
        `${idx + 1}. ${item.title} | qty ${item.quantity} | price ${item.price.toFixed(2)} | vat ${item.vatRate}%`,
        10,
      );
    });

    return doc.save();
  }

  private toRelative(absPath: string): string {
    const normalized = absPath.replace(/\\/g, '/');
    const marker = '/uploads/';
    const idx = normalized.indexOf(marker);
    if (idx >= 0) return normalized.slice(idx + 1);
    return normalized;
  }
}

