import { Body, Controller, Get, Param, Patch, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AuditInterceptor } from './audit.interceptor';

class UpdateFeatureFlagDto {
  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/feature-flags')
export class AdminFeatureFlagsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async list() {
    const flags = await this.prisma.featureFlag.findMany({
      where: { scope: 'global', scopeValue: null },
      select: { key: true, enabled: true, description: true, updatedAt: true },
      orderBy: { key: 'asc' },
    });
    return { items: flags };
  }

  @Patch(':key')
  @Roles('ADMIN')
  async update(@Param('key') key: string, @Body() body: UpdateFeatureFlagDto) {
    const existing = await this.prisma.featureFlag.findFirst({
      where: { key, scope: 'global', scopeValue: null },
      select: { id: true },
    });

    const row = existing
      ? await this.prisma.featureFlag.update({
          where: { id: existing.id },
          data: { enabled: body.enabled, description: body.description ?? undefined },
          select: { key: true, enabled: true, description: true, updatedAt: true },
        })
      : await this.prisma.featureFlag.create({
          data: {
            key,
            scope: 'global',
            scopeValue: null,
            enabled: body.enabled,
            description: body.description ?? null,
          },
          select: { key: true, enabled: true, description: true, updatedAt: true },
        });

    return row;
  }
}

