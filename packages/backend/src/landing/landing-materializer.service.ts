import { Injectable, Logger } from '@nestjs/common';
import { DateMode } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
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
 * visible = events(city, filterTag) >= minEvents
 *
 * @see docs/Architecture.md
 */
@Injectable()
export class LandingMaterializerService {
  private readonly logger = new Logger(LandingMaterializerService.name);

  constructor(private readonly prisma: PrismaService) {}

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
        select: { id: true, cityId: true, filterTag: true, isActive: true },
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

      let count = 0;
      if (tag) {
        count = await this.prisma.event.count({
          where: {
            isActive: true,
            isDeleted: false,
            cityId: landing.cityId,
            tags: { some: { tagId: tag.id } },
            OR: [
              {
                dateMode: DateMode.SCHEDULED,
                sessions: { some: { isActive: true, startsAt: { gte: now } } },
              },
              {
                dateMode: DateMode.OPEN_DATE,
                OR: [{ endDate: null }, { endDate: { gte: now } }],
              },
            ],
          },
        });
      }

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
