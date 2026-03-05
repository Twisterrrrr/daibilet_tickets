/**
 * Generic Idempotency Service — защита от дублей операций.
 *
 * Ops Foundation Batch 1. Использует таблицу IdempotencyKey.
 * Паттерн: run(scope, key, handler) — handler выполняется только один раз для пары (scope, key).
 * Повторный вызов с тем же ключом возвращает cached response (если DONE) или блокируется (если IN_PROGRESS).
 *
 * @example
 * const pkg = await idempotency.run('CHECKOUT_CREATE', `create:${userId}:${hash}`, async () => {
 *   return this.checkoutService.createPackage(...);
 * });
 */

import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { IdempotencyScope } from '@prisma/client';

const STATUS = {
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
  FAILED: 'FAILED',
} as const;

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Выполнить операцию идемпотентно.
   *
   * @param scope — область (CHECKOUT_CREATE, EMAIL_SEND, ...)
   * @param key — уникальный ключ в рамках scope
   * @param handler — функция, вызываемая только при первом запросе
   * @param options — meta (requestId и т.п.), entityId для трассировки
   * @returns результат handler или кэшированный
   * @throws ConflictException если параллельный запрос с тем же ключом в процессе
   */
  async run<T>(
    scope: IdempotencyScope,
    key: string,
    handler: () => Promise<T>,
    options?: { meta?: Record<string, unknown>; entityId?: string; requestId?: string },
  ): Promise<T> {
    // 1. Проверяем — уже есть результат?
    const existing = await this.prisma.idempotencyKey.findUnique({
      where: { scope_key: { scope, key } },
    });

    if (existing) {
      if (existing.status === STATUS.DONE && existing.response != null) {
        this.logger.debug(`[scope=${scope}] [key=${key}] Returning cached response`);
        return existing.response as unknown as T;
      }
      if (existing.status === STATUS.IN_PROGRESS) {
        this.logger.warn(`[scope=${scope}] [key=${key}] Duplicate request blocked (in progress)`);
        throw new ConflictException('DUPLICATE_REQUEST_IN_PROGRESS');
      }
      // FAILED — разрешаем retry: удаляем запись и идём дальше
      await this.prisma.idempotencyKey.delete({
        where: { scope_key: { scope, key } },
      });
    }

    // 2. Пытаемся занять слот (INSERT)
    try {
      await this.prisma.idempotencyKey.create({
        data: {
          scope,
          key,
          status: STATUS.IN_PROGRESS,
          entityId: options?.entityId ?? null,
          metaJson: (options?.meta ?? null) as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      const e = err as { code?: string };
      if (e?.code === 'P2002') {
        // Unique violation — параллельный запрос успел первым
        const race = await this.prisma.idempotencyKey.findUnique({
          where: { scope_key: { scope, key } },
        });
        if (race?.status === STATUS.DONE && race.response != null) {
          return race.response as unknown as T;
        }
        throw new ConflictException('DUPLICATE_REQUEST_IN_PROGRESS');
      }
      throw err;
    }

    // 3. Выполняем handler
    try {
      const result = await handler();
      const response = JSON.parse(JSON.stringify(result)) as Prisma.InputJsonValue;

      await this.prisma.idempotencyKey.update({
        where: { scope_key: { scope, key } },
        data: { status: STATUS.DONE, response },
      });

      this.logger.log(
        `[scope=${scope}] [key=${key}]` +
          (options?.requestId ? ` [requestId=${options.requestId}]` : '') +
          ` Idempotent op completed`,
      );

      return result as unknown as T;
    } catch (error) {
      await this.prisma.idempotencyKey
        .update({
          where: { scope_key: { scope, key } },
          data: {
            status: STATUS.FAILED,
            metaJson: {
              ...((options?.meta ?? {}) as Record<string, unknown>),
              error: error instanceof Error ? error.message : String(error),
            } as Prisma.InputJsonValue,
          },
        })
        .catch(() => { /* noop: log already recorded */ });

      throw error;
    }
  }
}
