import { Module } from '@nestjs/common';

import { CheckoutModule } from '../checkout/checkout.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminRefundRequestController, RefundRequestController } from './refund-request.controller';
import { RefundEngineService } from './refund-engine.service';
import { RefundExecutionService } from './refund-execution.service';

@Module({
  imports: [PrismaModule, CheckoutModule],
  providers: [RefundEngineService, RefundExecutionService],
  controllers: [RefundRequestController, AdminRefundRequestController],
  exports: [RefundEngineService, RefundExecutionService],
})
export class RefundModule {}
