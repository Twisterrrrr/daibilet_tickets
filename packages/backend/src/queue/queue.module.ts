import { Module, Global, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailProcessor } from './email.processor';
import { ReviewTaskProcessor } from './review-task.processor';
import { SyncProcessor } from './sync.processor';
import { FulfillmentProcessor } from './fulfillment.processor';
import { CatalogModule } from '../catalog/catalog.module';
import { ComboModule } from '../combo/combo.module';
import { CheckoutModule } from '../checkout/checkout.module';
import { QUEUE_EMAILS, QUEUE_REVIEW_TASKS, QUEUE_PARTNER_WEBHOOKS, QUEUE_SYNC, QUEUE_FULFILLMENT } from './queue.constants';

export { QUEUE_EMAILS, QUEUE_REVIEW_TASKS, QUEUE_PARTNER_WEBHOOKS, QUEUE_SYNC, QUEUE_FULFILLMENT };

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
