import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { SeoEntityType } from './seo.types';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { UpsertSeoMetaDto } from './dto/upsert-seo-meta.dto';
import { SeoService } from './seo.service';

@ApiTags('seo')
@Controller('seo')
export class SeoPublicController {
  constructor(private readonly seo: SeoService) {}

  @Get(':entityType/:entityId')
  get(@Param('entityType') entityType: SeoEntityType, @Param('entityId') entityId: string) {
    return this.seo.getSeoMeta(entityType, entityId);
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'EDITOR')
@Controller('admin/seo')
export class SeoAdminController {
  constructor(private readonly seo: SeoService) {}

  @Get(':entityType/:entityId')
  get(@Param('entityType') entityType: SeoEntityType, @Param('entityId') entityId: string) {
    return this.seo.getSeoMeta(entityType, entityId);
  }

  @Put(':entityType/:entityId')
  upsert(
    @Param('entityType') entityType: SeoEntityType,
    @Param('entityId') entityId: string,
    @Body() dto: UpsertSeoMetaDto,
  ) {
    return this.seo.upsertSeoMeta(entityType, entityId, dto);
  }

  @Post(':entityType/:entityId/generate')
  generate(@Param('entityType') entityType: SeoEntityType, @Param('entityId') entityId: string) {
    return this.seo.generateSeoMeta(entityType, entityId);
  }
}
