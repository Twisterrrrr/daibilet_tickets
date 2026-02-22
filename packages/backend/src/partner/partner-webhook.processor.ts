import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { QUEUE_PARTNER_WEBHOOKS } from '../queue/queue.constants';
import { PartnerWebhookService, WebhookPayload } from './partner-webhook.service';

interface WebhookJobData {
  operatorId: string;
  operatorName: string;
  webhookUrl: string;
  webhookSecret: string;
  payload: WebhookPayload;
}

@Processor(QUEUE_PARTNER_WEBHOOKS)
export class PartnerWebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(PartnerWebhookProcessor.name);

  async process(job: Job<WebhookJobData>): Promise<any> {
    const { operatorId, operatorName, webhookUrl, webhookSecret, payload } = job.data;

    const bodyStr = JSON.stringify(payload);
    const signature = webhookSecret ? PartnerWebhookService.sign(bodyStr, webhookSecret) : '';

    this.logger.log(
      `Sending webhook [${payload.event}] to ${operatorName} (attempt ${job.attemptsMade + 1}/${job.opts?.attempts || 3})`,
    );

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': payload.event,
          'X-Webhook-Timestamp': payload.timestamp,
          'User-Agent': 'SPBBoats-Webhook/1.0',
        },
        body: bodyStr,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const text = await response.text().catch((e) => {
          this.logger.error('webhook delivery failed: ' + (e as Error).message);
          return '';
        });
        throw new Error(`Webhook HTTP ${response.status}: ${text.slice(0, 200)}`);
      }

      this.logger.log(`Webhook delivered: [${payload.event}] → ${operatorName} (${response.status})`);
      return { status: response.status };
    } catch (err: unknown) {
      clearTimeout(timeout);
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Webhook failed: [${payload.event}] → ${operatorName}: ${msg}`);
      throw err; // BullMQ автоматически ретраит
    }
  }
}
