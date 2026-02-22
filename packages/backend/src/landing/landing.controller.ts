import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

import { LandingService } from './landing.service';

@ApiTags('landings')
@Controller('landings')
export class LandingController {
  constructor(private readonly landingService: LandingService) {}

  @Get()
  @ApiOperation({ summary: 'Список активных посадочных страниц' })
  @ApiQuery({ name: 'city', required: false, description: 'Slug города для фильтрации' })
  getAll(@Query('city') city?: string) {
    if (city) {
      return this.landingService.getByCitySlug(city);
    }
    return this.landingService.getAll();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Посадочная страница с вариантами рейсов и фильтрами' })
  @ApiParam({ name: 'slug', description: 'Slug лендинга, например nochnye-mosty' })
  getBySlug(@Param('slug') slug: string) {
    return this.landingService.getBySlug(slug);
  }
}
