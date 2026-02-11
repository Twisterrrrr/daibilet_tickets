import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Redis Cache Service.
 *
 * Стратегия:
 * - Города: TTL 1 час (редко меняются)
 * - Список событий: TTL 5 мин (часто обновляются)
 * - Карточка события: TTL 10 мин
 * - Лендинги: TTL 30 мин
 * - Combo: TTL 30 мин
 * - После sync → инвалидация по паттерну
 */

export const CACHE_TTL = {
  CITIES: 3600,            // 1 час
  CITY_DETAIL: 1800,       // 30 мин
  EVENT_LIST: 300,         // 5 мин
  EVENT_DETAIL: 600,       // 10 мин
  TAGS: 3600,              // 1 час
  LANDINGS: 1800,          // 30 мин
  COMBOS: 1800,            // 30 мин
  SEARCH: 120,             // 2 мин
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
    } catch (err: any) {
      this.logger.warn(`Redis не подключён (${err.message}) — работаем без кэша`);
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

  /** Кэш с автоматическим fetch-if-miss */
  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const data = await fetcher();
    await this.set(key, data, ttlSeconds);
    return data;
  }

  // ==========================================
  // Инвалидация после синхронизации
  // ==========================================

  /** Вызывать после любого sync */
  async invalidateAfterSync() {
    await Promise.all([
      this.invalidatePattern('cities:*'),
      this.invalidatePattern('events:*'),
      this.invalidatePattern('tags:*'),
      this.invalidatePattern('landings:*'),
      this.invalidatePattern('combos:*'),
      this.invalidatePattern('search:*'),
    ]);
    this.logger.log('Кэш инвалидирован после синхронизации');
  }

  /** Статус */
  isConnected(): boolean {
    return this.enabled;
  }
}
