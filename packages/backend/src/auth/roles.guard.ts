import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminRole } from '@/prisma-client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: AdminRole[]) => SetMetadata(ROLES_KEY, roles);

/** Иерархия: OWNER ≥ ADMIN ≥ EDITOR ≥ VIEWER (доступ, если rank(user) ≥ rank(required) для любого required). */
const ROLE_RANK: Record<AdminRole, number> = {
  [AdminRole.VIEWER]: 1,
  [AdminRole.EDITOR]: 2,
  [AdminRole.ADMIN]: 3,
  [AdminRole.OWNER]: 4,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AdminRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Если ролей не задано — доступ открыт (для аутентифицированных)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.role) return false;

    const ur = ROLE_RANK[user.role as AdminRole];
    if (ur === undefined) return false;

    return requiredRoles.some((required) => ur >= ROLE_RANK[required]);
  }
}
