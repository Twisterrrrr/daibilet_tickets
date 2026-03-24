import { Module } from '@nestjs/common';

import { VoucherController } from './voucher.controller';
import { TicketPdfService } from './ticket-pdf.service';
import { VoucherService } from './voucher.service';

@Module({
  controllers: [VoucherController],
  providers: [VoucherService, TicketPdfService],
  exports: [VoucherService],
})
export class VoucherModule {}
