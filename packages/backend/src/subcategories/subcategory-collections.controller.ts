import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { SubcategoryCollectionsService } from './subcategory-collections.service';

@ApiTags('collections')
@Controller('collections/subcategories')
@Throttle({ default: { ttl: 60_000, limit: 120 } })
export class SubcategoryCollectionsController {
  constructor(private readonly collections: SubcategoryCollectionsService) {}

  @Get('events')
  @ApiOperation({ summary: 'Автоподборка событий по коду подкатегории (канонический отбор через каталог)' })
  @ApiQuery({ name: 'code', required: true, description: 'Стабильный code Subcategory' })
  @ApiQuery({ name: 'city', required: false, description: 'Slug города' })
  @ApiQuery({ name: 'cityId', required: false, description: 'UUID города' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getEvents(
    @Query('code') code?: string,
    @Query('city') city?: string,
    @Query('cityId') cityId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const c = code?.trim();
    if (!c) throw new BadRequestException('Параметр code обязателен');
    return this.collections.getEventCollectionBySubcategory({
      subcategoryCode: c,
      citySlug: city?.trim() || undefined,
      cityId: cityId?.trim() || undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 24,
    });
  }

  @Get('venues')
  @ApiOperation({ summary: 'Автоподборка площадок по коду подкатегории' })
  @ApiQuery({ name: 'code', required: true })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'cityId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getVenues(
    @Query('code') code?: string,
    @Query('city') city?: string,
    @Query('cityId') cityId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const c = code?.trim();
    if (!c) throw new BadRequestException('Параметр code обязателен');
    return this.collections.getVenueCollectionBySubcategory({
      subcategoryCode: c,
      citySlug: city?.trim() || undefined,
      cityId: cityId?.trim() || undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 24,
    });
  }
}
