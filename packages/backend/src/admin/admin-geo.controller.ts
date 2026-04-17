import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';

class GeoListQueryDto {
  @IsOptional()
  @IsUUID()
  cityId?: string;

  @IsOptional()
  @IsString()
  q?: string;
}

class CreateDistrictDto {
  @IsUUID()
  cityId!: string;

  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

class UpdateDistrictDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string | null;
}

class CreateMetroStationDto {
  @IsUUID()
  cityId!: string;

  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsOptional()
  @IsString()
  lineName?: string | null;

  @IsOptional()
  @IsString()
  lineColor?: string | null;
}

class UpdateMetroStationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  lineName?: string | null;

  @IsOptional()
  @IsString()
  lineColor?: string | null;
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/geo')
export class AdminGeoController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('districts')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async listDistricts(@Query() q: GeoListQueryDto) {
    const where = {
      ...(q.cityId ? { cityId: q.cityId } : {}),
      ...(q.q?.trim()
        ? {
            OR: [
              { name: { contains: q.q.trim(), mode: 'insensitive' as const } },
              { slug: { contains: q.q.trim(), mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const items = await this.prisma.district.findMany({
      where,
      orderBy: [{ name: 'asc' }],
      take: 500,
      select: { id: true, cityId: true, name: true, slug: true, description: true, updatedAt: true },
    });
    return { items };
  }

  @Post('districts')
  @Roles('ADMIN', 'EDITOR')
  async createDistrict(@Body() body: CreateDistrictDto) {
    if (!body.name?.trim() || !body.slug?.trim()) throw new BadRequestException('name, slug required');
    return this.prisma.district.create({
      data: {
        cityId: body.cityId,
        name: body.name.trim(),
        slug: body.slug.trim(),
        description: body.description?.trim() ? body.description.trim() : null,
      },
    });
  }

  @Patch('districts/:id')
  @Roles('ADMIN', 'EDITOR')
  async updateDistrict(@Param('id') id: string, @Body() body: UpdateDistrictDto) {
    const existing = await this.prisma.district.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('District not found');
    return this.prisma.district.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name?.trim() || '' }),
        ...(body.slug !== undefined && { slug: body.slug?.trim() || '' }),
        ...(body.description !== undefined && { description: body.description?.trim() ? body.description.trim() : null }),
      },
    });
  }

  @Delete('districts/:id')
  @Roles('ADMIN')
  async deleteDistrict(@Param('id') id: string) {
    const existing = await this.prisma.district.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('District not found');
    await this.prisma.district.delete({ where: { id } });
    return { success: true };
  }

  @Get('metro-stations')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async listMetroStations(@Query() q: GeoListQueryDto) {
    const where = {
      ...(q.cityId ? { cityId: q.cityId } : {}),
      ...(q.q?.trim()
        ? {
            OR: [
              { name: { contains: q.q.trim(), mode: 'insensitive' as const } },
              { slug: { contains: q.q.trim(), mode: 'insensitive' as const } },
              { lineName: { contains: q.q.trim(), mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const items = await this.prisma.metroStation.findMany({
      where,
      orderBy: [{ name: 'asc' }],
      take: 1000,
      select: {
        id: true,
        cityId: true,
        name: true,
        slug: true,
        lineName: true,
        lineColor: true,
        updatedAt: true,
      },
    });
    return { items };
  }

  @Post('metro-stations')
  @Roles('ADMIN', 'EDITOR')
  async createMetroStation(@Body() body: CreateMetroStationDto) {
    if (!body.name?.trim() || !body.slug?.trim()) throw new BadRequestException('name, slug required');
    return this.prisma.metroStation.create({
      data: {
        cityId: body.cityId,
        name: body.name.trim(),
        slug: body.slug.trim(),
        lineName: body.lineName?.trim() ? body.lineName.trim() : null,
        lineColor: body.lineColor?.trim() ? body.lineColor.trim() : null,
      },
    });
  }

  @Patch('metro-stations/:id')
  @Roles('ADMIN', 'EDITOR')
  async updateMetroStation(@Param('id') id: string, @Body() body: UpdateMetroStationDto) {
    const existing = await this.prisma.metroStation.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Metro station not found');
    return this.prisma.metroStation.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name?.trim() || '' }),
        ...(body.slug !== undefined && { slug: body.slug?.trim() || '' }),
        ...(body.lineName !== undefined && { lineName: body.lineName?.trim() ? body.lineName.trim() : null }),
        ...(body.lineColor !== undefined && { lineColor: body.lineColor?.trim() ? body.lineColor.trim() : null }),
      },
    });
  }

  @Delete('metro-stations/:id')
  @Roles('ADMIN')
  async deleteMetroStation(@Param('id') id: string) {
    const existing = await this.prisma.metroStation.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Metro station not found');
    await this.prisma.metroStation.delete({ where: { id } });
    return { success: true };
  }
}

