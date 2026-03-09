import { Controller, Get, Header, NotFoundException, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { PromoBlocksPublicService } from './promo-blocks.service';

@ApiTags('public')
@Controller('promo-collections')
export class PromoCollectionsPublicController {
  constructor(private readonly service: PromoBlocksPublicService) {}

  @Get(':slug')
  @ApiOperation({ summary: 'Публичная страница подборки промо-коллекции' })
  @Header('Cache-Control', 'public, max-age=60')
  async getBySlug(@Param('slug') slug: string) {
    const data = await this.service.getCollectionBySlug(slug);
    if (!data) throw new NotFoundException('Promo collection not found');
    return data;
  }
}
