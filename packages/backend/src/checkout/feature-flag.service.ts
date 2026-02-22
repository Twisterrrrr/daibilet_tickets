/**
 * Feature Flag Service — per-city/category feature toggles.
 *
 * Используется для постепенного отключения EXTERNAL провайдеров:
 *   - "disable_external_offers" + scope=city + scopeValue=cityId
 *   - "disable_external_offers" + scope=category + scopeValue=EXCURSION
 *
 * KPI перехода:
 *   - Доля INTERNAL offers в городе > X%
 *   - Покрытие расписания своими сессиями > Y%
 *   - % продаж через PLATFORM > Z%
 */

import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

export interface FeatureFlagResult {
  enabled: boolean;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class FeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);
  /** In-memory cache with TTL */
  private cache = new Map<string, { result: FeatureFlagResult; expiresAt: number }>();
  private readonly cacheTtlMs = 60_000; // 1 minute

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Проверить feature flag.
   * Приоритет: specific scope > global.
   */
  async isEnabled(key: string, scope?: string, scopeValue?: string): Promise<FeatureFlagResult> {
    const cacheKey = `${key}:${scope || 'global'}:${scopeValue || ''}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result;
    }

    try {
      // Check specific scope first, then global
      const flags = await this.prisma.featureFlag.findMany({
        where: {
          key,
          OR: [
            // Specific scope (city/category)
            ...(scope && scopeValue ? [{ scope, scopeValue }] : []),
            // Global fallback
            { scope: 'global', scopeValue: null },
          ],
        },
        orderBy: { scope: 'desc' }, // specific scopes sort after "global"
      });

      // Specific scope wins over global
      const specificFlag = flags.find((f) => f.scope !== 'global');
      const globalFlag = flags.find((f) => f.scope === 'global');
      const flag = specificFlag || globalFlag;

      const result: FeatureFlagResult = {
        enabled: flag?.enabled ?? false,
        metadata: (flag?.metadata as Record<string, unknown>) ?? undefined,
      };

      this.cache.set(cacheKey, { result, expiresAt: Date.now() + this.cacheTtlMs });
      return result;
    } catch (error) {
      this.logger.error(`Feature flag check failed: ${(error as Error).message}`);
      return { enabled: false };
    }
  }

  /**
   * Проверить, отключены ли EXTERNAL офферы для данного города/категории.
   */
  async isExternalDisabled(cityId?: string, category?: string): Promise<boolean> {
    // Check city-level flag
    if (cityId) {
      const cityFlag = await this.isEnabled('disable_external_offers', 'city', cityId);
      if (cityFlag.enabled) return true;
    }

    // Check category-level flag
    if (category) {
      const catFlag = await this.isEnabled('disable_external_offers', 'category', category);
      if (catFlag.enabled) return true;
    }

    // Check global flag
    const globalFlag = await this.isEnabled('disable_external_offers');
    return globalFlag.enabled;
  }

  /**
   * Очистить кэш (для тестов и admin API).
   */
  clearCache(): void {
    this.cache.clear();
  }
}
