import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
