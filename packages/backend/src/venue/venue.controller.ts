import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { ReviewService } from '../catalog/review.service';
import { VenueService } from './venue.service';

@ApiTags('venues')
@Controller('venues')
export class VenueController {
  constructor(
    private readonly venueService: VenueService,
    private readonly reviewService: ReviewService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Список мест (музеи, галереи, арт-пространства)' })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'venueType', required: false })
  @ApiQuery({ name: 'featured', required: false })
  @ApiQuery({ name: 'sort', required: false, enum: ['rating', 'price', 'name'] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getVenues(
    @Query('city') city?: string,
    @Query('venueType') venueType?: string,
    @Query('featured') featured?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.venueService.getVenues({
      city,
      venueType,
      featured: featured === 'true' ? true : featured === 'false' ? false : undefined,
      sort,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Детальная страница места' })
  async getVenueBySlug(@Param('slug') slug: string) {
    const venue = await this.venueService.getVenueBySlug(slug);
    const [relatedArticles, relatedVenues] = await Promise.all([
      venue.cityId ? this.venueService.getRelatedArticles(venue.cityId, 4) : [],
      venue.cityId && venue.venueType
        ? this.venueService.getRelatedVenues(venue.id, venue.cityId, venue.venueType, 6)
        : [],
    ]);
    return { ...venue, relatedArticles, relatedVenues };
  }

  @Get(':slug/reviews')
  @ApiOperation({ summary: 'Одобренные отзывы места (с пагинацией)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getVenueReviews(@Param('slug') slug: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.reviewService.getByVenueSlug(slug, Number(page) || 1, Number(limit) || 10);
  }
}
