import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { RedisCacheModule } from '../cache/cache.module';

import { AuditService } from './audit.service';
import { EventOverrideService } from './event-override.service';
import { ReviewService } from '../catalog/review.service';
import { QUEUE_EMAILS } from '../queue/queue.module';

import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminCitiesController } from './admin-cities.controller';
import { AdminEventsController } from './admin-events.controller';
import { AdminTagsController } from './admin-tags.controller';
import { AdminLandingsController } from './admin-landings.controller';
import { AdminCombosController } from './admin-combos.controller';
import { AdminArticlesController } from './admin-articles.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminSettingsController } from './admin-settings.controller';
import { AdminAuditController } from './admin-audit.controller';
import { AdminUpsellsController } from './admin-upsells.controller';
import { AdminReviewsController } from './admin-reviews.controller';
import { AdminExternalReviewsController } from './admin-external-reviews.controller';
import { AdminCheckoutController } from './admin-checkout.controller';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    RedisCacheModule,
    BullModule.registerQueue({ name: QUEUE_EMAILS }),
  ],
  providers: [AuditService, EventOverrideService, ReviewService],
  controllers: [
    AdminDashboardController,
    AdminCitiesController,
    AdminEventsController,
    AdminTagsController,
    AdminLandingsController,
    AdminCombosController,
    AdminArticlesController,
    AdminOrdersController,
    AdminSettingsController,
    AdminAuditController,
    AdminUpsellsController,
    AdminReviewsController,
    AdminExternalReviewsController,
    AdminCheckoutController,
  ],
  exports: [AuditService, EventOverrideService, ReviewService],
})
export class AdminModule {}
