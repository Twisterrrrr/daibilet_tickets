import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { cacheKeys, CacheService } from './cache.service';

/**
 * Централизованный сервис инвалидации кэша.
 *
 * Инвалидация при:
 * - override update (админ изменил данные события)
 * - event update (venue, priceFrom и т.д.)
 * - reclassification (массовая переклассификация)
 *
 * Паттерны ключей:
 * - cities:list:*, cities:detail:{slug}
 * - events:detail:{slug}
 * - search:*
 * - regions:preview:hub:*, regions:detail:{slug}
 * - landings:*, combos:*, tags:*
 */

@Injectable()
export class CacheInvalidationService {
  private readonly logger = new Logger(CacheInvalidationService.name);

  constructor(
    private readonly cache: CacheService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Инвалидировать кэш для конкретного события по slug.
   * Удаляет events:detail:{slug}, search, catalog:list (списки могут включать это событие).
   */
  async invalidateEvent(slug: string): Promise<void> {
    await this.cache.del(cacheKeys.events.detail(slug));
    await this.cache.delByPrefix('search:');
    await this.cache.delByPrefix('catalog:');
    this.logger.debug(`Invalidated cache for event slug=${slug}`);
  }

  /**
   * Инвалидировать кэш для события по eventId (берёт slug из БД).
   */
  async invalidateEventById(eventId: string): Promise<void> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { slug: true },
    });
    if (event?.slug) {
      await this.invalidateEvent(event.slug);
    }
  }

  /**
   * Инвалидировать при изменении override (title, category, isHidden и т.д.).
   */
  async invalidateOverride(eventId: string): Promise<void> {
    await this.invalidateEventById(eventId);
  }

  /**
   * Инвалидировать при обновлении города (regions, city detail).
   */
  async invalidateCity(citySlug?: string): Promise<void> {
    if (citySlug) {
      await this.cache.del(cacheKeys.cities.detail(citySlug));
    }
    await this.cache.delByPrefix('cities:');
    await this.cache.delByPrefix('regions:');
  }

  /**
   * Инвалидировать при изменении региона.
   */
  async invalidateRegions(): Promise<void> {
    await this.cache.delByPrefix('regions:');
  }

  /**
   * Полная инвалидация (после sync, reclassification).
   */
  async invalidateFull(): Promise<void> {
    await Promise.all([
      this.cache.delByPrefix('cities:'),
      this.cache.delByPrefix('events:'),
      this.cache.delByPrefix('tags:'),
      this.cache.delByPrefix('regions:'),
      this.cache.delByPrefix('landings:'),
      this.cache.delByPrefix('combos:'),
      this.cache.delByPrefix('search:'),
    ]);
    this.logger.log('Cache fully invalidated');
  }
}
