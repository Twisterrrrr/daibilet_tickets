import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { SupplierRole } from '@prisma/client';

/** JWT Guard для поставщиков (стратегия jwt-supplier) */
@Injectable()
export class SupplierJwtGuard extends AuthGuard('jwt-supplier') {}

/** Decorator: требуемые роли поставщика */
export const SUPPLIER_ROLES_KEY = 'supplier_roles';
export const SupplierRoles = (...roles: SupplierRole[]) => SetMetadata(SUPPLIER_ROLES_KEY, roles);

/** Guard: проверка ролей поставщика */
@Injectable()
export class SupplierRolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<SupplierRole[]>(SUPPLIER_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user || user.type !== 'supplier') return false;

    return requiredRoles.includes(user.role);
  }
}
