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

function isWithinSeasonWindow(now: Date, payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return true;
  const p = payload as { seasonWindow?: { startMonthDay?: string; endMonthDay?: string } };
  const win = p.seasonWindow;
  if (!win || typeof win.startMonthDay !== 'string' || typeof win.endMonthDay !== 'string') return true;

  const parse = (mmdd: string): number | null => {
    const [mmStr, ddStr] = mmdd.split('-');
    const mm = Number(mmStr);
    const dd = Number(ddStr);
    if (!Number.isFinite(mm) || !Number.isFinite(dd)) return null;
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
    return mm * 100 + dd;
  };

  const start = parse(win.startMonthDay);
  const end = parse(win.endMonthDay);
  if (start === null || end === null) return true;

  const cur = (now.getUTCMonth() + 1) * 100 + now.getUTCDate();

  if (start <= end) {
    return cur >= start && cur <= end;
  }
  // Окно через границу года (например, 12-01 — 01-10)
  return cur >= start || cur <= end;
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
        select: {
          id: true,
          cityId: true,
          filterTag: true,
          additionalFilters: true,
          isActive: true,
          seasonalPayload: true,
        },
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
        cityId: landing.cityId!,
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

      const seasonOk = isWithinSeasonWindow(now, landing.seasonalPayload as unknown);
      const shouldBeActive = count >= def.minEvents && seasonOk;
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
