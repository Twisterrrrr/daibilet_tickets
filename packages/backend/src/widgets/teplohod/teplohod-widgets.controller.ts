import { Body, Controller, Get, Header, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';

import { TeplohodWidgetEventDto } from '@daibilet/shared';
import { TeplohodWidgetsService } from './teplohod-widgets.service';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

class TeplohodWidgetQuery {
  @IsString()
  eventId!: string;

  @IsOptional()
  @IsEnum(['ru', 'en'] as const)
  lang?: 'ru' | 'en';

  @IsOptional()
  @IsEnum(['light', 'dark'] as const)
  theme?: 'light' | 'dark';

  @IsOptional()
  @IsEnum(['compact', 'full'] as const)
  layout?: 'compact' | 'full';
}

class TeplohodWidgetCheckoutBody {
  @IsString()
  eventId!: string;

  @IsString()
  sessionId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  qty?: number;

  @IsOptional()
  @IsString()
  returnUrl?: string | null;
}

@Controller()
export class TeplohodWidgetsController {
  constructor(private readonly svc: TeplohodWidgetsService) {}

  @Get('/widgets/teplohod')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async teplohodWidgetHtml(@Query() q: TeplohodWidgetQuery, @Res() res: Response) {
    res.setHeader('Cache-Control', 'public, max-age=60');
    const html = await this.svc.renderHtml(q);
    return res.send(html);
  }

  @Get('/widgets/teplohod/event')
  async getTeplohodEvent(@Query() q: TeplohodWidgetQuery): Promise<TeplohodWidgetEventDto> {
    return this.svc.getEventDto(q);
  }

  @Post('/widgets/teplohod/checkout')
  async createCheckout(@Body() body: TeplohodWidgetCheckoutBody): Promise<{ checkoutUrl: string }> {
    return this.svc.createCheckout(body);
  }
}

