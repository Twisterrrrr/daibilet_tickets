import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { SupplierTrustService } from './supplier-trust.service';

export type SupplierNotificationType = 'order' | 'moderation' | 'limit' | 'system';

export interface SupplierNotificationItem {
  id: string;
  type: SupplierNotificationType;
  title: string;
  message: string;
  link?: string;
  linkLabel?: string;
  isRead: boolean;
  createdAt: string;
}

const DAYS_AGO = 30;

@Injectable()
export class SupplierNotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trustService: SupplierTrustService,
  ) {}

  async list(operatorId: string, limitRaw?: number): Promise<SupplierNotificationItem[]> {
    const limit = Math.min(Number(limitRaw) || 50, 100);
    const since = new Date(Date.now() - DAYS_AGO * 24 * 60 * 60 * 1000);

    const [moderationEvents, sales, operator] = await Promise.all([
      this.prisma.event.findMany({
        where: {
          OR: [{ operatorId }, { supplierId: operatorId }],
          moderatedAt: { gte: since },
          moderationStatus: { in: ['APPROVED', 'REJECTED'] },
        },
        select: {
          id: true,
          title: true,
          moderationStatus: true,
          moderationNote: true,
          moderatedAt: true,
        },
        orderBy: { moderatedAt: 'desc' },
        take: limit,
      }),
      this.prisma.paymentIntent.findMany({
        where: {
          supplierId: operatorId,
          status: 'PAID',
          paidAt: { gte: since },
        },
        select: {
          id: true,
          grossAmount: true,
          supplierAmount: true,
          paidAt: true,
          checkoutSession: { select: { shortCode: true, offersSnapshot: true } },
        },
        orderBy: { paidAt: 'desc' },
        take: limit,
      }),
      this.prisma.operator.findUnique({
        where: { id: operatorId },
        select: { trustLevel: true },
      }),
    ]);

    const items: SupplierNotificationItem[] = [];

    for (const e of moderationEvents) {
      if (!e.moderatedAt) continue;
      const approved = e.moderationStatus === 'APPROVED';
      items.push({
        id: `mod-${e.id}`,
        type: 'moderation',
        title: approved ? 'Событие одобрено' : 'Событие отклонено',
        message: approved
          ? `«${e.title}» прошло модерацию и опубликовано в каталоге.`
          : `«${e.title}» — ${e.moderationNote || 'требуются правки'}.`,
        link: '/events',
        linkLabel: approved ? 'Мои события' : 'Исправить',
        isRead: false,
        createdAt: e.moderatedAt.toISOString(),
      });
    }

    for (const p of sales) {
      if (!p.paidAt) continue;
      const snapshot = p.checkoutSession?.offersSnapshot as Array<{ title?: string }> | undefined;
      const firstTitle = snapshot?.[0]?.title ?? 'Заказ';
      const amount = (p.supplierAmount ?? p.grossAmount ?? 0) / 100;
      const code = (p.checkoutSession as { shortCode?: string })?.shortCode ?? p.id.slice(0, 8);
      items.push({
        id: `order-${p.id}`,
        type: 'order',
        title: `Новый заказ ${code}`,
        message: `${firstTitle} · ${amount.toLocaleString('ru-RU')} ₽`,
        link: '/reports',
        linkLabel: 'Отчёты',
        isRead: false,
        createdAt: p.paidAt.toISOString(),
      });
    }

    if (operator) {
      const activeCount = await this.trustService.getActiveEventsCount(operatorId);
      const limitVal = this.trustService.getActiveEventsLimitByTrustLevel(operator.trustLevel ?? 0);
      if (limitVal > 0 && activeCount >= Math.ceil(limitVal * 0.8)) {
        items.push({
          id: 'limit-warning',
          type: 'limit',
          title: 'Приближение к лимиту событий',
          message: `Вы использовали ${activeCount} из ${limitVal} слотов. Повысьте уровень доверия для увеличения лимита.`,
          link: '/settings',
          linkLabel: 'Настройки',
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
    }

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return items.slice(0, limit);
  }
}
