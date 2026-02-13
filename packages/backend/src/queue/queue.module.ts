import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailProcessor } from './email.processor';
import { ReviewTaskProcessor } from './review-task.processor';

export const QUEUE_EMAILS = 'emails';
export const QUEUE_REVIEW_TASKS = 'review-tasks';

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
    ),
  ],
  providers: [EmailProcessor, ReviewTaskProcessor],
  exports: [BullModule],
})
export class QueueModule {}
