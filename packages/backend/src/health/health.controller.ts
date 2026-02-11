import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check — проверка работоспособности сервисов' })
  async check() {
    const result: Record<string, boolean | string> = { status: 'ok' };

    // PostgreSQL
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      result.db = true;
    } catch {
      result.db = false;
      result.status = 'degraded';
    }

    // Redis
    result.redis = this.cache.isConnected();
    if (!result.redis) {
      result.status = result.status === 'ok' ? 'degraded' : result.status;
    }

    return result;
  }
}
