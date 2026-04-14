import { Body, Controller, Get, Patch, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminRole, Prisma } from '@/prisma-client';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AuditInterceptor } from './audit.interceptor';
import { PatchSeoSettingsDto, PatchSystemSettingsDto, SeoSettingsValueDto, SystemSettingsValueDto } from './dto/admin-app-setting.dto';

const KEY_SEO = 'seo';
const KEY_SYSTEM = 'system';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/settings/app')
export class AdminAppSettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('seo')
  @Roles(AdminRole.ADMIN, AdminRole.OWNER, AdminRole.EDITOR, AdminRole.VIEWER)
  async getSeo() {
    const row = await this.prisma.appSetting.findUnique({ where: { key: KEY_SEO } });
    return { key: KEY_SEO, value: (row?.value as SeoSettingsValueDto | undefined) ?? {}, updatedAt: row?.updatedAt ?? null };
  }

  @Patch('seo')
  @Roles(AdminRole.ADMIN, AdminRole.OWNER)
  async patchSeo(@Body() body: PatchSeoSettingsDto) {
    const existing = await this.prisma.appSetting.findUnique({ where: { key: KEY_SEO } });
    const prev = (existing?.value as Record<string, unknown>) ?? {};
    const patch = { ...((body.value as Record<string, unknown> | undefined) ?? {}) };
    delete patch.baseUrl;
    delete patch.publicBaseUrl;
    const next = { ...prev, ...patch } as Prisma.InputJsonValue;
    const row = await this.prisma.appSetting.upsert({
      where: { key: KEY_SEO },
      create: { key: KEY_SEO, value: next },
      update: { value: next },
    });
    return { key: KEY_SEO, value: row.value as SeoSettingsValueDto, updatedAt: row.updatedAt };
  }

  @Get('system')
  @Roles(AdminRole.ADMIN, AdminRole.OWNER, AdminRole.EDITOR, AdminRole.VIEWER)
  async getSystem() {
    const row = await this.prisma.appSetting.findUnique({ where: { key: KEY_SYSTEM } });
    return {
      key: KEY_SYSTEM,
      value: (row?.value as SystemSettingsValueDto | undefined) ?? {},
      updatedAt: row?.updatedAt ?? null,
    };
  }

  @Patch('system')
  @Roles(AdminRole.ADMIN, AdminRole.OWNER)
  async patchSystem(@Body() body: PatchSystemSettingsDto) {
    const existing = await this.prisma.appSetting.findUnique({ where: { key: KEY_SYSTEM } });
    const prev = (existing?.value as Record<string, unknown>) ?? {};
    const patch = { ...((body.value as Record<string, unknown> | undefined) ?? {}) };
    const next = { ...prev, ...patch } as Prisma.InputJsonValue;
    const row = await this.prisma.appSetting.upsert({
      where: { key: KEY_SYSTEM },
      create: { key: KEY_SYSTEM, value: next },
      update: { value: next },
    });
    return { key: KEY_SYSTEM, value: row.value as SystemSettingsValueDto, updatedAt: row.updatedAt };
  }
}
