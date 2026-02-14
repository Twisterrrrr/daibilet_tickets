import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CollectionService } from './collection.service';

@ApiTags('collections')
@Controller('collections')
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  @Get()
  @ApiOperation({ summary: 'Список активных подборок' })
  @ApiQuery({ name: 'city', required: false, description: 'Slug города' })
  getCollections(@Query('city') city?: string) {
    return this.collectionService.getCollections(city);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Подборка по slug + события' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getBySlug(
    @Param('slug') slug: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 20));
    return this.collectionService.getBySlug(slug, p, l);
  }
}
