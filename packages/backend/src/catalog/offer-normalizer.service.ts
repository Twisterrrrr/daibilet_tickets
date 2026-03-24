import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

/** Рекомендация по нормализации оффера (priceFrom). */
export interface OfferNormalizeSuggest {
  offerId: string;
  priceFrom?: number;
}

/**
 * Нормализатор офферов: обеспечение priceFrom из внешних данных.
 * Возвращает предложения, не изменяет данные.
 */
@Injectable()
export class OfferNormalizerService {
  constructor(private readonly prisma: PrismaService) {}

  async suggest(eventId: string): Promise<OfferNormalizeSuggest[]> {
    const offers = await this.prisma.eventOffer.findMany({
      where: { eventId, isDeleted: false, status: 'ACTIVE' },
      select: { id: true, priceFrom: true, externalData: true, widgetPayload: true },
    });

    const result: OfferNormalizeSuggest[] = [];
    for (const o of offers) {
      if (o.priceFrom != null && o.priceFrom > 0) continue;

      let suggested: number | undefined;
      const ext = o.externalData as Record<string, unknown> | null;
      const wgt = o.widgetPayload as Record<string, unknown> | null;

      if (ext?.priceFrom != null && typeof ext.priceFrom === 'number') {
        suggested = ext.priceFrom;
      } else if (ext?.minPrice != null && typeof ext.minPrice === 'number') {
        suggested = ext.minPrice;
      } else if (wgt?.minPrice != null && typeof wgt.minPrice === 'number') {
        suggested = wgt.minPrice;
      }

      if (suggested != null && suggested > 0) {
        result.push({ offerId: o.id, priceFrom: suggested });
      }
    }
    return result;
  }
}
