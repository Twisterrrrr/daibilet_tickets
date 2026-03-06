import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { WidgetCheckoutService } from './widget-checkout.service';
import { WidgetCheckoutRequestDto, WidgetCheckoutResponseDto } from './dto/widget-checkout.dto';
import { WidgetsApiService, type WidgetEventResponse } from './widgets-api.service';

@Controller('/widgets')
export class WidgetsApiController {
  constructor(
    private readonly widgetsApi: WidgetsApiService,
    private readonly widgetCheckout: WidgetCheckoutService,
  ) {}

  @Get(':provider/event')
  async getWidgetEvent(
    @Param('provider') _provider: string,
    @Query('eventId') eventId?: string,
    @Query('lang') _lang?: string,
  ): Promise<WidgetEventResponse> {
    return this.widgetsApi.getEventWithSessions(eventId);
  }

  @Post(':provider/checkout')
  async createWidgetCheckout(
    @Param('provider') provider: string,
    @Body() body: WidgetCheckoutRequestDto,
  ): Promise<WidgetCheckoutResponseDto> {
    return this.widgetCheckout.createWidgetCheckout(provider, body);
  }

  @Get(':provider/last-customer')
  async getLastCustomer(
    @Param('provider') _provider: string,
    @Query('email') email?: string,
  ): Promise<{ name: string; email: string; phone: string } | null> {
    return this.widgetsApi.getLastCustomerByEmail(email);
  }
}

