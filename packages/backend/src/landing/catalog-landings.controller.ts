import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { LandingService } from './landing.service';

@ApiTags('catalog-landings')
@Controller('catalog')
export class CatalogLandingsController {
  constructor(private readonly landingService: LandingService) {}

  @Get('landings/:citySlug/:slug')
  @ApiOperation({ summary: 'Каталожный лендинг по городу и slug' })
  getCatalogLanding(@Param('citySlug') citySlug: string, @Param('slug') slug: string) {
    return this.landingService.getCatalogByCityAndSlug(citySlug, slug);
  }

  @Get('collections/featured-landings')
  @ApiOperation({ summary: 'Featured лендинги для раздела подборок' })
  getFeatured(@Query('city') city?: string) {
    return this.landingService.getFeaturedForCollections((city ?? '').trim());
  }
}
