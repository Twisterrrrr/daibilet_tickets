import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';

import { PrismaService } from '../prisma/prisma.service';

/**
 * Guard для Partner B2B API.
 * Аутентификация по API-ключу (Bearer dbl_xxxxx).
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing API key (Authorization: Bearer dbl_xxx...)');
    }

    const rawKey = authHeader.slice(7).trim();
    if (!rawKey.startsWith('dbl_') || rawKey.length < 20) {
      throw new UnauthorizedException('Invalid API key format');
    }

    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await this.prisma.apiKey.findUnique({
      where: { keyHash },
      include: {
        operator: {
          select: { id: true, name: true, isActive: true, isSupplier: true, trustLevel: true },
        },
      },
    });

    if (!apiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (!apiKey.isActive) {
      throw new ForbiddenException('API key is deactivated');
    }

    if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
      throw new ForbiddenException('API key has expired');
    }

    if (!apiKey.operator.isActive) {
      throw new ForbiddenException('Operator account is disabled');
    }

    // IP whitelist check
    if (apiKey.ipWhitelist.length > 0) {
      const clientIp = request.ip || request.connection?.remoteAddress || '';
      if (!apiKey.ipWhitelist.includes(clientIp)) {
        throw new ForbiddenException(`IP ${clientIp} is not whitelisted`);
      }
    }

    // Fire-and-forget: update lastUsedAt
    this.prisma.apiKey
      .update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      })
      .catch((e) => this.logger.error('lastUsedAt update failed: ' + (e as Error).message));

    // Attach partner context to request
    request.user = {
      operatorId: apiKey.operatorId,
      operatorName: apiKey.operator.name,
      apiKeyId: apiKey.id,
      apiKeyName: apiKey.name,
      trustLevel: apiKey.operator.trustLevel,
      type: 'partner' as const,
    };

    return true;
  }
}
