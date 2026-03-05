import { Module } from '@nestjs/common';

import { CheckoutModule } from '../checkout/checkout.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TeplohodWidgetsController } from './teplohod/teplohod-widgets.controller';
import { TeplohodWidgetsService } from './teplohod/teplohod-widgets.service';
import { WidgetCheckoutService } from './widget-checkout.service';
import { WidgetsApiController } from './widgets-api.controller';
import { WidgetsApiService } from './widgets-api.service';

@Module({
  imports: [PrismaModule, CheckoutModule],
  controllers: [TeplohodWidgetsController, WidgetsApiController],
  providers: [TeplohodWidgetsService, WidgetsApiService, WidgetCheckoutService],
})
export class WidgetsModule {}
