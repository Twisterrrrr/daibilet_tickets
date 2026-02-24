import {
  Body,
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

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { buildPaginatedResult, paginationArgs, parsePagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { AuditInterceptor } from './audit.interceptor';
import { CreateExternalWidgetDto, UpdateExternalWidgetDto } from './dto/admin.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/widgets')
export class AdminWidgetsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('providers')
  async listProviders() {
    return this.prisma.externalWidgetProvider.findMany({
      orderBy: { kind: 'asc' },
    });
  }

  @Get()
  async list(
    @Query('providerId') providerId?: string,
    @Query('search') search?: string,
    @Query('cursor') cursor?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const where: Record<string, unknown> = {};
    if (providerId) where.providerId = providerId;
    if (search) {
      where.OR = [
        { externalId: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
      ];
    }

    const pg = parsePagination({ cursor, page, limit });
    const [rawItems, total] = await Promise.all([
      this.prisma.externalWidget.findMany({
        where,
        include: { provider: true },
        orderBy: { updatedAt: 'desc' },
        ...paginationArgs(pg),
      }),
      this.prisma.externalWidget.count({ where }),
    ]);
    return buildPaginatedResult(rawItems, total, pg.limit);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.prisma.externalWidget.findUniqueOrThrow({
      where: { id },
      include: { provider: true },
    });
  }

  @Post()
  @Roles('ADMIN', 'EDITOR')
  async create(@Body() data: CreateExternalWidgetDto) {
    return this.prisma.externalWidget.create({
      data: {
        providerId: data.providerId,
        externalId: data.externalId,
        title: data.title ?? null,
        url: data.url ?? null,
        isActive: data.isActive ?? true,
      },
      include: { provider: true },
    });
  }

  @Patch(':id')
  @Roles('ADMIN', 'EDITOR')
  async update(@Param('id') id: string, @Body() data: UpdateExternalWidgetDto) {
    return this.prisma.externalWidget.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.url !== undefined && { url: data.url }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: { provider: true },
    });
  }

  @Delete(':id')
  @Roles('ADMIN')
  async delete(@Param('id') id: string) {
    await this.prisma.externalWidget.delete({ where: { id } });
    return { success: true };
  }
}
