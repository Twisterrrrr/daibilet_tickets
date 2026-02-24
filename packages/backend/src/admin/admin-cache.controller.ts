import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IdempotencyScope } from '@prisma/client';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { CacheInvalidationService } from '../cache/cache-invalidation.service';
import { IdempotencyService } from '../common/idempotency.service';
import { AuditService } from './audit.service';

type CacheScope = 'EVENT' | 'VENUE' | 'LANDING' | 'CITY' | 'GLOBAL';

interface InvalidateCacheDto {
  scope: CacheScope;
  ids?: string[];
  paths?: string[];
  reason?: string;
  idempotencyKey: string;
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/cache')
export class AdminCacheController {
  constructor(
    private readonly cacheInvalidation: CacheInvalidationService,
    private readonly idempotency: IdempotencyService,
    private readonly audit: AuditService,
  ) {}

  @Post('invalidate')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Инвалидация кэша (используется из Directus Ops)' })
  async invalidate(
    @Body() body: InvalidateCacheDto,
    @Req() req: { user?: { id?: string } & Record<string, unknown>; requestId?: string },
  ) {
    const { scope, ids } = body;
    const userId = req.user?.id as string | undefined;
    const requestId = req.requestId;
    const key =
      body.idempotencyKey && body.idempotencyKey.trim().length > 0
        ? body.idempotencyKey
        : `cache-invalidate:${scope}:${(ids || []).join(',')}`;

    return this.idempotency.run(
      IdempotencyScope.EXTERNAL_CALLBACK,
      key,
      async () => {
        switch (scope) {
          case 'EVENT':
            if (ids && ids.length > 0) {
              await Promise.all(ids.map((id) => this.cacheInvalidation.invalidateEventById(id)));
            }
            break;
          case 'CITY':
            // ids в этом случае — slug-и городов
            if (ids && ids.length > 0) {
              await Promise.all(ids.map((slug) => this.cacheInvalidation.invalidateCity(slug)));
            }
            break;
          case 'GLOBAL':
            await this.cacheInvalidation.invalidateFull();
            break;
          case 'VENUE':
          case 'LANDING':
          default:
            // Пока не реализовано: оставляем no-op, но контракт один.
            break;
        }

        const payload = {
          ok: true,
          actionId: `invalidate-${scope}-${Date.now()}`,
          invalidated: {
            cacheKeys: null as string[] | null,
            paths: body.paths?.length || 0,
          },
        };

        if (userId) {
          await this.audit.log(
            userId,
            'UPDATE',
            'CacheInvalidate',
            scope,
            { ids: body.ids, paths: body.paths, reason: body.reason },
            payload,
          );
        }

        return payload;
      },
      {
        entityId: undefined,
        requestId,
        meta: {
          type: 'CACHE_INVALIDATE',
          scope,
          ids: body.ids,
          paths: body.paths,
          reason: body.reason,
        },
      },
    );
  }
}

