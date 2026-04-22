import { Injectable } from '@nestjs/common';
import { OfferStatus, Prisma } from '@/prisma-client';

/**
 * CatalogPolicyService — единое место для “storefront-safe” правил публичной витрины.
 *
 * Важно: правила должны быть максимально стабильными и использоваться одинаково в:
 * - подборках/лендингах,
 * - SEO audit,
 * - публичных выдачах.
 */
@Injectable()
export class CatalogPolicyService {
  /**
   * Storefront-safe для события (MVP-контур для лендингов/SEO):
   * - событие активно и не удалено
   * - есть хотя бы один ACTIVE offer (не deleted)
   *
   * Примечание: publish-gate может быть строже (локация/цена/сеансы).
   * Здесь держим именно минимальный контракт “можно показывать на витрине”.
   */
  buildEventStorefrontSafeWhere(): Prisma.EventWhereInput {
    return {
      isActive: true,
      isDeleted: false,
      offers: {
        some: {
          isDeleted: false,
          status: OfferStatus.ACTIVE,
        },
      },
    };
  }

  isStorefrontSafeEventSlice(event: { isActive: boolean; isDeleted?: boolean | null }, hasActiveOffer: boolean): boolean {
    return event.isActive === true && !event.isDeleted && hasActiveOffer === true;
  }
}

