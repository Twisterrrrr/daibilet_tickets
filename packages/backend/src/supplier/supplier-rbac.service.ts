import { ForbiddenException, Injectable } from '@nestjs/common';
import { SupplierRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

/**
 * Supplier RBAC v1 — минимальная обёртка над SupplierUser.
 *
 * Важно: роль — это свойство membership (SupplierUser), а не глобального User.
 * Один и тот же пользователь может иметь разные роли в разных операторах.
 */
@Injectable()
export class SupplierRbacService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Найти membership для пары (userId, operatorId).
   * Возвращает SupplierUser или null.
   */
  async getSupplierMembership(userId: string, operatorId: string) {
    if (!userId || !operatorId) return null;
    return this.prisma.supplierUser.findFirst({
      where: { id: userId, operatorId, isActive: true },
    });
  }

  /**
   * Проверить, что у пользователя есть одна из допустимых ролей в рамках оператора.
   * OWNER / MANAGER / CONTENT / ACCOUNTANT:
   * - CONTENT ≈ EDITOR
   * - ACCOUNTANT ≈ VIEWER (read-only / финансы)
   */
  async hasSupplierRole(
    userId: string,
    operatorId: string,
    allowedRoles: SupplierRole[],
  ): Promise<boolean> {
    const membership = await this.getSupplierMembership(userId, operatorId);
    if (!membership) return false;
    if (!allowedRoles || allowedRoles.length === 0) return true;
    return allowedRoles.includes(membership.role);
  }

  /**
   * Гарантировать, что у пользователя есть допустимая роль.
   * При отсутствии membership или неподходящей роли — ForbiddenException.
   */
  async requireSupplierRole(
    userId: string,
    operatorId: string,
    allowedRoles: SupplierRole[],
  ): Promise<void> {
    const ok = await this.hasSupplierRole(userId, operatorId, allowedRoles);
    if (!ok) {
      throw new ForbiddenException('FORBIDDEN_INSUFFICIENT_ROLE');
    }
  }
}

