import { BadRequestException, Injectable } from '@nestjs/common';
import { EventSubcategory, Prisma, SubcategoryType } from '@prisma/client';

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
  SHOW: 'show',
  STANDUP: 'standup',
  THEATER: 'theater',
  SPORT: 'sport',
  FESTIVAL: 'festival',
  MASTERCLASS: 'masterclass',
  PARTY: 'party',
};

@Injectable()
export class SubcategoryPolicyService {
  static readonly MAX_EVENT_SUBCATEGORIES = 5;
  static readonly MAX_VENUE_SUBCATEGORIES = 5;

  buildEventSubcategoryFilter(value: string): Prisma.EventWhereInput {
    const token = value.trim();
    if (!token) return {};

    // source of truth = new links; legacy enum only fallback for not-yet-migrated events.
    const asLegacy = Object.values(EventSubcategory).includes(token as EventSubcategory);
    const mappedSlug = asLegacy
      ? LEGACY_EVENT_SUBCATEGORY_TO_SLUG[token as EventSubcategory] ?? token.toLowerCase()
      : token;

    return {
      OR: [
        { subcategoryLinks: { some: { subcategory: { slug: mappedSlug } } } },
        ...(asLegacy
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

