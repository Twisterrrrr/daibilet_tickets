import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LandingStatus, LandingTemplateType } from '@prisma/client';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { toJsonValue } from '../common/typing';
import { buildPaginatedResult, paginationArgs, parsePagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from './audit.service';
import { LandingMaterializerService } from '../landing/landing-materializer.service';
import { CreateLandingDto, UpdateLandingDto } from './dto/admin.dto';
import {
  AdditionalFiltersSchema,
  FaqSchema,
  HowToChooseSchema,
  InfoBlockSchema,
  RelatedLinkSchema,
  ReviewSchema,
  StatsSchema,
  validateJson,
} from './json-schemas';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/landings')
export class AdminLandingsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly materializer: LandingMaterializerService,
  ) {}

  @Get()
  async list(
    @Query('city') city?: string,
    @Query('status') status?: LandingStatus,
    @Query('templateType') templateType?: LandingTemplateType,
    @Query('showInCollections') showInCollections?: string,
    @Query('cursor') cursor?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const where: Record<string, unknown> = { isDeleted: false };
    if (city) where.city = { slug: city };
    if (status) where.status = status;
    if (templateType) where.templateType = templateType;
    if (showInCollections === 'true') where.showInCollections = true;
    if (showInCollections === 'false') where.showInCollections = false;

    const pg = parsePagination({ cursor, page, limit });
    const [rawItems, total] = await Promise.all([
      this.prisma.landingPage.findMany({
        where,
        include: { city: { select: { slug: true, name: true } } },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        ...paginationArgs(pg),
      }),
      this.prisma.landingPage.count({ where }),
    ]);
    return buildPaginatedResult(rawItems, total, pg.limit);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.prisma.landingPage.findUniqueOrThrow({
      where: { id },
      include: { city: { select: { slug: true, name: true } } },
    });
  }

  @Post()
  @Roles('ADMIN', 'EDITOR')
  async create(@Body() data: CreateLandingDto) {
    this.validateJsonFields(data as unknown as Record<string, unknown>);
    const prismaData = {
      ...data,
      additionalFilters: data.additionalFilters ? toJsonValue(data.additionalFilters) : undefined,
      rankingJson: data.rankingJson ? toJsonValue(data.rankingJson) : undefined,
      status: data.status ?? (data.isActive ? LandingStatus.ACTIVE : LandingStatus.DRAFT),
    };
    return this.prisma.landingPage.create({ data: prismaData as Parameters<typeof this.prisma.landingPage.create>[0]['data'] });
  }

  @Patch(':id')
  @Roles('ADMIN', 'EDITOR')
  async update(@Param('id') id: string, @Body() data: UpdateLandingDto, @Request() req: { user: { id: string } }) {
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, city: _city, version: _version, ...clean } = data as Record<string, unknown>;

    this.validateJsonFields(clean);

    if (data.version !== undefined) {
      const before = await this.prisma.landingPage.findUnique({ where: { id } });

      const [result] = await this.prisma.$transaction([
        this.prisma.landingPage.updateMany({
          where: { id, version: data.version },
          data: {
            ...clean,
            ...(clean.rankingJson !== undefined ? { rankingJson: toJsonValue(clean.rankingJson) } : {}),
            ...(clean.additionalFilters !== undefined ? { additionalFilters: toJsonValue(clean.additionalFilters) } : {}),
            version: { increment: 1 },
          },
        }),
      ]);

      if (result.count === 0) {
        throw new ConflictException('Данные были изменены другим пользователем');
      }

      const after = await this.prisma.landingPage.findUnique({ where: { id } });
      await this.audit.log(req.user.id, 'UPDATE', 'LandingPage', id, before ?? undefined, after ?? undefined);
      return after;
    }

    return this.prisma.landingPage.update({ where: { id }, data: clean });
  }

  @Post('materialize')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Materialize: обновить isActive лендингов по порогу событий' })
  async materialize() {
    return this.materializer.materialize();
  }

  @Delete(':id')
  @Roles('ADMIN')
  async delete(@Param('id') id: string) {
    await this.prisma.landingPage.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    return { success: true };
  }

  @Post(':id/analytics/:event')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async trackAnalytics(
    @Param('id') id: string,
    @Param('event') event: 'landing_impression' | 'landing_click' | 'landing_conversion',
    @Request() req: { user?: { id?: string } },
  ) {
    if (!['landing_impression', 'landing_click', 'landing_conversion'].includes(event)) {
      throw new BadRequestException('Unsupported analytics event');
    }
    await this.audit.log(
      req.user?.id ?? 'system',
      'UPDATE',
      'LandingAnalytics',
      id,
      null,
      { event, at: new Date().toISOString() },
    );
    return { success: true };
  }

  @Get('analytics/summary')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async getAnalytics(@Query('city') city?: string) {
    const where: Parameters<AuditService['findMany']>[0] = { entity: 'LandingAnalytics', page: 1, limit: 5000 };
    const { items } = await this.audit.findMany(where);
    const grouped = new Map<
      string,
      { landingId: string; impressions: number; clicks: number; conversions: number; ctr: number; conversionRate: number; priorityScore: number }
    >();
    for (const item of items) {
      const key = item.entityId;
      const after = (item.after as { event?: string } | null) ?? null;
      if (!after?.event) continue;
      const prev = grouped.get(key) ?? {
        landingId: key,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        ctr: 0,
        conversionRate: 0,
        priorityScore: 0,
      };
      if (after.event === 'landing_impression') prev.impressions += 1;
      if (after.event === 'landing_click') prev.clicks += 1;
      if (after.event === 'landing_conversion') prev.conversions += 1;
      grouped.set(key, prev);
    }

    const landingIds = [...grouped.keys()];
    const landings = landingIds.length
      ? await this.prisma.landingPage.findMany({
          where: { id: { in: landingIds }, ...(city ? { city: { slug: city } } : {}) },
          include: { city: { select: { slug: true, name: true } } },
        })
      : [];
    const landingMap = new Map(landings.map((landing) => [landing.id, landing]));
    const rows = [...grouped.values()]
      .filter((row) => landingMap.has(row.landingId))
      .map((row) => {
        const ctr = row.impressions > 0 ? row.clicks / row.impressions : 0;
        const conversionRate = row.clicks > 0 ? row.conversions / row.clicks : 0;
        const manualBoost = 1;
        const priorityScore = ctr * conversionRate * manualBoost;
        const landing = landingMap.get(row.landingId)!;
        return {
          ...row,
          title: landing.title,
          slug: landing.slug,
          city: landing.city,
          ctr,
          conversionRate,
          priorityScore,
          bucket: Math.abs(this.hash(landing.id)) % 2 === 0 ? 'A' : 'B',
        };
      })
      .sort((a, b) => b.priorityScore - a.priorityScore);
    return { items: rows };
  }

  private hash(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) hash = (hash << 5) - hash + input.charCodeAt(i);
    return hash;
  }

  private validateJsonFields(data: Record<string, unknown>) {
    try {
      if (data.faq !== undefined) validateJson(FaqSchema, data.faq, 'faq');
      if (data.reviews !== undefined) validateJson(ReviewSchema, data.reviews, 'reviews');
      if (data.stats !== undefined) validateJson(StatsSchema, data.stats, 'stats');
      if (data.relatedLinks !== undefined) validateJson(RelatedLinkSchema, data.relatedLinks, 'relatedLinks');
      if (data.howToChoose !== undefined) validateJson(HowToChooseSchema, data.howToChoose, 'howToChoose');
      if (data.infoBlocks !== undefined) validateJson(InfoBlockSchema, data.infoBlocks, 'infoBlocks');
      if (data.additionalFilters !== undefined)
        validateJson(AdditionalFiltersSchema, data.additionalFilters, 'additionalFilters');
    } catch (e: unknown) {
      throw new BadRequestException(e instanceof Error ? e.message : String(e));
    }
  }
}
