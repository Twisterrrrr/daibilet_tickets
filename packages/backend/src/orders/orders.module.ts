import { Module } from '@nestjs/common';

import { CheckoutModule } from '../checkout/checkout.module';
import { OrdersController } from './orders.controller';

@Module({
  imports: [CheckoutModule],
  controllers: [OrdersController],
})
export class OrdersModule {}
