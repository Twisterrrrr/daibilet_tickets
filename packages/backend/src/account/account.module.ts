import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CheckoutModule } from '../checkout/checkout.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UserModule } from '../user/user.module';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { PurchaseReadService } from './purchase-read.service';
import { TicketCapabilityService } from './ticket-capability.service';

@Module({
  imports: [ConfigModule, PrismaModule, UserModule, CheckoutModule],
  controllers: [AccountController],
  providers: [AccountService, PurchaseReadService, TicketCapabilityService],
  exports: [AccountService],
})
export class AccountModule {}
