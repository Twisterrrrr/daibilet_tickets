/**
 * Webhook Idempotency Service — защита от повторной обработки webhook.
 *
 * Использует таблицу ProcessedWebhookEvent с unique constraint на dedupeKey
 * (например `payment.succeeded:<uuid>`), чтобы разные типы событий по одному payment.id
 * не перетирали друг друга.
 *
 * Паттерн:
 *   const result = await idempotency.processOnce(dedupeKey, 'YOOKASSA', 'payment.succeeded', payload, async () => {
 *     return 'PAID';
 *   }, { providerObjectId: '...', paymentIntentId: '...' });
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

export interface ProcessOnceOptions {
  /** object.id провайдера — в БД как providerEventId */
  providerObjectId?: string;
  paymentIntentId?: string;
}

@Injectable()
export class WebhookIdempotencyService {
  private readonly logger = new Logger(WebhookIdempotencyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Обработать webhook ровно один раз.
   *
   * @param dedupeKey — уникальный ключ доставки (eventType:object.id для ЮKassa)
   * @param provider — имя провайдера (YOOKASSA, TC, PARTNER)
   * @param eventType — тип события (payment.succeeded, payment.canceled, etc.)
   * @param payload — полный payload webhook для аудита
   * @param handler — функция обработки, вызывается ТОЛЬКО если событие ещё не обрабатывалось
   */
  async processOnce(
    dedupeKey: string,
    provider: string,
    eventType: string,
    payload: unknown,
    handler: () => Promise<string>,
    options?: ProcessOnceOptions,
  ): Promise<ProcessOnceResult> {
    const providerObjectId = options?.providerObjectId ?? dedupeKey;
    const paymentIntentId = options?.paymentIntentId;

    const existing = await this.prisma.processedWebhookEvent.findUnique({
      where: { dedupeKey },
    });

    if (existing) {
      this.logger.debug(
        `Webhook duplicate skipped: provider=${provider}, dedupeKey=${dedupeKey}, previousResult=${existing.result}`,
      );
      return { processed: false, result: existing.result || 'UNKNOWN' };
    }

    let result: string;
    try {
      result = await handler();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Webhook handler failed: provider=${provider}, dedupeKey=${dedupeKey}, error=${msg}`);
      throw error;
    }

    try {
      await this.prisma.processedWebhookEvent.create({
        data: {
          dedupeKey,
          providerEventId: providerObjectId,
          provider,
          eventType,
          payload: payload as unknown as Prisma.InputJsonValue,
          result,
          ...(paymentIntentId && { paymentIntentId }),
        },
      });
    } catch (error) {
      if ((error as Record<string, unknown>)?.code === 'P2002') {
        this.logger.warn(`Webhook race condition (concurrent): provider=${provider}, dedupeKey=${dedupeKey}`);
        const race = await this.prisma.processedWebhookEvent.findUnique({
          where: { dedupeKey },
        });
        return { processed: false, result: race?.result || 'RACE_CONDITION' };
      }
      throw error;
    }

    this.logger.log(
      `[provider=${provider}] [dedupeKey=${dedupeKey}] [eventType=${eventType}]` +
        (paymentIntentId ? ` [intent=${paymentIntentId}]` : '') +
        ` Webhook processed: result=${result}`,
    );

    return { processed: true, result };
  }

  /**
   * Проверить, был ли webhook с данным dedupeKey уже обработан.
   */
  async isProcessed(dedupeKey: string): Promise<boolean> {
    const existing = await this.prisma.processedWebhookEvent.findUnique({
      where: { dedupeKey },
      select: { id: true },
    });
    return !!existing;
  }
}
