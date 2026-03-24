import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';
import puppeteer from 'puppeteer';
import * as QRCode from 'qrcode';

import { TicketPdfData } from './types/ticket-pdf-data.type';
import { renderHtmlTemplate } from './utils/template-renderer.util';

@Injectable()
export class TicketPdfService {
  private readonly logger = new Logger(TicketPdfService.name);

  constructor(private readonly config: ConfigService) {}

  async generateTicketPdfBuffer(data: TicketPdfData): Promise<Buffer> {
    try {
      const qrDataUrl = await this.buildQrDataUrl(data.qrPayload);
      const html = await this.buildHtml({
        ...data,
        qrDataUrl,
      });

      const executablePath = this.resolveExecutablePath();
      const noSandbox = this.config.get<string>('PUPPETEER_NO_SANDBOX', 'true') !== 'false';
      const headlessValue = this.config.get<string>('PUPPETEER_HEADLESS', 'true');
      const headless: boolean | 'shell' = headlessValue === 'shell' ? 'shell' : headlessValue !== 'false';

      const browser = await puppeteer.launch({
        headless,
        ...(executablePath ? { executablePath } : {}),
        args: noSandbox ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
      });

      try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdf = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: {
            top: '0',
            right: '0',
            bottom: '0',
            left: '0',
          },
        });
        await page.close();
        return Buffer.from(pdf);
      } finally {
        await browser.close();
      }
    } catch (error) {
      this.logger.error('Ticket PDF generation failed', error instanceof Error ? error.stack : String(error));
      throw new InternalServerErrorException('Не удалось сформировать PDF билета');
    }
  }

  private async buildQrDataUrl(payload: string): Promise<string> {
    return QRCode.toDataURL(payload, {
      width: 320,
      margin: 1,
    });
  }

  private async buildHtml(data: TicketPdfData & { qrDataUrl: string }): Promise<string> {
    const template = await this.readTemplate();
    return renderHtmlTemplate(template, data as unknown as Record<string, unknown>);
  }

  private async readTemplate(): Promise<string> {
    const candidates = [
      join(process.cwd(), 'src', 'voucher', 'templates', 'default-ticket.template.html'),
      join(process.cwd(), 'dist', 'voucher', 'templates', 'default-ticket.template.html'),
      join(__dirname, 'templates', 'default-ticket.template.html'),
    ];

    const path = candidates.find((candidate) => existsSync(candidate));
    if (!path) {
      throw new Error('Ticket HTML template not found');
    }
    return readFile(path, 'utf8');
  }

  private resolveExecutablePath(): string | undefined {
    const fromEnv = this.config.get<string>('PUPPETEER_EXECUTABLE_PATH');
    if (fromEnv) return fromEnv;

    const linuxCandidates = ['/usr/bin/chromium-browser', '/usr/bin/chromium'];
    const candidate = linuxCandidates.find((p) => existsSync(p));
    return candidate;
  }
}

