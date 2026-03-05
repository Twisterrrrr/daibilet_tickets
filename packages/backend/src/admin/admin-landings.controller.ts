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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { toJsonValue } from '../common/typing';
import { buildPaginatedResult, paginationArgs, parsePagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from './audit.service';
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
  ) {}

  @Get()
  async list(
    @Query('city') city?: string,
    @Query('cursor') cursor?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const where: Record<string, unknown> = { isDeleted: false };
    if (city) where.city = { slug: city };

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
          data: { ...clean, version: { increment: 1 } },
        }),
      ]);

      if (result.count === 0) {
        throw new ConflictException('Данные были изменены другим пользователем');
      }

      const after = await this.prisma.landingPage.findUnique({ where: { id } });
      await this.audit.log(req.user.id, 'UPDATE', 'LandingPage', id, before, after);
      return after;
    }

    return this.prisma.landingPage.update({ where: { id }, data: clean });
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
