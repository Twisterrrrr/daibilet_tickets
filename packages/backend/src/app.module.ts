import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { join } from 'path';

import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { BlogModule } from './blog/blog.module';
import { RedisCacheModule } from './cache/cache.module';
import { CatalogModule } from './catalog/catalog.module';
import { CheckoutModule } from './checkout/checkout.module';
import { CollectionModule } from './collection/collection.module';
import { ComboModule } from './combo/combo.module';
import { RequestIdMiddleware } from './common/request-id.middleware';
import { SentryContextMiddleware } from './common/sentry-context.middleware';
import { getThrottlerOptions } from './common/throttle.util';
import { loggerConfig } from './logger/logger.config';
import { HealthModule } from './health/health.module';
import { LandingModule } from './landing/landing.module';
import { MailModule } from './mail/mail.module';
import { PartnerModule } from './partner/partner.module';
import { PlannerModule } from './planner/planner.module';
import { PricingModule } from './pricing/pricing.module';
import { PrismaModule } from './prisma/prisma.module';
import { ScheduleModule } from './schedule/schedule.module';
import { QueueModule } from './queue/queue.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { SeoModule } from './seo/seo.module';
import { SupplierModule } from './supplier/supplier.module';
import { SupportModule } from './support/support.module';
import { UploadModule } from './upload/upload.module';
import { UserModule } from './user/user.module';
import { VenueModule } from './venue/venue.module';
import { VoucherModule } from './voucher/voucher.module';

@Module({
  imports: [
    LoggerModule.forRoot(loggerConfig),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(__dirname, '..', '..', '..', '.env'), // ../../.. → корень монорепо
        join(__dirname, '..', '..', '.env'), // ../../ → packages/backend/.env
        '.env', // cwd
      ],
    }),
    ThrottlerModule.forRoot(getThrottlerOptions()),
    PrismaModule,
    RedisCacheModule,
    MailModule,
    UploadModule,
    QueueModule,
    PricingModule,
    CatalogModule,
    PlannerModule,
    ScheduleModule,
    CheckoutModule,
    VoucherModule,
    BlogModule,
    HealthModule,
    LandingModule,
    ComboModule,
    SchedulerModule,
    AuthModule,
    AdminModule,
    SupplierModule,
    PartnerModule,
    VenueModule,
    CollectionModule,
    SupportModule,
    UserModule,
    SeoModule,
  ],
  providers: [
    // Глобальный rate limiter (30 req/min по умолчанию, per-route через @Throttle)
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Логирование запросов — pino-http (LoggerModule) логирует автоматически
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
    consumer.apply(SentryContextMiddleware).forRoutes('*');
  }
}
