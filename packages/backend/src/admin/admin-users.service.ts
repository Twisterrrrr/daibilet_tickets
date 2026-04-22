import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { AdminRole } from '@/prisma-client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  static isLockoutProtectedRole(role: AdminRole): boolean {
    return role === AdminRole.ADMIN || role === AdminRole.OWNER;
  }

  /**
   * Нельзя деактивировать или понизить последнего активного ADMIN/OWNER.
   */
  async assertPatchDoesNotLockOut(
    id: string,
    patch: { role?: AdminRole; isActive?: boolean },
  ): Promise<void> {
    const user = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Пользователь не найден');

    const newActive = patch.isActive !== undefined ? patch.isActive : user.isActive;
    const newRole = patch.role !== undefined ? patch.role : user.role;
    const newSelfPrivileged = newActive && AdminUsersService.isLockoutProtectedRole(newRole);

    if (newSelfPrivileged) return;

    const others = await this.prisma.adminUser.count({
      where: {
        id: { not: id },
        isActive: true,
        role: { in: [AdminRole.ADMIN, AdminRole.OWNER] },
      },
    });

    const wasSelfPrivileged = user.isActive && AdminUsersService.isLockoutProtectedRole(user.role);
    if (wasSelfPrivileged && others === 0) {
      throw new ForbiddenException(
        'Нельзя оставить систему без активного пользователя с ролью ADMIN или OWNER.',
      );
    }
  }
}
