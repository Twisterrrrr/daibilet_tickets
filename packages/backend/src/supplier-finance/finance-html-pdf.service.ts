import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import puppeteer from 'puppeteer';

/**
 * HTML → PDF через Puppeteer (кириллица, как у билетов).
 */
@Injectable()
export class FinanceHtmlPdfService {
  private readonly logger = new Logger(FinanceHtmlPdfService.name);

  constructor(private readonly config: ConfigService) {}

  async renderHtmlToPdf(html: string): Promise<Uint8Array> {
    const executablePath =
      this.config.get<string>('PUPPETEER_EXECUTABLE_PATH')?.trim() || undefined;
    const noSandbox = this.config.get<string>('PUPPETEER_NO_SANDBOX', 'true') !== 'false';
    const headlessValue = this.config.get<string>('PUPPETEER_HEADLESS', 'true');
    const headless: boolean | 'shell' = headlessValue === 'shell' ? 'shell' : headlessValue !== 'false';

    let browser;
    try {
      browser = await puppeteer.launch({
        headless,
        ...(executablePath ? { executablePath } : {}),
        args: noSandbox ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm',
        },
      });
      await page.close();
      return new Uint8Array(pdf);
    } catch (e) {
      this.logger.error(
        'Finance HTML→PDF failed',
        e instanceof Error ? e.stack : String(e),
      );
      throw new Error(e instanceof Error ? e.message : 'PDF generation failed');
    } finally {
      if (browser) {
        await browser.close().catch(() => undefined);
      }
    }
  }
}
