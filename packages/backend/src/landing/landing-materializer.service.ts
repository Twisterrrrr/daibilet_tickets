import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { SubcategoryPolicyService } from '../subcategories/subcategory-policy.service';
import { buildLandingEventsWhere } from './landing-event-filter.helper';
import { TOPIC_DEFINITIONS_CITY } from './topic-definition.config';

export interface MaterializeResult {
  processed: number;
  beforeVisible: number;
  visible: number;
  hidden: number;
  updated: number;
  unchanged: number;
  skipped: number;
  changedSlugs: string[];
  details: { slug: string; citySlug: string; count: number; minEvents: number; isActive: boolean }[];
}

/**
 * Materializer — автоуправление видимостью лендингов по порогу событий.
 * visible = eligible events (тег OR подкатегории из additionalFilters) >= minEvents
 *
 * @see docs/Architecture.md
 */
@Injectable()
export class LandingMaterializerService {
  private readonly logger = new Logger(LandingMaterializerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subcategoryPolicy: SubcategoryPolicyService,
  ) {}

  async materialize(): Promise<MaterializeResult> {
    const now = new Date();
    const details: MaterializeResult['details'] = [];
    const changedSlugs: string[] = [];
    let activated = 0;
    let deactivated = 0;
    let skipped = 0;
    let beforeVisible = 0;

    for (const def of TOPIC_DEFINITIONS_CITY) {
      const landing = await this.prisma.landingPage.findFirst({
        where: {
          slug: def.slug,
          city: { slug: def.citySlug },
          isDeleted: false,
        },
        select: { id: true, cityId: true, filterTag: true, additionalFilters: true, isActive: true },
      });

      if (!landing) {
        skipped++;
        continue;
      }
      if (landing.isActive) beforeVisible++;

      const tag = await this.prisma.tag.findFirst({
        where: { slug: def.filterTag, isActive: true },
        select: { id: true },
      });

      const eventsWhere = buildLandingEventsWhere({
        cityId: landing.cityId,
        now,
        tag,
        additionalFilters: landing.additionalFilters,
        subcategoryPolicy: this.subcategoryPolicy,
      });

      const count = eventsWhere
        ? await this.prisma.event.count({
            where: eventsWhere,
          })
        : 0;

      const shouldBeActive = count >= def.minEvents;
      details.push({
        slug: def.slug,
        citySlug: def.citySlug,
        count,
        minEvents: def.minEvents,
        isActive: shouldBeActive,
      });

      if (landing.isActive !== shouldBeActive) {
        await this.prisma.landingPage.update({
          where: { id: landing.id },
          data: { isActive: shouldBeActive },
        });
        if (shouldBeActive) activated++;
        else deactivated++;
        changedSlugs.push(`${def.citySlug}/${def.slug}`);
      }
    }

    const visible = details.filter((d) => d.isActive).length;
    const hidden = details.filter((d) => !d.isActive).length;
    const updated = activated + deactivated;
    const unchanged = details.length - updated;

    this.logger.log(
      `Landing materializer done: beforeVisible=${beforeVisible}, visible=${visible}, hidden=${hidden}, updated=${updated}, unchanged=${unchanged}, skipped=${skipped}`,
    );

    return {
      processed: details.length,
      beforeVisible,
      visible,
      hidden,
      updated,
      unchanged,
      skipped,
      changedSlugs,
      details,
    };
  }
}
