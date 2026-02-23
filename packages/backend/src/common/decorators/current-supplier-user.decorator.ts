import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { SupplierRole } from '@prisma/client';

/** Тип пользователя-поставщика (req.user после SupplierJwtGuard) */
export interface SupplierAuthUser {
  id: string;
  email: string;
  name: string | null;
  role: SupplierRole;
  operatorId: string;
  operatorName: string;
  trustLevel: number | null;
  type: 'supplier';
}

/**
 * Декоратор для получения текущего SupplierUser из request.
 * Использовать только на эндпоинтах, защищённых SupplierJwtGuard.
 */
export const CurrentSupplierUser = createParamDecorator(
  (data: keyof SupplierAuthUser | undefined, ctx: ExecutionContext): SupplierAuthUser | unknown => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as SupplierAuthUser;
    return data ? user?.[data] : user;
  },
);
