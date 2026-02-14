import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TagCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const DYNAMIC_TAG_SLUGS = ['best-value', 'last-minute', 'today-available'] as const;

const TAG_DEFINITIONS = [
  { slug: 'best-value', name: 'Лучшая цена', category: TagCategory.SPECIAL },
  { slug: 'last-minute', name: 'Последний шанс', category: TagCategory.SPECIAL },
  { slug: 'today-available', name: 'Доступно сегодня', category: TagCategory.SPECIAL },
] as const;

@Injectable()
export class TagAssignmentService implements OnModuleInit {
  private readonly logger = new Logger(TagAssignmentService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ensure dynamic tags exist on startup.
   */
  async onModuleInit() {
    await this.ensureTagsExist();
    this.logger.log('Dynamic tags verified/created');
  }

  /**
   * Cron: 04:30 daily — after dedup (03:00), before morning traffic.
   * Полностью пересчитывает динамические теги.
   */
  @Cron('0 30 4 * * *', { name: 'dynamic-tag-assignment' })
  async handleDynamicTags() {
    this.logger.log('Starting dynamic tag assignment...');
    try {
      await this.ensureTagsExist();
      await this.clearDynamicTags();

      const [bestValue, lastMinute, todayAvailable] = await Promise.all([
        this.assignBestValue(),
        this.assignLastMinute(),
        this.assignTodayAvailable(),
      ]);

      this.logger.log(
        `Dynamic tags assigned: best-value=${bestValue}, last-minute=${lastMinute}, today-available=${todayAvailable}`,
      );
    } catch (error) {
      this.logger.error('Dynamic tag assignment failed: ' + (error as Error).message);
    }
  }

  /**
   * Upsert all dynamic tag definitions so they always exist.
   */
  private async ensureTagsExist() {
    for (const def of TAG_DEFINITIONS) {
      await this.prisma.tag.upsert({
        where: { slug: def.slug },
        create: {
          slug: def.slug,
          name: def.name,
          category: def.category,
          isActive: true,
        },
        update: {},
      });
    }
  }

  /**
   * Remove all event_tags for dynamic tags (full recalculation approach).
   */
  private async clearDynamicTags() {
    const tags = await this.prisma.tag.findMany({
      where: { slug: { in: [...DYNAMIC_TAG_SLUGS] } },
      select: { id: true },
    });
    const tagIds = tags.map((t) => t.id);

    if (tagIds.length > 0) {
      await this.prisma.eventTag.deleteMany({
        where: { tagId: { in: tagIds } },
      });
    }
  }

  /**
   * best-value: priceFrom в нижнем 25% квартиле для города + rating >= 4.0.
   * Только активные события с активными сеансами в будущем (SCHEDULED)
   * или действующие open-date события.
   */
  private async assignBestValue(): Promise<number> {
    const tag = await this.prisma.tag.findUnique({ where: { slug: 'best-value' } });
    if (!tag) return 0;

    const candidates = await this.prisma.$queryRaw<{ eventId: string }[]>`
      WITH city_quartiles AS (
        SELECT "cityId",
               PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY "priceFrom") AS q25
        FROM events
        WHERE "isActive" = true AND "priceFrom" > 0
        GROUP BY "cityId"
      )
      SELECT e.id AS "eventId"
      FROM events e
      JOIN city_quartiles cq ON e."cityId" = cq."cityId"
      WHERE e."isActive" = true
        AND e."priceFrom" <= cq.q25
        AND e."priceFrom" > 0
        AND e.rating >= 4.0
        AND (
          (e."dateMode" = 'SCHEDULED' AND EXISTS(
            SELECT 1 FROM event_sessions s
            WHERE s."eventId" = e.id AND s."isActive" = true AND s."startsAt" > NOW()
          ))
          OR
          (e."dateMode" = 'OPEN_DATE' AND (e."endDate" IS NULL OR e."endDate" > NOW()))
        )
    `;

    if (candidates.length > 0) {
      await this.batchInsertTags(
        candidates.map((c) => c.eventId),
        tag.id,
      );
    }
    return candidates.length;
  }

  /**
   * last-minute: сеанс в ближайшие 48 часов + availableTickets > 0.
   */
  private async assignLastMinute(): Promise<number> {
    const tag = await this.prisma.tag.findUnique({ where: { slug: 'last-minute' } });
    if (!tag) return 0;

    const candidates = await this.prisma.$queryRaw<{ eventId: string }[]>`
      SELECT DISTINCT e.id AS "eventId"
      FROM events e
      JOIN event_sessions s ON s."eventId" = e.id
      WHERE e."isActive" = true
        AND e."dateMode" = 'SCHEDULED'
        AND s."isActive" = true
        AND s."startsAt" > NOW()
        AND s."startsAt" < NOW() + INTERVAL '48 hours'
        AND s."availableTickets" > 0
    `;

    if (candidates.length > 0) {
      await this.batchInsertTags(
        candidates.map((c) => c.eventId),
        tag.id,
      );
    }
    return candidates.length;
  }

  /**
   * today-available: сеанс сегодня + места есть.
   */
  private async assignTodayAvailable(): Promise<number> {
    const tag = await this.prisma.tag.findUnique({ where: { slug: 'today-available' } });
    if (!tag) return 0;

    const candidates = await this.prisma.$queryRaw<{ eventId: string }[]>`
      SELECT DISTINCT e.id AS "eventId"
      FROM events e
      JOIN event_sessions s ON s."eventId" = e.id
      WHERE e."isActive" = true
        AND e."dateMode" = 'SCHEDULED'
        AND s."isActive" = true
        AND s."startsAt" > NOW()
        AND s."startsAt" < (CURRENT_DATE + INTERVAL '1 day')
        AND s."availableTickets" > 0
    `;

    if (candidates.length > 0) {
      await this.batchInsertTags(
        candidates.map((c) => c.eventId),
        tag.id,
      );
    }
    return candidates.length;
  }

  /**
   * Batch insert event_tags with ON CONFLICT DO NOTHING via Prisma createMany.
   */
  private async batchInsertTags(eventIds: string[], tagId: string): Promise<void> {
    if (eventIds.length === 0) return;

    const data = eventIds.map((eventId) => ({ eventId, tagId }));
    await this.prisma.eventTag.createMany({
      data,
      skipDuplicates: true,
    });
  }

  /**
   * Manual trigger for admin — returns counts per tag.
   */
  async runManually(): Promise<{
    bestValue: number;
    lastMinute: number;
    todayAvailable: number;
  }> {
    await this.ensureTagsExist();
    await this.clearDynamicTags();

    const [bestValue, lastMinute, todayAvailable] = await Promise.all([
      this.assignBestValue(),
      this.assignLastMinute(),
      this.assignTodayAvailable(),
    ]);

    return { bestValue, lastMinute, todayAvailable };
  }
}
