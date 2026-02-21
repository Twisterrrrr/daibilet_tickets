import { Controller, Get, Put, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SeoEntityType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { SeoMetaService } from './seo-meta.service';
import { UpsertSeoMetaDto } from './dto/upsert-seo-meta.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'EDITOR')
@Controller('admin/seo')
export class SeoMetaAdminController {
  constructor(private readonly seo: SeoMetaService) {}

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
