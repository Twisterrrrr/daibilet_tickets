import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { PromoBlocksPublicService, type PublicPromoBlockDto } from './promo-blocks.service';

@ApiTags('public')
@Controller('promo-blocks')
export class PromoBlocksPublicController {
  constructor(private readonly service: PromoBlocksPublicService) {}

  @Get()
  @ApiOperation({ summary: 'Публичный список промо-блоков для главной' })
  @Header('Cache-Control', 'public, max-age=300')
  async list(@Query('city') city?: string): Promise<PublicPromoBlockDto[]> {
    return this.service.list(city?.trim() || undefined);
  }

  @Get(':slug/items')
  @ApiOperation({ summary: 'Элементы коллекции промо-блока (events или venues)' })
  @Header('Cache-Control', 'public, max-age=60')
  async getItems(@Param('slug') slug: string) {
    return this.service.getItemsByBlockSlug(slug);
  }
}
