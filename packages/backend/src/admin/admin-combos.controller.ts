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
import { CreateComboDto, UpdateComboDto } from './dto/admin.dto';
import { CuratedEventSchema, FaqSchema, FeatureSchema, IncludesSchema, validateJson } from './json-schemas';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/combos')
export class AdminCombosController {
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
      this.prisma.comboPage.findMany({
        where,
        include: { city: { select: { slug: true, name: true } } },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        ...paginationArgs(pg),
      }),
      this.prisma.comboPage.count({ where }),
    ]);
    return buildPaginatedResult(rawItems, total, pg.limit);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.prisma.comboPage.findUniqueOrThrow({
      where: { id },
      include: { city: { select: { slug: true, name: true } } },
    });
  }

  @Post()
  @Roles('ADMIN', 'EDITOR')
  async create(@Body() data: CreateComboDto) {
    this.validateJsonFields(data as unknown as Record<string, unknown>);
    const prismaData = {
      ...data,
      curatedEvents: data.curatedEvents ? toJsonValue(data.curatedEvents) : undefined,
      faq: data.faq ? toJsonValue(data.faq) : undefined,
      features: data.features ? toJsonValue(data.features) : undefined,
      includes: data.includes ? toJsonValue(data.includes) : undefined,
    };
    return this.prisma.comboPage.create({ data: prismaData as Parameters<typeof this.prisma.comboPage.create>[0]['data'] });
  }

  @Patch(':id')
  @Roles('ADMIN', 'EDITOR')
  async update(@Param('id') id: string, @Body() data: UpdateComboDto, @Request() req: { user: { id: string } }) {
    const { id: _, createdAt, updatedAt, city, version, ...rest } = data as Record<string, unknown>;
    const clean = {
      ...rest,
      curatedEvents: rest.curatedEvents !== undefined ? toJsonValue(rest.curatedEvents) : undefined,
      faq: rest.faq !== undefined ? toJsonValue(rest.faq) : undefined,
      features: rest.features !== undefined ? toJsonValue(rest.features) : undefined,
      includes: rest.includes !== undefined ? toJsonValue(rest.includes) : undefined,
    };

    this.validateJsonFields(rest);

    if (data.version !== undefined) {
      const before = await this.prisma.comboPage.findUnique({ where: { id } });

      const [result] = await this.prisma.$transaction([
        this.prisma.comboPage.updateMany({
          where: { id, version: data.version },
          data: { ...clean, version: { increment: 1 } },
        }),
      ]);

      if (result.count === 0) {
        throw new ConflictException('Данные были изменены другим пользователем');
      }

      const after = await this.prisma.comboPage.findUnique({ where: { id } });
      await this.audit.log(req.user.id, 'UPDATE', 'ComboPage', id, before, after);
      return after;
    }

    return this.prisma.comboPage.update({ where: { id }, data: clean });
  }

  @Delete(':id')
  @Roles('ADMIN')
  async delete(@Param('id') id: string) {
    await this.prisma.comboPage.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    return { success: true };
  }

  private validateJsonFields(data: Record<string, unknown>) {
    try {
      if (data.faq !== undefined) validateJson(FaqSchema, data.faq, 'faq');
      if (data.features !== undefined) validateJson(FeatureSchema, data.features, 'features');
      if (data.curatedEvents !== undefined && Array.isArray(data.curatedEvents) && data.curatedEvents.length > 0) {
        validateJson(CuratedEventSchema, data.curatedEvents, 'curatedEvents');
      }
      if (data.includes !== undefined) validateJson(IncludesSchema, data.includes, 'includes');
    } catch (e: unknown) {
      throw new BadRequestException(e instanceof Error ? e.message : String(e));
    }
  }
}
