import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { VoucherService } from './voucher.service';

@ApiTags('vouchers')
@Controller('vouchers')
export class VoucherController {
  constructor(private readonly voucherService: VoucherService) {}

  @Get(':shortCode/pdf')
  @ApiOperation({ summary: 'PDF-версия ваучера с QR-кодом' })
  async getVoucherPdf(@Param('shortCode') shortCode: string, @Res() res: Response) {
    const pdf = await this.voucherService.generatePdf(shortCode);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="voucher-${shortCode}.pdf"`);
    res.send(pdf);
  }

  @Get(':shortCode')
  @ApiOperation({ summary: 'Данные ваучера для мобильной страницы' })
  getVoucher(@Param('shortCode') shortCode: string) {
    return this.voucherService.getByShortCode(shortCode);
  }
}
