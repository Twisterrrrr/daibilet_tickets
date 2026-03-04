import { Body, Controller, Get, Header, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';

import {
  TeplohodWidgetCheckoutReqDto,
  TeplohodWidgetCheckoutResDto,
  TeplohodWidgetEventDto,
  TeplohodWidgetQueryDto,
} from '@daibilet/shared';
import { TeplohodWidgetsService } from './teplohod-widgets.service';

@Controller()
export class TeplohodWidgetsController {
  constructor(private readonly svc: TeplohodWidgetsService) {}

  @Get('/widgets/teplohod')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async teplohodWidgetHtml(@Query() q: TeplohodWidgetQueryDto, @Res() res: Response) {
    res.setHeader('Cache-Control', 'public, max-age=60');
    const html = await this.svc.renderHtml(q);
    return res.send(html);
  }

  @Get('/api/widgets/teplohod/event')
  async getTeplohodEvent(@Query() q: TeplohodWidgetQueryDto): Promise<TeplohodWidgetEventDto> {
    return this.svc.getEventDto(q);
  }

  @Post('/api/widgets/teplohod/checkout')
  async createCheckout(
    @Body() body: TeplohodWidgetCheckoutReqDto,
  ): Promise<TeplohodWidgetCheckoutResDto> {
    return this.svc.createCheckout(body);
  }
}

