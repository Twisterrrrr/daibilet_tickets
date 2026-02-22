import { Controller, Get, Header } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { PrismaService } from '../prisma/prisma.service';

export interface FeatureFlagDto {
  enabled: boolean;
  rules?: Record<string, unknown>;
}

@ApiTags('public')
@Controller('public/feature-flags')
export class PublicFeatureFlagsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Публичный список feature flags (для фронтенда)' })
  @Header('Cache-Control', 'public, max-age=60')
  async list(): Promise<Record<string, FeatureFlagDto>> {
    const flags = await this.prisma.featureFlag.findMany({
      where: {},
      select: { key: true, scope: true, scopeValue: true, enabled: true, metadata: true },
    });

    const map: Record<string, FeatureFlagDto> = {};
    for (const f of flags) {
      const rules = {
        scope: f.scope,
        scopeValue: f.scopeValue,
        ...(f.metadata as Record<string, unknown>),
      };
      const existing = map[f.key];
      if (!existing) {
        map[f.key] = { enabled: f.enabled, rules };
      } else {
        // Merge: if any variant is enabled, consider enabled
        if (f.enabled) map[f.key] = { ...existing, enabled: true };
      }
    }
    return map;
  }
}
