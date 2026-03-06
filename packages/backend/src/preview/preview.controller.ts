import { Controller, Get, Header, Param, Query, ForbiddenException } from '@nestjs/common';

import { CatalogService } from '../catalog/catalog.service';
import { VenueService } from '../venue/venue.service';
import { PreviewService } from './preview.service';

@Controller('preview')
export class PreviewController {
  constructor(
    private readonly preview: PreviewService,
    private readonly catalog: CatalogService,
    private readonly venues: VenueService,
  ) {}

  @Get('events/:id')
  @Header('Cache-Control', 'no-store')
  async getEventPreview(@Param('id') id: string, @Query('token') token?: string) {
    const payload = this.preview.verifyPreviewToken(token as string);
    if (payload.type !== 'EVENT' || payload.id !== id) {
      throw new ForbiddenException('preview token does not match event');
    }
    return this.catalog.getEventByIdForPreview(id);
  }

  @Get('venues/:id')
  @Header('Cache-Control', 'no-store')
  async getVenuePreview(@Param('id') id: string, @Query('token') token?: string) {
    const payload = this.preview.verifyPreviewToken(token as string);
    if (payload.type !== 'VENUE' || payload.id !== id) {
      throw new ForbiddenException('preview token does not match venue');
    }
    return this.venues.getVenueByIdForPreview(id);
  }
}

