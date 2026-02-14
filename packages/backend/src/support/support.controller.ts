import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { CreateSupportRequestDto } from './dto/support.dto';

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
