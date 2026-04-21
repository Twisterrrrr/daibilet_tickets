import { BadRequestException, Injectable } from '@nestjs/common';
import { EventSubcategory, Prisma, SubcategoryType } from '@/prisma-client';

const LEGACY_EVENT_SUBCATEGORY_TO_SLUG: Partial<Record<EventSubcategory, string>> = {
  RIVER: 'river-excursion',
  WALKING: 'walking-excursion',
  BUS: 'bus-excursion',
  COMBINED: 'combined-excursion',
  QUEST: 'quest-excursion',
  GASTRO: 'gastro-excursion',
  ROOFTOP: 'rooftop',
  EXTREME: 'extreme',
  MUSEUM_CLASSIC: 'museum',
  EXHIBITION: 'exhibition',
  GALLERY: 'gallery',
  PALACE: 'palace-estate',
  PARK: 'park-reserve',
  ART_SPACE: 'art-space',
  CONCERT: 'concert',
  JAZZ: 'jazz',
  SHOW: 'show',
  STANDUP: 'standup',
  THEATER: 'theater',
  SPORT: 'sport',
  FESTIVAL: 'festival',
  MASTERCLASS: 'masterclass',
  PARTY: 'party',
};

const LEGACY_SLUG_TO_EVENT_SUBCODE: Record<string, string> = Object.fromEntries(
  Object.entries(LEGACY_EVENT_SUBCATEGORY_TO_SLUG).map(([enumVal, slug]) => [slug, enumVal]),
);

@Injectable()
export class SubcategoryPolicyService {
  /**
   * Технический потолок числа связей на событие (защита от ошибок/злоупотреблений в одном запросе).
   * Не продуктовое «N подкатегорий»: в модели есть PRIMARY под выбранную категорию и отдельно общие SECONDARY (UNIVERSAL и др.).
   */
  static readonly MAX_EVENT_SUBCATEGORIES = 512;
  static readonly MAX_VENUE_SUBCATEGORIES = 4;

  /**
   * Фильтр площадок по подкатегории (links-only; legacy у Venue нет).
   * Токен — code или legacy slug из URL или enum EventSubcategory.
   */
  buildVenueSubcategoryFilter(value: string): Prisma.VenueWhereInput {
    const token = value.trim();
    if (!token) return {};

    const asLegacyEnum = Object.values(EventSubcategory).includes(token as EventSubcategory);
    const code = asLegacyEnum ? token : (LEGACY_SLUG_TO_EVENT_SUBCODE[token] ?? token);

    return {
      subcategoryLinks: {
        some: {
          subcategory: {
            isActive: true,
            OR: [{ code }, { slug: token }],
          },
        },
      },
    };
  }

  buildEventSubcategoryFilter(value: string): Prisma.EventWhereInput {
    const token = value.trim();
    if (!token) return {};

    // source of truth = new links (по code); legacy enum / slug — только fallback.
    const asLegacyEnum = Object.values(EventSubcategory).includes(token as EventSubcategory);
    const code = asLegacyEnum ? token : (LEGACY_SLUG_TO_EVENT_SUBCODE[token] ?? token);

    return {
      OR: [
        {
          subcategoryLinks: {
            some: {
              subcategory: {
                OR: [{ code }, { slug: token }],
              },
            },
          },
        },
        ...(asLegacyEnum
          ? [
              {
                AND: [
                  { subcategoryLinks: { none: {} } },
                  { subcategories: { has: token as EventSubcategory } },
                ],
              },
            ]
          : []),
      ],
    };
  }

  assertEventLimit(count: number) {
    if (count > SubcategoryPolicyService.MAX_EVENT_SUBCATEGORIES) {
      throw new BadRequestException(
        `Можно выбрать не более ${SubcategoryPolicyService.MAX_EVENT_SUBCATEGORIES} подкатегорий для события`,
      );
    }
  }

  assertVenueLimit(count: number) {
    if (count > SubcategoryPolicyService.MAX_VENUE_SUBCATEGORIES) {
      throw new BadRequestException(
        `Можно выбрать не более ${SubcategoryPolicyService.MAX_VENUE_SUBCATEGORIES} подкатегорий для площадки`,
      );
    }
  }

  assertParentTypeCompatibility(childType: SubcategoryType, parentType: SubcategoryType) {
    if (parentType === SubcategoryType.UNIVERSAL) return;
    if (parentType !== childType) {
      throw new BadRequestException(
        'EVENT_ONLY и VENUE_ONLY нельзя смешивать под одним специализированным родителем',
      );
    }
  }

  assertDepth(parentHasParent: boolean) {
    if (parentHasParent) {
      throw new BadRequestException('Максимальная глубина дерева подкатегорий: root + child');
    }
  }
}

