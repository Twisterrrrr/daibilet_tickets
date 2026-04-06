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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Prisma, StructuralTagGroup, TagKind } from '@prisma/client';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { buildPaginatedResult, paginationArgs, parsePagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { AuditInterceptor } from './audit.interceptor';
import { CreateTagDto, UpdateTagDto } from './dto/admin.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/tags')
export class AdminTagsController {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeTagPayload(input: Record<string, unknown>): Record<string, unknown> {
    const normalized = { ...input };
    if (typeof normalized.code === 'string') {
      const trimmed = normalized.code.trim();
      normalized.code = trimmed.length > 0 ? trimmed : null;
    }
    return normalized;
  }

  private validateTagKindCombination(input: {
    tagKind?: TagKind | null;
    structuralGroup?: StructuralTagGroup | null;
  }) {
    const { tagKind, structuralGroup } = input;
    if (!tagKind) {
      throw new BadRequestException('tagKind обязателен');
    }
    if (tagKind === TagKind.STRUCTURAL && !structuralGroup) {
      throw new BadRequestException('Для STRUCTURAL тега обязательно structuralGroup');
    }
    if (tagKind === TagKind.POPULAR && structuralGroup != null) {
      throw new BadRequestException('Для POPULAR тега structuralGroup должен быть null');
    }
  }

  @Get()
  async list(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('cursor') cursor?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const where: Record<string, unknown> = { isDeleted: false };
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const pg = parsePagination({ cursor, page, limit });
    const [rawItems, total] = await Promise.all([
      this.prisma.tag.findMany({
        where,
        include: { _count: { select: { events: true } } },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
        ...paginationArgs(pg),
      }),
      this.prisma.tag.count({ where }),
    ]);
    return buildPaginatedResult(rawItems, total, pg.limit);
  }

  @Post('unlink-from-events')
  @Roles('ADMIN')
  async unlinkFromEvents(@Body('slug') slug: string) {
    if (!slug) {
      throw new BadRequestException('slug обязателен');
    }
    const tag = await this.prisma.tag.findFirst({ where: { slug } });
    if (!tag) {
      return { success: true, deleted: 0, message: 'Тег не найден' };
    }
    const result = await this.prisma.eventTag.deleteMany({ where: { tagId: tag.id } });
    return { success: true, deleted: result.count };
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.prisma.tag.findUniqueOrThrow({
      where: { id },
      include: { _count: { select: { events: true, articleTags: true } } },
    });
  }

  @Post()
  @Roles('ADMIN', 'EDITOR')
  async create(@Body() data: CreateTagDto) {
    if (data.tagKind === TagKind.STRUCTURAL && data.structuralGroup === StructuralTagGroup.FORMAT) {
      throw new BadRequestException(
        'Создание новых FORMAT-тегов отключено: используйте справочник подкатегорий (staged deprecate)',
      );
    }
    this.validateTagKindCombination({
      tagKind: data.tagKind ?? null,
      structuralGroup: data.structuralGroup ?? null,
    });
    const normalized = this.normalizeTagPayload(data as unknown as Record<string, unknown>);
    return this.prisma.tag.create({ data: normalized as Prisma.TagCreateInput });
  }

  @Patch(':id')
  @Roles('ADMIN', 'EDITOR')
  async update(@Param('id') id: string, @Body() data: UpdateTagDto) {
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, events: _events, articleTags: _articleTags, _count, version: _version, ...rawClean } = data as Record<string, unknown>;
    const clean = this.normalizeTagPayload(rawClean);

    const current = await this.prisma.tag.findUnique({
      where: { id },
      select: { tagKind: true, structuralGroup: true },
    });
    if (!current) {
      throw new BadRequestException('Тег не найден');
    }
    this.validateTagKindCombination({
      tagKind: (data.tagKind ?? current.tagKind) as TagKind | null,
      structuralGroup: (data.structuralGroup ?? current.structuralGroup) as StructuralTagGroup | null,
    });

    if (data.version !== undefined) {
      const result = await this.prisma.tag.updateMany({
        where: { id, version: data.version },
        data: { ...clean, version: { increment: 1 } },
      });
      if (result.count === 0) {
        throw new ConflictException('Данные были изменены другим пользователем');
      }
      return this.prisma.tag.findUniqueOrThrow({ where: { id } });
    }

    return this.prisma.tag.update({ where: { id }, data: clean });
  }

  @Delete(':id')
  @Roles('ADMIN')
  async delete(@Param('id') id: string) {
    // Soft delete
    await this.prisma.tag.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    return { success: true };
  }
}
