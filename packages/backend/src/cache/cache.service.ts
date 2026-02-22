import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Redis Cache Service.
 * D1: get/set/del + delByPrefix, keys через cacheKeys.
 *
 * Стратегия:
 * - Города: TTL 1 час (редко меняются)
 * - Список событий: TTL 5 мин (часто обновляются)
 * - Карточка события: TTL 10 мин
 * - Лендинги: TTL 30 мин
 * - Combo: TTL 30 мин
 * - После sync → инвалидация по паттерну
 */

export { cacheKeys } from './cache-keys';

/** D3: TTL в секундах. Читает env: CACHE_TTL_DETAIL (1–6h), CACHE_TTL_LIST (5–10m). */
function parseTtlEnv(key: string, fallbackSec: number): number {
  const raw = process.env[key];
  if (raw == null || raw === '') return fallbackSec;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallbackSec;
}

export const CACHE_TTL = {
  CITIES: parseTtlEnv('CACHE_TTL_CITIES', 3600), // 1 час
  CITY_DETAIL: parseTtlEnv('CACHE_TTL_DETAIL', 3600), // detail 1–6h, default 1h
  EVENT_LIST: parseTtlEnv('CACHE_TTL_LIST', 300), // list 5–10m, default 5m
  EVENT_DETAIL: parseTtlEnv('CACHE_TTL_DETAIL', 3600), // detail 1–6h
  TAGS: parseTtlEnv('CACHE_TTL_TAGS', 3600), // 1 час
  LANDINGS: parseTtlEnv('CACHE_TTL_LANDINGS', 1800), // 30 мин
  COMBOS: parseTtlEnv('CACHE_TTL_COMBOS', 1800), // 30 мин
  SEARCH: parseTtlEnv('CACHE_TTL_SEARCH', 300), // list 5–10m
} as const;

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private client: Redis | null = null;
  private enabled = false;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.config.get<string>('REDIS_URL', 'redis://localhost:6379');
    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) {
            this.logger.warn('Redis недоступен — кэш отключён');
            return null; // прекратить попытки
          }
          return Math.min(times * 200, 2000);
        },
        lazyConnect: true,
      });

      this.client.on('error', (err) => {
        if (this.enabled) {
          this.logger.warn(`Redis ошибка: ${err.message}`);
          this.enabled = false;
        }
      });

      this.client.on('connect', () => {
        this.enabled = true;
        this.logger.log('Redis подключён — кэш активен');
      });

      await this.client.connect();
    } catch (err: unknown) {
      this.logger.warn(`Redis не подключён (${err instanceof Error ? err.message : String(err)}) — работаем без кэша`);
      this.client = null;
      this.enabled = false;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  // ==========================================
  // Основные методы
  // ==========================================

  /**
   * Получить из кэша. null если нет или Redis отключён.
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled || !this.client) return null;
    try {
      const data = await this.client.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  /**
   * Записать в кэш.
   */
  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!this.enabled || !this.client) return;
    try {
      await this.client.setex(key, ttlSeconds, JSON.stringify(value));
    } catch {
      // Ignore — кэш не критичен
    }
  }

  /**
   * Удалить ключ.
   */
  async del(key: string): Promise<void> {
    if (!this.enabled || !this.client) return;
    try {
      await this.client.del(key);
    } catch {
      // Ignore
    }
  }

  /**
   * Удалить ключи по префиксу (D1). Redis SCAN + DEL.
   */
  async delByPrefix(prefix: string): Promise<number> {
    const pattern = prefix.endsWith('*') ? prefix : `${prefix}*`;
    return this.invalidatePattern(pattern);
  }

  /**
   * Инвалидация по паттерну (SCAN + DEL, безопасно для продакшена).
   */
  async invalidatePattern(pattern: string): Promise<number> {
    if (!this.enabled || !this.client) return 0;
    let deleted = 0;
    try {
      const stream = this.client.scanStream({ match: pattern, count: 100 });
      for await (const keys of stream) {
        if (keys.length > 0) {
          await this.client.del(...keys);
          deleted += keys.length;
        }
      }
      if (deleted > 0) {
        this.logger.debug(`Invalidated ${deleted} keys matching ${pattern}`);
      }
    } catch {
      // Ignore
    }
    return deleted;
  }

  // ==========================================
  // Хелперы для кэш-паттернов
  // ==========================================

  /** Кэш с автоматическим fetch-if-miss и логом hit/miss */
  async getOrSet<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      this.logger.debug(`cache HIT ${key}`);
      return cached;
    }

    this.logger.debug(`cache MISS ${key}`);
    const data = await fetcher();
    await this.set(key, data, ttlSeconds);
    return data;
  }

  // ==========================================
  // Инвалидация после синхронизации
  // ==========================================

  /** Вызывать после любого sync или reclassification */
  async invalidateAfterSync() {
    await Promise.all([
      this.delByPrefix('cities:'),
      this.delByPrefix('events:'),
      this.delByPrefix('catalog:'),
      this.delByPrefix('tags:'),
      this.delByPrefix('regions:'),
      this.delByPrefix('landings:'),
      this.delByPrefix('combos:'),
      this.delByPrefix('search:'),
    ]);
    this.logger.log('Кэш инвалидирован после синхронизации');
  }

  /** Статус */
  isConnected(): boolean {
    return this.enabled;
  }
}
