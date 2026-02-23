import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PrismaService } from '../../prisma/prisma.service';
import type { SupplierAuthUser } from '../decorators/current-supplier-user.decorator';

/** Единая точка проверки: target должен принадлежать supplierOperatorId */
export function assertOperatorScope(
  targetOperatorId: string | null | undefined,
  supplierOperatorId: string,
): void {
  if (targetOperatorId == null) {
    throw new ForbiddenException('FORBIDDEN_OPERATOR_SCOPE');
  }
  if (targetOperatorId !== supplierOperatorId) {
    throw new ForbiddenException('FORBIDDEN_OPERATOR_SCOPE');
  }
}

export const OPERATOR_SCOPE_KEY = 'operator_scope';

export type OperatorScopeEntity = 'Event' | 'Venue' | 'EventOffer';

export interface OperatorScopeMeta {
  entity: OperatorScopeEntity;
  paramKey: string; // e.g. 'id', 'eventId' (для Event), 'offerId' (для EventOffer)
}

export const OperatorScope = (entity: OperatorScopeEntity, paramKey = 'id') =>
  SetMetadata(OPERATOR_SCOPE_KEY, { entity, paramKey } satisfies OperatorScopeMeta);

@Injectable()
export class OperatorScopeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.getAllAndOverride<OperatorScopeMeta | undefined>(OPERATOR_SCOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!meta) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as SupplierAuthUser | undefined;
    if (!user || user.type !== 'supplier') return true;

    const paramValue = request.params[meta.paramKey];
    if (!paramValue) return true;

    let targetOperatorId: string | null = null;

    switch (meta.entity) {
      case 'Event': {
        const event = await this.prisma.event.findUnique({
          where: { id: paramValue },
          select: { operatorId: true },
        });
        targetOperatorId = event?.operatorId ?? null;
        break;
      }
      case 'Venue': {
        const venue = await this.prisma.venue.findUnique({
          where: { id: paramValue },
          select: { operatorId: true },
        });
        targetOperatorId = venue?.operatorId ?? null;
        break;
      }
      case 'EventOffer': {
        const offer = await this.prisma.eventOffer.findUnique({
          where: { id: paramValue },
          select: { operatorId: true },
        });
        targetOperatorId = offer?.operatorId ?? null;
        break;
      }
    }

    assertOperatorScope(targetOperatorId, user.operatorId);
    return true;
  }
}
