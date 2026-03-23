import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { CollectionService } from './collection.service';

@ApiTags('catalog-collections')
@Controller('catalog/collections')
export class CatalogCollectionsController {
  constructor(private readonly collectionService: CollectionService) {}

  @Get()
  @ApiOperation({ summary: 'Список активных подборок для каталога' })
  @ApiQuery({ name: 'city', required: false })
  getCollections(@Query('city') city?: string) {
    return this.collectionService.getCollections(city);
  }

  @Get(':citySlug/:slug')
  @ApiOperation({ summary: 'Детальная подборка по городу и slug' })
  getByCityAndSlug(
    @Param('citySlug') citySlug: string,
    @Param('slug') slug: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 20));
    return this.collectionService.getByCityAndSlug(citySlug, slug, p, l);
  }
}
