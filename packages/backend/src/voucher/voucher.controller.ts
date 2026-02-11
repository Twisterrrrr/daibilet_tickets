import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { VoucherService } from './voucher.service';

@ApiTags('vouchers')
@Controller('vouchers')
export class VoucherController {
  constructor(private readonly voucherService: VoucherService) {}

  @Get(':shortCode')
  @ApiOperation({ summary: 'Данные ваучера для мобильной страницы' })
  getVoucher(@Param('shortCode') shortCode: string) {
    return this.voucherService.getByShortCode(shortCode);
  }

  @Get(':shortCode/pdf')
  @ApiOperation({ summary: 'PDF-версия ваучера' })
  getVoucherPdf(@Param('shortCode') shortCode: string) {
    // TODO: Генерация и отдача PDF
    return { message: 'PDF generation — в разработке' };
  }
}
