import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { SubcategoryLandingService } from './subcategory-landing.service';

@ApiTags('landings')
@Controller('landings/subcategories')
@Throttle({ default: { ttl: 60_000, limit: 120 } })
export class SubcategoryLandingsController {
  constructor(private readonly landings: SubcategoryLandingService) {}

  @Get(':citySlug/:subcategorySlug')
  @ApiOperation({
    summary: 'Публичный SEO-лендинг по городу и slug подкатегории (только если isLandingEnabled и порог контента)',
  })
  async getPublished(
    @Param('citySlug') citySlug: string,
    @Param('subcategorySlug') subcategorySlug: string,
  ) {
    return this.landings.getPublishedLandingOrThrow(citySlug, subcategorySlug);
  }
}
