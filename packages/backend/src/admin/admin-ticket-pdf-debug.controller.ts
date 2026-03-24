import { Controller, ForbiddenException, Get, Param, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { VoucherService } from '../voucher/voucher.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/debug/ticket-pdf')
export class AdminTicketPdfDebugController {
  constructor(
    private readonly voucherService: VoucherService,
    private readonly config: ConfigService,
  ) {}

  @Get(':shortCode')
  @Roles('ADMIN')
  async generate(@Param('shortCode') shortCode: string, @Res() res: Response) {
    const enabled = this.config.get<string>('TICKET_PDF_DEBUG_ENABLED', 'false') === 'true';
    if (!enabled) {
      throw new ForbiddenException('TICKET_PDF_DEBUG_ENABLED=false');
    }

    const pdf = await this.voucherService.generatePdf(shortCode);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="ticket-${shortCode}.pdf"`);
    res.send(pdf);
  }
}

