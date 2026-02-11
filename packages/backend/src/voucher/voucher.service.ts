import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VoucherService {
  constructor(private readonly prisma: PrismaService) {}

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
        publicUrl: `${process.env.APP_URL || 'https://daibilet.ru'}/v/${shortCode}`,
      },
    });

    // TODO: Генерация QR-кода и PDF

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
