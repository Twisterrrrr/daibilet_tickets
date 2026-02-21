/**
 * Webhook Idempotency Service — защита от повторной обработки webhook.
 *
 * Использует таблицу ProcessedWebhookEvent с unique constraint на providerEventId.
 * Гарантия: один и тот же webhook обрабатывается ровно один раз.
 *
 * Паттерн:
 *   const result = await idempotency.processOnce(eventId, 'YOOKASSA', 'payment.succeeded', payload, async () => {
 *     // Обработка — выполняется только если eventId ещё не обрабатывался
 *     return 'PAID';
 *   });
 *   // result.processed = false → дубликат, пропущен
 */

import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface ProcessOnceResult {
  /** true = обработано впервые, false = дубликат */
  processed: boolean;
  /** Результат обработки (текущий или предыдущий) */
  result: string;
}

@Injectable()
export class WebhookIdempotencyService {
  private readonly logger = new Logger(WebhookIdempotencyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Обработать webhook ровно один раз.
   *
   * @param providerEventId — уникальный ID события от провайдера (payment.id от YK, order.id от TC)
   * @param provider — имя провайдера (YOOKASSA, TC, PARTNER)
   * @param eventType — тип события (payment.succeeded, payment.canceled, etc.)
   * @param payload — полный payload webhook для аудита
   * @param handler — функция обработки, вызывается ТОЛЬКО если событие ещё не обрабатывалось
   * @returns ProcessOnceResult
   */
  async processOnce(
    providerEventId: string,
    provider: string,
    eventType: string,
    payload: unknown,
    handler: () => Promise<string>,
    paymentIntentId?: string,
  ): Promise<ProcessOnceResult> {
    // 1. Проверяем — уже обрабатывали?
    const existing = await this.prisma.processedWebhookEvent.findUnique({
      where: { providerEventId },
    });

    if (existing) {
      this.logger.debug(
        `Webhook duplicate skipped: provider=${provider}, eventId=${providerEventId}, previousResult=${existing.result}`,
      );
      return { processed: false, result: existing.result || 'UNKNOWN' };
    }

    // 2. Обрабатываем
    let result: string;
    try {
      result = await handler();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Webhook handler failed: provider=${provider}, eventId=${providerEventId}, error=${msg}`);

      // Записываем FAILED, чтобы повторная доставка могла быть обработана
      // (не записываем → позволяем retry от провайдера)
      throw error;
    }

    // 3. Записываем факт обработки (идемпотентность через unique constraint)
    try {
      await this.prisma.processedWebhookEvent.create({
        data: {
          providerEventId,
          provider,
          eventType,
          payload: payload as unknown as Prisma.InputJsonValue,
          result,
          ...(paymentIntentId && { paymentIntentId }),
        },
      });
    } catch (error) {
      // Unique constraint violation = параллельная обработка, кто-то успел первым
      if ((error as Record<string, unknown>)?.code === 'P2002') {
        this.logger.warn(
          `Webhook race condition (concurrent): provider=${provider}, eventId=${providerEventId}`,
        );
        const race = await this.prisma.processedWebhookEvent.findUnique({
          where: { providerEventId },
        });
        return { processed: false, result: race?.result || 'RACE_CONDITION' };
      }
      throw error;
    }

    this.logger.log(
      `[provider=${provider}] [eventId=${providerEventId}] [eventType=${eventType}]` +
      (paymentIntentId ? ` [intent=${paymentIntentId}]` : '') +
      ` Webhook processed: result=${result}`,
    );

    return { processed: true, result };
  }

  /**
   * Проверить, был ли webhook уже обработан (без выполнения).
   */
  async isProcessed(providerEventId: string): Promise<boolean> {
    const existing = await this.prisma.processedWebhookEvent.findUnique({
      where: { providerEventId },
      select: { id: true },
    });
    return !!existing;
  }
}
