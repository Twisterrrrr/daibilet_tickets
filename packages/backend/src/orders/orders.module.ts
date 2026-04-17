import { forwardRef, Module } from '@nestjs/common';

import { CheckoutModule } from '../checkout/checkout.module';
import { PrismaModule } from '../prisma/prisma.module';
import { OrdersController } from './orders.controller';
import { OrderProjectionService } from './order-projection.service';
import { OrderReadService } from './order-read.service';
import { OrderStatusMapper } from './order-status.mapper';

@Module({
  imports: [forwardRef(() => CheckoutModule), PrismaModule],
  controllers: [OrdersController],
  providers: [OrderProjectionService, OrderReadService, OrderStatusMapper],
  exports: [OrderProjectionService, OrderReadService, OrderStatusMapper],
})
export class OrdersModule {}
