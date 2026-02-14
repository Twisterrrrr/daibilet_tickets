import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, UseInterceptors, ConflictException, BadRequestException, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from './audit.service';
import {
  FaqSchema, FeatureSchema, CuratedEventSchema, IncludesSchema,
  validateJson,
} from './json-schemas';
import { CreateComboDto, UpdateComboDto } from './dto/admin-combo.dto';

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
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
  ) {
    const where: any = { isDeleted: false };
    if (city) where.city = { slug: city };

    const take = Math.min(Number(limit) || 200, 200);
    return this.prisma.comboPage.findMany({
      where,
      include: { city: { select: { slug: true, name: true } } },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      take,
      skip: Number(skip) || 0,
    });
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
    this.validateJsonFields(data);
    return this.prisma.comboPage.create({ data });
  }

  @Patch(':id')
  @Roles('ADMIN', 'EDITOR')
  async update(@Param('id') id: string, @Body() data: UpdateComboDto, @Request() req: any) {
    const { id: _, createdAt, updatedAt, city, version, ...clean } = data as any;

    this.validateJsonFields(clean);

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

  private validateJsonFields(data: any) {
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
