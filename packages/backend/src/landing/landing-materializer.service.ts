import { Injectable, Logger } from '@nestjs/common';
import { DateMode } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { TOPIC_DEFINITIONS_CITY } from './topic-definition.config';

export interface MaterializeResult {
  processed: number;
  activated: number;
  deactivated: number;
  skipped: number;
  details: { slug: string; citySlug: string; count: number; minEvents: number; isActive: boolean }[];
}

/**
 * Materializer — автоуправление видимостью лендингов по порогу событий.
 * visible = events(city, filterTag) >= minEvents
 *
 * @see docs/TopicDefinitionMatrix.md
 */
@Injectable()
export class LandingMaterializerService {
  private readonly logger = new Logger(LandingMaterializerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async materialize(): Promise<MaterializeResult> {
    const now = new Date();
    const details: MaterializeResult['details'] = [];
    let activated = 0;
    let deactivated = 0;
    let skipped = 0;

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
      }
    }

    this.logger.log(
      `Materialize: ${details.length} topics, activated=${activated}, deactivated=${deactivated}, skipped=${skipped}`,
    );

    return {
      processed: details.length,
      activated,
      deactivated,
      skipped,
      details,
    };
  }
}
