import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

import { QUEUE_PARTNER_WEBHOOKS } from '../queue/queue.constants';
export { QUEUE_PARTNER_WEBHOOKS };

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, any>;
}

/**
 * Сервис для отправки webhook-уведомлений партнёрам.
 *
 * Workflow:
 * 1. Бизнес-логика вызывает enqueue()
 * 2. BullMQ ставит задачу в очередь
 * 3. Processor забирает и делает POST на webhookUrl
 * 4. HMAC-SHA256 подпись в заголовке X-Webhook-Signature
 * 5. 3 ретрая с exponential backoff
 */
@Injectable()
export class PartnerWebhookService {
  private readonly logger = new Logger(PartnerWebhookService.name);

  constructor(
    @InjectQueue(QUEUE_PARTNER_WEBHOOKS)
    private readonly webhookQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Ставит webhook-уведомление в очередь.
   */
  async enqueue(operatorId: string, eventType: string, data: Record<string, any>): Promise<void> {
    const operator = await this.prisma.operator.findUnique({
      where: { id: operatorId },
      select: { webhookUrl: true, webhookSecret: true, name: true },
    });

    if (!operator?.webhookUrl) {
      this.logger.debug(`Operator ${operatorId} has no webhookUrl, skipping webhook`);
      return;
    }

    const payload: WebhookPayload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data,
    };

    await this.webhookQueue.add(
      'send-webhook',
      {
        operatorId,
        operatorName: operator.name,
        webhookUrl: operator.webhookUrl,
        webhookSecret: operator.webhookSecret || '',
        payload,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, // 5s, 10s, 20s
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );

    this.logger.log(`Webhook queued: ${eventType} → ${operator.name} (${operatorId})`);
  }

  /**
   * Генерирует HMAC-SHA256 подпись для payload.
   */
  static sign(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }
}
