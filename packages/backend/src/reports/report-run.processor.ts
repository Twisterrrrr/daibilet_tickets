/**
 * ReportRunProcessor — BullMQ job (O2). queued → running → ready.
 * XLS + PDF export, email delivery (O5).
 */
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReportExportService } from './report-export.service';
import { QUEUE_REPORTS } from '../queue/queue.constants';

const REPORTS_DIR = process.env.REPORTS_DIR ?? './reports';

@Injectable()
@Processor(QUEUE_REPORTS)
export class ReportRunProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportRunProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reportExport: ReportExportService,
    private readonly mailService: MailService,
  ) {
    super();
  }

  async process(job: Job): Promise<unknown> {
    const { reportRunId } = job.data as { reportRunId: string };
    this.logger.log(`[job=${job.name}] [reportRunId=${reportRunId}] Processing report`);

    const run = await this.prisma.reportRun.findUnique({
      where: { id: reportRunId },
    });
    if (!run || run.status !== 'QUEUED') {
      this.logger.warn(`ReportRun ${reportRunId} not found or not QUEUED`);
      return { status: 'skipped' };
    }

    await this.prisma.reportRun.update({
      where: { id: reportRunId },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    try {
      const params = run.params as { periodFrom?: string; periodTo?: string };
      const periodFrom = params?.periodFrom ? new Date(params.periodFrom) : new Date(0);
      const periodTo = params?.periodTo ? new Date(params.periodTo) : new Date();

      const scope = {
        operatorId: run.operatorId,
        supplierId: run.supplierId,
        provider: run.provider,
      };

      const xlsPath = await this.reportExport.exportXls(
        run.type,
        periodFrom,
        periodTo,
        scope,
        REPORTS_DIR,
      );
      const pdfPath = await this.reportExport.exportPdf(
        run.type,
        periodFrom,
        periodTo,
        scope,
        REPORTS_DIR,
      );

      await this.prisma.reportRun.update({
        where: { id: reportRunId },
        data: {
          status: 'READY',
          finishedAt: new Date(),
          fileXlsPath: xlsPath,
          filePdfPath: pdfPath,
        },
      });

      if (run.sendToEmail) {
        try {
          await this.mailService.sendReportReady(run.sendToEmail, {
            reportType: run.type,
            xlsPath,
            pdfPath,
          });
          await this.prisma.reportRun.update({
            where: { id: reportRunId },
            data: { emailedAt: new Date() },
          });
        } catch (e) {
          this.logger.warn(`Failed to email report: ${(e as Error).message}`);
        }
      }

      return { status: 'ready', xlsPath, pdfPath };
    } catch (e) {
      this.logger.error(`ReportRun ${reportRunId} failed: ${(e as Error).message}`);
      await this.prisma.reportRun.update({
        where: { id: reportRunId },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          error: (e as Error).message,
        },
      });
      throw e;
    }
  }
}
