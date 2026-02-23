import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { SeoEntityType } from './seo.types';

import { SeoMetaService } from './seo-meta.service';

@ApiTags('seo')
@Controller('seo')
export class SeoMetaPublicController {
  constructor(private readonly seo: SeoMetaService) {}

  @Get(':entityType/:entityId')
  get(@Param('entityType') entityType: SeoEntityType, @Param('entityId') entityId: string) {
    return this.seo.getSeoMeta(entityType, entityId);
  }
}
