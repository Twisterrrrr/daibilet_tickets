import { Injectable } from '@nestjs/common';
import { SubcategoryLayer, SubcategoryType } from '@/prisma-client';

import { PrismaService } from '../prisma/prisma.service';

import { EventQualityService } from './event-quality.service';

export type PublishGateCheckCode =
  | 'LOCATION_VALID'
  | 'VENUE_VALID'
  | 'HAS_OFFERS'
  | 'HAS_FUTURE_SESSIONS'
  | 'HAS_PRICE'
  | 'CATEGORY_VALID'
  | 'SUBCATEGORY_PRIMARY_VALID'
  | 'SUBCATEGORY_SECONDARY_RECOMMENDED'
  | 'MEDIA_VALID'
  | 'VENUE_SUBCATEGORY_PRIMARY_VALID'
  | 'VENUE_SUBCATEGORY_SECONDARY_RECOMMENDED';

export type PublishGateCheck = {
  code: PublishGateCheckCode;
  status: 'OK' | 'BLOCKING' | 'WARNING';
  message: string;
};

export type PublishGateResult = {
  checks: PublishGateCheck[];
  result: 'OK' | 'WARNING' | 'BLOCKING';
};

@Injectable()
export class PublishGateService {
  constructor(
    private readonly eventQuality: EventQualityService,
    private readonly prisma: PrismaService,
  ) {}

  async validateEventForPublish(eventId: string): Promise<PublishGateResult> {
    const quality = await this.eventQuality.validateForPublish(eventId);
    const issueCodes = new Set(quality.issues.map((issue) => issue.code));
    const checks: PublishGateCheck[] = [
      this.fromIssues('LOCATION_VALID', issueCodes, ['MISSING_LOCATION'], 'Проверка локации'),
      this.fromIssues('VENUE_VALID', issueCodes, ['INVALID_VENUE'], 'Проверка площадки'),
      this.fromIssues('HAS_OFFERS', issueCodes, ['MISSING_ACTIVE_OFFER'], 'Наличие офферов'),
      this.fromIssues('HAS_FUTURE_SESSIONS', issueCodes, ['NO_FUTURE_SESSIONS'], 'Наличие будущих сеансов'),
      this.fromIssues('HAS_PRICE', issueCodes, ['NO_VALID_PRICE'], 'Наличие валидной цены'),
      this.fromIssues('CATEGORY_VALID', issueCodes, ['MISSING_CATEGORY'], 'Проверка категории'),
      this.fromIssues(
        'SUBCATEGORY_PRIMARY_VALID',
        issueCodes,
        ['MISSING_PRIMARY_SUBCATEGORY', 'TOO_MANY_SUBCATEGORIES'],
        'Основной формат подкатегории',
      ),
      this.fromIssuesWarning(
        'SUBCATEGORY_SECONDARY_RECOMMENDED',
        issueCodes,
        ['MISSING_SECONDARY_SUBCATEGORY'],
        'Дополнительные подкатегории',
      ),
      this.fromIssues('MEDIA_VALID', issueCodes, ['MISSING_IMAGE'], 'Проверка медиа'),
    ];

    const hasBlocking = checks.some((check) => check.status === 'BLOCKING');
    const hasWarning = checks.some((check) => check.status === 'WARNING');
    return { checks, result: hasBlocking ? 'BLOCKING' : hasWarning ? 'WARNING' : 'OK' };
  }

  async validateVenueForPublish(venueId: string): Promise<PublishGateResult> {
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId },
      include: {
        subcategoryLinks: {
          where: { subcategory: { isActive: true } },
          include: { subcategory: { select: { layer: true, type: true } } },
        },
      },
    });

    if (!venue) {
      return {
        checks: [
          {
            code: 'VENUE_SUBCATEGORY_PRIMARY_VALID',
            status: 'BLOCKING',
            message: 'Площадка не найдена',
          },
        ],
        result: 'BLOCKING',
      };
    }

    const links = venue.subcategoryLinks;
    const primary = links.filter(
      (l) =>
        l.subcategory.layer === SubcategoryLayer.PRIMARY &&
        l.subcategory.type === SubcategoryType.VENUE_ONLY,
    );
    const secondaries = links.filter((l) => l.subcategory.layer === SubcategoryLayer.SECONDARY);

    const checks: PublishGateCheck[] = [
      {
        code: 'VENUE_SUBCATEGORY_PRIMARY_VALID',
        status: primary.length === 1 ? 'OK' : 'BLOCKING',
        message:
          primary.length === 1
            ? 'Основной формат площадки задан'
            : 'Назначьте ровно один PRIMARY (VENUE_ONLY) для площадки',
      },
      {
        code: 'VENUE_SUBCATEGORY_SECONDARY_RECOMMENDED',
        status: secondaries.length > 0 ? 'OK' : 'WARNING',
        message:
          secondaries.length > 0
            ? 'Дополнительные подкатегории заданы'
            : 'Рекомендуется добавить до 3 SECONDARY для витрины',
      },
    ];

    const hasBlocking = checks.some((c) => c.status === 'BLOCKING');
    const hasWarning = checks.some((c) => c.status === 'WARNING');
    return { checks, result: hasBlocking ? 'BLOCKING' : hasWarning ? 'WARNING' : 'OK' };
  }

  private fromIssues(
    code: PublishGateCheckCode,
    issues: Set<string>,
    blockers: string[],
    message: string,
  ): PublishGateCheck {
    return { code, status: blockers.some((blocker) => issues.has(blocker)) ? 'BLOCKING' : 'OK', message };
  }

  private fromIssuesWarning(
    code: PublishGateCheckCode,
    issues: Set<string>,
    warners: string[],
    message: string,
  ): PublishGateCheck {
    return { code, status: warners.some((w) => issues.has(w)) ? 'WARNING' : 'OK', message };
  }
}
