import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { getThrottlerOptions } from './common/throttle.util';
import { join } from 'path';
import { RequestIdMiddleware } from './common/request-id.middleware';
import { SentryContextMiddleware } from './common/sentry-context.middleware';
import { LoggingInterceptor } from './common/logging.interceptor';
import { PrismaModule } from './prisma/prisma.module';
import { CatalogModule } from './catalog/catalog.module';
import { PlannerModule } from './planner/planner.module';
import { CheckoutModule } from './checkout/checkout.module';
import { VoucherModule } from './voucher/voucher.module';
import { BlogModule } from './blog/blog.module';
import { HealthModule } from './health/health.module';
import { LandingModule } from './landing/landing.module';
import { PricingModule } from './pricing/pricing.module';
import { ComboModule } from './combo/combo.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { RedisCacheModule } from './cache/cache.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { SupplierModule } from './supplier/supplier.module';
import { PartnerModule } from './partner/partner.module';
import { VenueModule } from './venue/venue.module';
import { CollectionModule } from './collection/collection.module';
import { SupportModule } from './support/support.module';
import { UserModule } from './user/user.module';
import { MailModule } from './mail/mail.module';
import { UploadModule } from './upload/upload.module';
import { QueueModule } from './queue/queue.module';
import { SeoModule } from './seo/seo.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(__dirname, '..', '..', '..', '.env'),   // ../../.. → корень монорепо
        join(__dirname, '..', '..', '.env'),           // ../../ → packages/backend/.env
        '.env',                                         // cwd
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
    // Логирование запросов с requestId
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
    consumer.apply(SentryContextMiddleware).forRoutes('*');
  }
}
