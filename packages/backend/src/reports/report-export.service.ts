/**
 * Report export: XLS (xlsx) and PDF (pdf-lib). O3, O4.
 */
import { Injectable } from '@nestjs/common';
import { createWriteStream, promises as fs } from 'fs';
import { join } from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as XLSX from 'xlsx';

import type { ProviderKind } from '@prisma/client';

import { ReportService, type SalesRow, type RefundsRow, type VoucherRow } from './report.service';

@Injectable()
export class ReportExportService {
  constructor(private readonly reportService: ReportService) {}

  async exportXls(
    reportType: string,
    periodFrom: Date,
    periodTo: Date,
    scope: { operatorId?: string | null; supplierId?: string | null; provider?: ProviderKind | null },
    outDir: string,
  ): Promise<string> {
    const wb = XLSX.utils.book_new();
    let data: Array<Record<string, unknown>> = [];
    let sheetName = 'Report';

    if (reportType === 'SALES') {
      data = (await this.reportService.sales(periodFrom, periodTo, scope)) as Array<
        Record<string, unknown>
      >;
      sheetName = 'Sales';
    } else if (reportType === 'REFUNDS') {
      data = (await this.reportService.refunds(periodFrom, periodTo, scope)) as Array<
        Record<string, unknown>
      >;
      sheetName = 'Refunds';
    } else if (reportType === 'COMMISSIONS') {
      data = (await this.reportService.commissions(periodFrom, periodTo, scope)) as Array<
        Record<string, unknown>
      >;
      sheetName = 'Commissions';
    } else if (reportType === 'VOUCHER_REGISTER') {
      data = (await this.reportService.voucherRegister(periodFrom, periodTo, scope)) as Array<
        Record<string, unknown>
      >;
      sheetName = 'Vouchers';
    }

    const ws = XLSX.utils.json_to_sheet(data.length ? data : [{ _: 'No data' }]);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    await fs.mkdir(outDir, { recursive: true });
    const filename = `${reportType}_${periodFrom.toISOString().slice(0, 10)}_${periodTo.toISOString().slice(0, 10)}.xlsx`;
    const filepath = join(outDir, filename);
    XLSX.writeFile(wb, filepath);
    return filepath;
  }

  async exportPdf(
    reportType: string,
    periodFrom: Date,
    periodTo: Date,
    scope: { operatorId?: string | null; supplierId?: string | null; provider?: ProviderKind | null },
    outDir: string,
  ): Promise<string> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    let page = pdfDoc.addPage([595, 842]);
    let y = 800;

    const addText = (text: string, size = 10) => {
      if (y < 50) {
        page = pdfDoc.addPage([595, 842]);
        y = 800;
      }
      page.drawText(text, { x: 50, y, size, font, color: rgb(0, 0, 0) });
      y -= size + 4;
    };

    addText(`Report: ${reportType}`, 14);
    addText(`Period: ${periodFrom.toISOString().slice(0, 10)} — ${periodTo.toISOString().slice(0, 10)}`);
    addText('');

    if (reportType === 'SALES') {
      const rows = await this.reportService.sales(periodFrom, periodTo, scope);
      addText(`Total rows: ${rows.length}`);
      rows.slice(0, 50).forEach((r) => {
        addText(`${r.date} | ${r.voucherCode ?? '-'} | ${r.grossCents} | ${r.commissionCents}`);
      });
      if (rows.length > 50) addText(`... and ${rows.length - 50} more`);
    } else if (reportType === 'REFUNDS') {
      const rows = await this.reportService.refunds(periodFrom, periodTo, scope);
      addText(`Total rows: ${rows.length}`);
      rows.slice(0, 50).forEach((r) => {
        addText(`${r.date} | ${r.refundId.slice(0, 8)} | ${r.status} | ${r.approvedCents ?? '-'}`);
      });
    } else if (reportType === 'VOUCHER_REGISTER') {
      const rows = await this.reportService.voucherRegister(periodFrom, periodTo, scope);
      addText(`Total rows: ${rows.length}`);
      rows.slice(0, 50).forEach((r) => {
        addText(`${r.voucherCode} | ${r.issuedAt.slice(0, 10)} | ${r.status}`);
      });
    }

    await fs.mkdir(outDir, { recursive: true });
    const filename = `${reportType}_${periodFrom.toISOString().slice(0, 10)}_${periodTo.toISOString().slice(0, 10)}.pdf`;
    const filepath = join(outDir, filename);
    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(filepath, pdfBytes);
    return filepath;
  }
}
