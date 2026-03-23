import { Injectable } from '@nestjs/common';

type TagRouteKind = 'STRUCTURAL' | 'POPULAR';

@Injectable()
export class TagSeoRoutingService {
  private sanitizeSlugPart(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Canonical SEO route builder for tag-based landing pages.
   * structural tags -> taxonomy routes, popular tags -> demand routes.
   */
  buildTagLandingPath(citySlug: string, tagSlug: string, kind: TagRouteKind): string {
    const city = this.sanitizeSlugPart(citySlug);
    const tag = this.sanitizeSlugPart(tagSlug);
    if (!city || !tag) return '';

    // Keep human-readable semantic suffix for structural routes.
    if (kind === 'STRUCTURAL') return `/${city}/${tag}-excursions`;
    return `/${city}/${tag}`;
  }

  buildSeoSafeMeta(input: {
    cityNameRu: string;
    tagNameRu: string;
    kind: TagRouteKind;
  }): { title: string; description: string } {
    const city = input.cityNameRu.trim();
    const tag = input.tagNameRu.trim();
    if (input.kind === 'STRUCTURAL') {
      return {
        title: `${tag} экскурсии в ${city} - билеты и расписание`,
        description: `Подборка событий по теме «${tag}» в ${city}: актуальные цены, расписание и быстрый выбор.`,
      };
    }
    return {
      title: `${tag} в ${city} - события и билеты`,
      description: `Популярные события по запросу «${tag}» в ${city}: билеты онлайн, даты и удобные фильтры.`,
    };
  }
}

