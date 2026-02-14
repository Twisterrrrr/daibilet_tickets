import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, UseInterceptors, ConflictException, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AuditInterceptor } from './audit.interceptor';
import { CreateTagDto, UpdateTagDto } from './dto/admin-tag.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/tags')
export class AdminTagsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
  ) {
    const where: any = { isDeleted: false };
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const take = Math.min(Number(limit) || 200, 200);
    return this.prisma.tag.findMany({
      where,
      include: { _count: { select: { events: true } } },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      take,
      skip: Number(skip) || 0,
    });
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
    return this.prisma.tag.create({ data });
  }

  @Patch(':id')
  @Roles('ADMIN', 'EDITOR')
  async update(@Param('id') id: string, @Body() data: UpdateTagDto) {
    const { id: _, createdAt, updatedAt, events, articleTags, _count, version, ...clean } = data as any;

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
