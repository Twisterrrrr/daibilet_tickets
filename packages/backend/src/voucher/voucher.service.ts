import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as QRCode from 'qrcode';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VoucherService {
  private readonly appUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    // В production APP_URL обязателен, в dev используем localhost по умолчанию
    this.appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
  }

  /**
   * Сгенерировать PDF ваучера с QR-кодом.
   */
  async generatePdf(shortCode: string): Promise<Buffer> {
    const voucher = await this.getByShortCode(shortCode);
    const url = voucher.publicUrl || `${this.appUrl}/v/${shortCode}`;

    const qrDataUrl = await QRCode.toDataURL(url, { width: 180, margin: 2 });
    const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
    const qrPngBytes = Buffer.from(qrBase64, 'base64');

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([400, 500]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const { width, height } = page.getSize();

    page.drawText('Ваучер Дайбилет', {
      x: 50,
      y: height - 50,
      size: 18,
      font: fontBold,
      color: rgb(0.1, 0.2, 0.5),
    });

    page.drawText(`Код: ${shortCode}`, {
      x: 50,
      y: height - 80,
      size: 12,
      font: font,
      color: rgb(0.2, 0.2, 0.2),
    });

    const qrImage = await pdfDoc.embedPng(qrPngBytes);
    page.drawImage(qrImage, { x: 110, y: height - 300, width: 180, height: 180 });

    page.drawText('Отсканируйте QR-код для просмотра', {
      x: 80,
      y: height - 320,
      size: 10,
      font: font,
      color: rgb(0.4, 0.4, 0.4),
    });

    const packageData = voucher.package as { city?: { name?: string }; items?: unknown[] };
    const cityName = packageData?.city?.name || '—';
    const itemsCount = Array.isArray(packageData?.items) ? packageData.items.length : 0;
    page.drawText(`Город: ${cityName} | Позиций: ${itemsCount}`, {
      x: 50,
      y: 80,
      size: 10,
      font: font,
      color: rgb(0.3, 0.3, 0.3),
    });

    page.drawText(url, {
      x: 50,
      y: 60,
      size: 8,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  async getByShortCode(shortCode: string) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { shortCode },
      include: {
        package: {
          include: {
            city: true,
            items: {
              include: {
                event: true,
                session: true,
              },
              orderBy: [{ dayNumber: 'asc' }, { slotTime: 'asc' }],
            },
          },
        },
      },
    });

    if (!voucher) throw new NotFoundException('Ваучер не найден');

    return voucher;
  }

  /**
   * Создать ваучер для оплаченного пакета.
   * Вызывается из CheckoutService после успешного fulfillment.
   */
  async createForPackage(packageId: string) {
    const shortCode = this.generateShortCode();

    const voucher = await this.prisma.voucher.create({
      data: {
        packageId,
        shortCode,
        publicUrl: `${this.appUrl}/v/${shortCode}`,
      },
    });

    return voucher;
  }

  private generateShortCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // без I, O, 0, 1 для читаемости
    let code = 'V-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}
