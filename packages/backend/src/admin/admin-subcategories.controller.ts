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
import { EventCategory, SubcategoryLandingMode, SubcategoryLayer, SubcategoryType } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { SubcategoryPolicyService } from '../subcategories/subcategory-policy.service';
import {
  EVENT_PRIMARY_CODES_BY_CATEGORY,
  VENUE_PRIMARY_CODES,
} from '../subcategories/subcategory-assignment.constants';

class UpsertSubcategoryDto {
  @IsString()
  slug!: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsString()
  nameRu!: string;

  @IsEnum(SubcategoryType)
  type!: SubcategoryType;

  @IsOptional()
  @IsEnum(SubcategoryLayer)
  layer?: SubcategoryLayer;

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
  @IsEnum(SubcategoryLandingMode)
  landingMode?: SubcategoryLandingMode;

  @IsOptional()
  @IsString()
  landingTopicKey?: string | null;

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
    @Query('entity') entity?: string,
    @Query('layer') layer?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const includeInactiveBool = includeInactive === '1' || includeInactive === 'true';
    const entityNorm = (entity ?? forEntity)?.toLowerCase();
    const layerNorm = layer?.toUpperCase();

    const baseWhere = includeInactiveBool ? {} : { isActive: true };

    // Canonical PRIMARY list for Events: return all active EVENT_ONLY PRIMARY regardless of legacy EventCategory enum.
    // This is used by Admin V3 for "Подкатегория" filters and editors.
    if (layerNorm === 'PRIMARY' && entityNorm === 'event' && !type) {
      return this.prisma.subcategory.findMany({
        where: {
          ...baseWhere,
          layer: SubcategoryLayer.PRIMARY,
          type: SubcategoryType.EVENT_ONLY,
        },
        include: {
          parent: { select: { id: true, slug: true, nameRu: true } },
        },
        orderBy: [{ sortOrder: 'asc' }, { nameRu: 'asc' }],
      });
    }

    if (layerNorm === 'PRIMARY' && entityNorm === 'event' && type) {
      const cat = type.toUpperCase() as EventCategory;
      const codes = EVENT_PRIMARY_CODES_BY_CATEGORY[cat];
      if (!codes) {
        throw new BadRequestException(`Неизвестная категория события для type=${type}`);
      }
      return this.prisma.subcategory.findMany({
        where: {
          ...baseWhere,
          layer: SubcategoryLayer.PRIMARY,
          type: SubcategoryType.EVENT_ONLY,
          code: { in: [...codes] },
        },
        include: {
          parent: { select: { id: true, slug: true, nameRu: true } },
        },
        orderBy: [{ sortOrder: 'asc' }, { nameRu: 'asc' }],
      });
    }

    if (layerNorm === 'PRIMARY' && entityNorm === 'venue') {
      return this.prisma.subcategory.findMany({
        where: {
          ...baseWhere,
          layer: SubcategoryLayer.PRIMARY,
          type: SubcategoryType.VENUE_ONLY,
          code: { in: [...VENUE_PRIMARY_CODES] },
        },
        include: {
          parent: { select: { id: true, slug: true, nameRu: true } },
        },
        orderBy: [{ sortOrder: 'asc' }, { nameRu: 'asc' }],
      });
    }

    if (layerNorm === 'SECONDARY' && entityNorm === 'event') {
      return this.prisma.subcategory.findMany({
        where: {
          ...baseWhere,
          layer: SubcategoryLayer.SECONDARY,
          type: { in: [SubcategoryType.UNIVERSAL, SubcategoryType.EVENT_ONLY] },
        },
        include: {
          parent: { select: { id: true, slug: true, nameRu: true } },
        },
        orderBy: [{ sortOrder: 'asc' }, { nameRu: 'asc' }],
      });
    }

    if (layerNorm === 'SECONDARY' && entityNorm === 'venue') {
      return this.prisma.subcategory.findMany({
        where: {
          ...baseWhere,
          layer: SubcategoryLayer.SECONDARY,
          type: { in: [SubcategoryType.UNIVERSAL, SubcategoryType.VENUE_ONLY] },
        },
        include: {
          parent: { select: { id: true, slug: true, nameRu: true } },
        },
        orderBy: [{ sortOrder: 'asc' }, { nameRu: 'asc' }],
      });
    }

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
    if (!dto.code?.trim()) {
      throw new BadRequestException('Поле code обязательно при создании подкатегории');
    }
    const parent = dto.parentId
      ? await this.prisma.subcategory.findUnique({ where: { id: dto.parentId }, select: { id: true, parentId: true, type: true } })
      : null;
    if (dto.parentId && !parent) throw new BadRequestException('Родительская подкатегория не найдена');
    if (parent) {
      this.subcategoryPolicy.assertDepth(Boolean(parent.parentId));
      this.subcategoryPolicy.assertParentTypeCompatibility(dto.type, parent.type);
    }
    const code = dto.code.trim().toUpperCase();
    const isLandingEnabled = dto.isLandingEnabled ?? true;
    const landingMode =
      dto.landingMode ??
      (isLandingEnabled ? SubcategoryLandingMode.AUTO : SubcategoryLandingMode.DISABLED);
    return this.prisma.subcategory.create({
      data: {
        slug: dto.slug.trim().toLowerCase(),
        code,
        nameRu: dto.nameRu.trim(),
        type: dto.type,
        layer: dto.layer ?? SubcategoryLayer.SECONDARY,
        parentId: dto.parentId ?? null,
        isActive: dto.isActive ?? true,
        isLandingEnabled,
        landingMode,
        landingTopicKey: dto.landingTopicKey?.trim() || null,
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
        ...(dto.code !== undefined ? { code: dto.code.trim().toUpperCase() } : {}),
        ...(dto.nameRu !== undefined ? { nameRu: dto.nameRu.trim() } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.layer !== undefined ? { layer: dto.layer } : {}),
        ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.isLandingEnabled !== undefined ? { isLandingEnabled: dto.isLandingEnabled } : {}),
        ...(dto.landingMode !== undefined ? { landingMode: dto.landingMode } : {}),
        ...(dto.landingTopicKey !== undefined
          ? { landingTopicKey: dto.landingTopicKey?.trim() || null }
          : {}),
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
