import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { SubcategoryCollectionsService } from '../subcategories/subcategory-collections.service';
import { SubcategoryLandingService } from '../subcategories/subcategory-landing.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/subcategory-collections')
export class AdminSubcategoryCollectionsController {
  constructor(
    private readonly collections: SubcategoryCollectionsService,
    private readonly landings: SubcategoryLandingService,
  ) {}

  @Get('preview/events')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  @ApiOperation({ summary: 'Превью подборки событий (nocache, с summary)' })
  @ApiQuery({ name: 'code', required: true })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'cityId', required: false })
  async previewEvents(
    @Query('code') code?: string,
    @Query('city') city?: string,
    @Query('cityId') cityId?: string,
  ) {
    const c = code?.trim();
    if (!c) throw new BadRequestException('code обязателен');
    const [summary, page] = await Promise.all([
      this.collections.getEventCollectionSummary({
        subcategoryCode: c,
        citySlug: city?.trim() || undefined,
        cityId: cityId?.trim() || undefined,
        nocache: true,
        limit: 12,
      }),
      this.collections.getEventCollectionBySubcategory({
        subcategoryCode: c,
        citySlug: city?.trim() || undefined,
        cityId: cityId?.trim() || undefined,
        page: 1,
        limit: 24,
        nocache: true,
      }),
    ]);
    return { summary, collection: page };
  }

  @Get('preview/venues')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  @ApiOperation({ summary: 'Превью подборки площадок (nocache, с summary)' })
  @ApiQuery({ name: 'code', required: true })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'cityId', required: false })
  async previewVenues(
    @Query('code') code?: string,
    @Query('city') city?: string,
    @Query('cityId') cityId?: string,
  ) {
    const c = code?.trim();
    if (!c) throw new BadRequestException('code обязателен');
    const [summary, page] = await Promise.all([
      this.collections.getVenueCollectionSummary({
        subcategoryCode: c,
        citySlug: city?.trim() || undefined,
        cityId: cityId?.trim() || undefined,
        nocache: true,
        limit: 12,
      }),
      this.collections.getVenueCollectionBySubcategory({
        subcategoryCode: c,
        citySlug: city?.trim() || undefined,
        cityId: cityId?.trim() || undefined,
        page: 1,
        limit: 24,
        nocache: true,
      }),
    ]);
    return { summary, collection: page };
  }

  @Get('preview/landing')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  @ApiOperation({ summary: 'Превью SEO-лендинга (включая неопубликованные — с причинами)' })
  @ApiQuery({ name: 'citySlug', required: true })
  @ApiQuery({ name: 'subcategorySlug', required: true })
  async previewLanding(
    @Query('citySlug') citySlug?: string,
    @Query('subcategorySlug') subcategorySlug?: string,
  ) {
    const cs = citySlug?.trim();
    const ss = subcategorySlug?.trim();
    if (!cs || !ss) throw new BadRequestException('citySlug и subcategorySlug обязательны');
    return this.landings.buildLandingPayload(cs, ss, { nocache: true, limit: 36 });
  }
}
