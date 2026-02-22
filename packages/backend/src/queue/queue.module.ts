import { BullModule } from '@nestjs/bullmq';
import { forwardRef, Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { CatalogModule } from '../catalog/catalog.module';
import { CheckoutModule } from '../checkout/checkout.module';
import { ComboModule } from '../combo/combo.module';
import { EmailProcessor } from './email.processor';
import { FulfillmentProcessor } from './fulfillment.processor';
import {
  QUEUE_EMAILS,
  QUEUE_FULFILLMENT,
  QUEUE_PARTNER_WEBHOOKS,
  QUEUE_REVIEW_TASKS,
  QUEUE_SYNC,
} from './queue.constants';
import { ReviewTaskProcessor } from './review-task.processor';
import { SyncProcessor } from './sync.processor';

export { QUEUE_EMAILS, QUEUE_FULFILLMENT, QUEUE_PARTNER_WEBHOOKS, QUEUE_REVIEW_TASKS, QUEUE_SYNC };

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get('REDIS_URL', 'redis://localhost:6379');
        const url = new URL(redisUrl);
        return {
          connection: {
            host: url.hostname,
            port: parseInt(url.port || '6379', 10),
            password: url.password || config.get('REDIS_PASSWORD', '') || undefined,
          },
        };
      },
    }),
    BullModule.registerQueue(
      { name: QUEUE_EMAILS },
      { name: QUEUE_REVIEW_TASKS },
      { name: QUEUE_PARTNER_WEBHOOKS },
      { name: QUEUE_SYNC },
      { name: QUEUE_FULFILLMENT },
    ),
    CatalogModule,
    ComboModule,
    forwardRef(() => CheckoutModule),
  ],
  providers: [EmailProcessor, ReviewTaskProcessor, SyncProcessor, FulfillmentProcessor],
  exports: [BullModule],
})
export class QueueModule {}
