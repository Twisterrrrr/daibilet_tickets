import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PricingService } from './pricing.service';

@ApiTags('pricing')
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricing: PricingService) {}

  @Get('config')
  @ApiOperation({ summary: 'Текущая конфигурация pricing (для отладки)' })
  getConfig() {
    return this.pricing.getConfig();
  }

  @Get('upsells')
  @ApiOperation({ summary: 'Каталог upsell-услуг' })
  getUpsells(@Query('city') city?: string) {
    return this.pricing.getUpsells(city);
  }
}
