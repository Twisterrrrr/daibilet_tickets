import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EventCategory, Prisma } from '@prisma/client';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeExternalCategory } from '../catalog/category-mapping.service';
import {
  SourceCategoryMappingDto,
  SourceCategoryUnknownDto,
  UpsertSourceCategoryMappingDto,
} from './dto/source-category.dto';

@ApiTags('admin-source-categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/source-categories')
export class AdminSourceCategoriesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Список правил маппинга категорий внешних источников' })
  async listMappings(): Promise<SourceCategoryMappingDto[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        source: string;
        externalCategoryNorm: string;
        internalCategory: EventCategory;
        createdAt: Date;
        updatedAt: Date;
      }>
    >(Prisma.sql`
      SELECT
        id,
        source,
        external_category_norm AS "externalCategoryNorm",
        internal_category      AS "internalCategory",
        created_at             AS "createdAt",
        updated_at             AS "updatedAt"
      FROM source_category_mappings
      ORDER BY created_at DESC
    `);

    return rows.map((r) => ({
      id: r.id,
      source: r.source,
      externalCategoryNorm: r.externalCategoryNorm,
      internalCategory: r.internalCategory,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  @Get('unknowns')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Список неизвестных категорий внешних источников' })
  async listUnknowns(): Promise<SourceCategoryUnknownDto[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        source: string;
        externalCategoryRaw: string;
        externalCategoryNorm: string;
        firstSeenAt: Date;
        lastSeenAt: Date;
        hits: number;
      }>
    >(Prisma.sql`
      SELECT
        id,
        source,
        external_category_raw  AS "externalCategoryRaw",
        external_category_norm AS "externalCategoryNorm",
        first_seen_at          AS "firstSeenAt",
        last_seen_at           AS "lastSeenAt",
        hits
      FROM source_category_unknowns
      ORDER BY hits DESC, last_seen_at DESC
    `);

    return rows.map((r) => ({
      id: r.id,
      source: r.source,
      externalCategoryRaw: r.externalCategoryRaw,
      externalCategoryNorm: r.externalCategoryNorm,
      firstSeenAt: r.firstSeenAt.toISOString(),
      lastSeenAt: r.lastSeenAt.toISOString(),
      hits: r.hits,
    }));
  }

  @Put()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Создать или обновить правило маппинга категории' })
  async upsertMapping(@Body() dto: UpsertSourceCategoryMappingDto): Promise<SourceCategoryMappingDto> {
    const externalCategoryNorm = normalizeExternalCategory(dto.externalCategory);

    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        source: string;
        externalCategoryNorm: string;
        internalCategory: EventCategory;
        createdAt: Date;
        updatedAt: Date;
      }>
    >(Prisma.sql`
      INSERT INTO source_category_mappings (id, source, external_category_norm, internal_category, created_at, updated_at)
      VALUES (gen_random_uuid(), ${dto.source}, ${externalCategoryNorm}, ${dto.internalCategory}, NOW(), NOW())
      ON CONFLICT (source, external_category_norm)
      DO UPDATE SET
        internal_category = EXCLUDED.internal_category,
        updated_at        = NOW()
      RETURNING
        id,
        source,
        external_category_norm AS "externalCategoryNorm",
        internal_category      AS "internalCategory",
        created_at             AS "createdAt",
        updated_at             AS "updatedAt"
    `);

    // После создания правила можно удалить unknown-запись для этой пары.
    await this.prisma.$executeRaw(
      Prisma.sql`
        DELETE FROM source_category_unknowns
        WHERE source = ${dto.source} AND external_category_norm = ${externalCategoryNorm}
      `,
    );

    const row = rows[0]!;
    return {
      id: row.id,
      source: row.source,
      externalCategoryNorm: row.externalCategoryNorm,
      internalCategory: row.internalCategory,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить правило маппинга категории' })
  async deleteMapping(@Param('id') id: string): Promise<void> {
    await this.prisma.$executeRaw(
      Prisma.sql`
        DELETE FROM source_category_mappings
        WHERE id = ${id}
      `,
    );
  }
}

