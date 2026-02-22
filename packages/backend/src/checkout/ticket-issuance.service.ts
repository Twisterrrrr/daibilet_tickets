/**
 * TicketIssuanceService — создание TicketIssued при PAID.
 * R6: when package PAID, create TicketIssued records.
 */
import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TicketIssuanceService {
  private readonly logger = new Logger(TicketIssuanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async issueForPackage(packageId: string): Promise<number> {
    const pkg = await this.prisma.checkoutPackage.findUnique({
      where: { id: packageId },
      include: {
        items: {
          include: {
            offer: { include: { event: true, operator: true } },
            session: true,
          },
        },
      },
    });

    if (!pkg) {
      this.logger.warn(`[package=${packageId}] Package not found`);
      return 0;
    }

    if (pkg.status !== 'PAID') {
      this.logger.warn(`[package=${packageId}] Package status is ${pkg.status}, expected PAID`);
      return 0;
    }

    const existing = await this.prisma.ticketIssued.count({
      where: { packageId },
    });
    if (existing > 0) {
      this.logger.debug(`[package=${packageId}] Tickets already issued (${existing})`);
      return existing;
    }

    let created = 0;
    for (const item of pkg.items) {
      const snap = item.itemSnapshot as {
        totalKopecks?: number;
        basePrice?: number;
        categoryId?: string;
      };
      const pricePerTicket = (snap?.basePrice ?? snap?.totalKopecks ?? 0) / Math.max(1, item.qty);
      const categoryId = snap?.categoryId ?? null;
      const category = categoryId
        ? await this.prisma.tariffCategory.findUnique({
            where: { id: categoryId },
            select: { code: true, title: true },
          })
        : null;

      for (let i = 0; i < item.qty; i++) {
        const voucherCode = this.generateVoucherCode();
        await this.prisma.ticketIssued.create({
          data: {
            packageId,
            paymentId: pkg.paymentId ?? undefined,
            offerId: item.offerId,
            sessionId: item.sessionId,
            openDate: item.openDate,
            categoryId: categoryId ?? undefined,
            categoryCode: category?.code ?? undefined,
            categoryTitle: category?.title ?? undefined,
            operatorId: item.offer.operatorId ?? undefined,
            supplierId: item.offer.event?.supplierId ?? undefined,
            currency: 'RUB',
            grossCents: Math.round(pricePerTicket),
            commissionCents: 0,
            paymentFeeCents: 0,
            providerPayableCents: Math.round(pricePerTicket),
            voucherCode,
            qrPayload: voucherCode,
            status: 'ISSUED',
          },
        });
        created++;
      }

      if (item.sessionId && categoryId) {
        await this.prisma.ticketSalesCounter.upsert({
          where: {
            sessionId_categoryId: { sessionId: item.sessionId, categoryId },
          },
          create: {
            sessionId: item.sessionId,
            categoryId,
            soldQty: item.qty,
          },
          update: { soldQty: { increment: item.qty } },
        });
      }
    }

    this.logger.log(`[package=${packageId}] Issued ${created} tickets`);
    return created;
  }

  private generateVoucherCode(): string {
    const bytes = randomBytes(8);
    const hex = bytes.toString('hex').toUpperCase();
    return `V-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
  }
}
