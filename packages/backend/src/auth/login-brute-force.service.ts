import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

import { CacheService } from '../cache/cache.service';

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_COOLDOWN_SEC = 600; // 10 min
const WINDOW_TTL_SEC = 900; // 15 min — окно подсчёта попыток

@Injectable()
export class LoginBruteForceService {
  private readonly logger = new Logger(LoginBruteForceService.name);
  private readonly maxAttempts: number;
  private readonly cooldownSec: number;

  constructor(
    private readonly cache: CacheService,
    private readonly config: ConfigService,
  ) {
    this.maxAttempts = this.config.get<number>('BRUTE_FORCE_MAX_ATTEMPTS', DEFAULT_MAX_ATTEMPTS);
    this.cooldownSec = this.config.get<number>('BRUTE_FORCE_COOLDOWN_SEC', DEFAULT_COOLDOWN_SEC);
  }

  private key(ip: string, email: string): string {
    const emailHash = crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex').slice(0, 16);
    const safeIp = (ip || 'unknown').replace(/[^a-fA-F0-9.:]/g, '_');
    return `login:bf:${safeIp}:${emailHash}`;
  }

  /**
   * Проверяет блокировку перед попыткой логина.
   * @returns blocked, retryAfterSec
   */
  async checkBlocked(ip: string, email: string): Promise<{ blocked: boolean; retryAfterSec?: number }> {
    const key = this.key(ip, email);
    const data = await this.cache.get<{ attempts: number; blockedUntil: number }>(key);
    if (!data) return { blocked: false };
    if (data.blockedUntil && Date.now() < data.blockedUntil) {
      const retryAfterSec = Math.ceil((data.blockedUntil - Date.now()) / 1000);
      return { blocked: true, retryAfterSec };
    }
    return { blocked: false };
  }

  /**
   * Фиксирует неудачную попытку. Возвращает, нужно ли заблокировать.
   */
  async recordFailedAttempt(ip: string, email: string): Promise<{ blocked: boolean; retryAfterSec?: number }> {
    const key = this.key(ip, email);
    const existing = (await this.cache.get<{ attempts: number; blockedUntil?: number }>(key)) ?? { attempts: 0 };
    const attempts = existing.attempts + 1;

    if (attempts >= this.maxAttempts) {
      const blockedUntil = Date.now() + this.cooldownSec * 1000;
      await this.cache.set(key, { attempts, blockedUntil }, this.cooldownSec);
      this.logger.warn(`Admin login brute-force: blocked ip=${this.maskIp(ip)} emailHash=*** attempts=${attempts}`);
      return { blocked: true, retryAfterSec: this.cooldownSec };
    }

    await this.cache.set(key, { attempts }, WINDOW_TTL_SEC);
    return { blocked: false };
  }

  /** Сброс счётчика при успешном логине. */
  async recordSuccess(ip: string, email: string): Promise<void> {
    const key = this.key(ip, email);
    await this.cache.del(key);
  }

  private maskIp(ip: string): string {
    if (!ip || ip === 'unknown') return 'unknown';
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.*.*`;
    }
    return ip;
  }
}
