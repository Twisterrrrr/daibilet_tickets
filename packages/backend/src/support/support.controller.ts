import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateSupportRequestDto } from './dto/support.dto';
import { SupportService } from './support.service';

/**
 * Публичные эндпоинты для поддержки (без авторизации).
 */
@ApiTags('support')
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('request')
  @ApiOperation({ summary: 'Создать обращение в поддержку (публичный)' })
  createRequest(@Body() body: CreateSupportRequestDto) {
    return this.supportService.createTicket(body);
  }

  @Get('ticket/:code')
  @ApiOperation({ summary: 'Получить статус обращения по коду (публичный)' })
  getTicketByCode(@Param('code') code: string) {
    return this.supportService.getTicketByCode(code);
  }
}
