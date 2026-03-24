import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SubcategoryType } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { SubcategoryPolicyService } from '../subcategories/subcategory-policy.service';

class UpsertSubcategoryDto {
  @IsString()
  slug!: string;

  @IsString()
  nameRu!: string;

  @IsEnum(SubcategoryType)
  type!: SubcategoryType;

  @IsOptional()
  @IsString()
  parentId?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isLandingEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  sortOrder?: number;
}

class ActivationDto {
  @IsBoolean()
  isActive!: boolean;
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/subcategories')
export class AdminSubcategoriesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subcategoryPolicy: SubcategoryPolicyService,
  ) {}

  @Get()
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async list(
    @Query('type') type?: string,
    @Query('forEntity') forEntity?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const includeInactiveBool = includeInactive === '1' || includeInactive === 'true';
    const types = this.resolveTypes(type, forEntity);

    return this.prisma.subcategory.findMany({
      where: {
        ...(includeInactiveBool ? {} : { isActive: true }),
        ...(types.length ? { type: { in: types } } : {}),
      },
      include: {
        parent: { select: { id: true, slug: true, nameRu: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { nameRu: 'asc' }],
    });
  }

  @Get('tree')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async tree(@Query('forEntity') forEntity?: string, @Query('includeInactive') includeInactive?: string) {
    const includeInactiveBool = includeInactive === '1' || includeInactive === 'true';
    const types = this.resolveTypes(undefined, forEntity);
    const rows = await this.prisma.subcategory.findMany({
      where: {
        ...(includeInactiveBool ? {} : { isActive: true }),
        ...(types.length ? { type: { in: types } } : {}),
      },
      include: { parent: { select: { id: true } } },
      orderBy: [{ sortOrder: 'asc' }, { nameRu: 'asc' }],
    });
    const byParent = new Map<string | null, typeof rows>();
    for (const row of rows) {
      const key = row.parentId ?? null;
      const prev = byParent.get(key) ?? [];
      prev.push(row);
      byParent.set(key, prev);
    }
    return (byParent.get(null) ?? []).map((root) => ({
      ...root,
      children: byParent.get(root.id) ?? [],
    }));
  }

  @Get(':id')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async getOne(@Param('id') id: string) {
    const row = await this.prisma.subcategory.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, slug: true, nameRu: true, type: true } },
        children: { orderBy: [{ sortOrder: 'asc' }, { nameRu: 'asc' }] },
      },
    });
    if (!row) throw new NotFoundException('Подкатегория не найдена');
    return row;
  }

  @Post()
  @Roles('ADMIN', 'EDITOR')
  async create(@Body() dto: UpsertSubcategoryDto) {
    const parent = dto.parentId
      ? await this.prisma.subcategory.findUnique({ where: { id: dto.parentId }, select: { id: true, parentId: true, type: true } })
      : null;
    if (dto.parentId && !parent) throw new BadRequestException('Родительская подкатегория не найдена');
    if (parent) {
      this.subcategoryPolicy.assertDepth(Boolean(parent.parentId));
      this.subcategoryPolicy.assertParentTypeCompatibility(dto.type, parent.type);
    }
    return this.prisma.subcategory.create({
      data: {
        slug: dto.slug.trim().toLowerCase(),
        nameRu: dto.nameRu.trim(),
        type: dto.type,
        parentId: dto.parentId ?? null,
        isActive: dto.isActive ?? true,
        isLandingEnabled: dto.isLandingEnabled ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  @Patch(':id')
  @Roles('ADMIN', 'EDITOR')
  async update(@Param('id') id: string, @Body() dto: Partial<UpsertSubcategoryDto>) {
    const existing = await this.prisma.subcategory.findUnique({
      where: { id },
      select: { id: true, type: true, parentId: true },
    });
    if (!existing) throw new NotFoundException('Подкатегория не найдена');

    const nextParentId = dto.parentId === undefined ? existing.parentId : dto.parentId;
    const nextType = dto.type ?? existing.type;
    if (nextParentId && nextParentId === id) throw new BadRequestException('Подкатегория не может быть родителем самой себе');

    if (nextParentId) {
      let cursor: string | null = nextParentId;
      while (cursor) {
        if (cursor === id) throw new BadRequestException('Обнаружен цикл в дереве подкатегорий');
        const node: { id: string; parentId: string | null; type: SubcategoryType } | null =
          await this.prisma.subcategory.findUnique({
          where: { id: cursor },
          select: { id: true, parentId: true, type: true },
          });
        if (!node) throw new BadRequestException('Родительская подкатегория не найдена');
        if (cursor === nextParentId) {
          this.subcategoryPolicy.assertDepth(Boolean(node.parentId));
          this.subcategoryPolicy.assertParentTypeCompatibility(nextType, node.type);
        }
        cursor = node.parentId;
      }
    }

    return this.prisma.subcategory.update({
      where: { id },
      data: {
        ...(dto.slug !== undefined ? { slug: dto.slug.trim().toLowerCase() } : {}),
        ...(dto.nameRu !== undefined ? { nameRu: dto.nameRu.trim() } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.isLandingEnabled !== undefined ? { isLandingEnabled: dto.isLandingEnabled } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
  }

  @Patch(':id/activation')
  @Roles('ADMIN', 'EDITOR')
  async setActivation(@Param('id') id: string, @Body() dto: ActivationDto) {
    const exists = await this.prisma.subcategory.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('Подкатегория не найдена');
    return this.prisma.subcategory.update({ where: { id }, data: { isActive: dto.isActive } });
  }

  private resolveTypes(type?: string, forEntity?: string): SubcategoryType[] {
    if (type) {
      const value = type.toUpperCase();
      if (value === SubcategoryType.UNIVERSAL) return [SubcategoryType.UNIVERSAL];
      if (value === SubcategoryType.EVENT_ONLY) return [SubcategoryType.EVENT_ONLY];
      if (value === SubcategoryType.VENUE_ONLY) return [SubcategoryType.VENUE_ONLY];
      return [];
    }

    const entity = forEntity?.toLowerCase();
    if (entity === 'event') {
      return [SubcategoryType.UNIVERSAL, SubcategoryType.EVENT_ONLY];
    }
    if (entity === 'venue') {
      return [SubcategoryType.UNIVERSAL, SubcategoryType.VENUE_ONLY];
    }
    return [];
  }
}
