import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PricingService } from './pricing.service';

@ApiTags('pricing')
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricing: PricingService) {}

  @Get('config')
  @ApiOperation({ summary: 'Текущая конфигурация pricing (для отладки)' })
  async getConfig() {
    return this.pricing.getConfigPublic();
  }

  @Get('upsells')
  @ApiOperation({ summary: 'Каталог upsell-услуг' })
  async getUpsells(@Query('city') city?: string) {
    return this.pricing.getUpsells(city);
  }
}
