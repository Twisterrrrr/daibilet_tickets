import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
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
    PrismaModule,
    RedisCacheModule,
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
  ],
})
export class AppModule {}
